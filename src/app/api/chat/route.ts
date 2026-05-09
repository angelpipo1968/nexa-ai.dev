import { NextRequest, NextResponse } from 'next/server';
import { InputValidator } from '@/lib/security/InputValidator';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';
import { detectIntent } from '@/lib/nexa-core/tools';
import { checkRateLimit, getIdentifier, RATE_LIMITS } from '@/lib/nexa-core/rate-limiter';
import { logger, generateRequestId } from '@/lib/nexa-core/logger';
import { chatSchema } from '@/lib/validation';

export const maxDuration = 60; // Max duration for Vercel functions

interface ChatRequestBody {
    messages: any[];
    mode?: 'default' | 'vision' | 'code';
}

function createStream(
    requestId: string, 
    messages: any[], 
    googleKey: string | undefined, 
    groqKey: string | undefined, 
    anthropicKey: string | undefined,
    intent: any
) {
    const encoder = new TextEncoder();
    
    return new ReadableStream({
        async start(controller) {
            let fullResponse = '';
            let provider = 'unknown';

            try {
                // --- 1. INTENTO CON GROQ (Principal por velocidad) ---
                if (groqKey) {
                    try {
                        provider = 'groq';
                        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${groqKey}`,
                            },
                            body: JSON.stringify({
                                model: 'llama-3.3-70b-versatile',
                                messages,
                                stream: true,
                                temperature: 0.7,
                                max_tokens: 4096,
                            }),
                        });

                        if (response.ok && response.body) {
                            const reader = response.body.getReader();
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                const chunk = new TextDecoder().decode(value);
                                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                                for (const line of lines) {
                                    if (line.includes('[DONE]')) continue;
                                    if (line.startsWith('data: ')) {
                                        try {
                                            const data = JSON.parse(line.slice(6));
                                            const content = data.choices[0]?.delta?.content || '';
                                            fullResponse += content;
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'groq' })}\n\n`));
                                        } catch (e) { }
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider })}\n\n`));
                            controller.close();
                            return;
                        } else {
                            const errBody = await response.text();
                            logger.warn(`Groq failed (${response.status}): ${errBody}`, 'chat', { requestId });
                        }
                    } catch (e) {
                        logger.error('Groq connection error', 'chat', { requestId, error: e });
                    }
                }

                // --- 2. INTENTO CON GEMINI (Respaldo inteligente) ---
                if (googleKey) {
                    try {
                        provider = 'gemini';
                        const geminiMessages = messages
                            .filter(m => m.role !== 'system')
                            .map(m => ({
                                role: m.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: m.content }]
                            }));

                        const systemMsg = messages.find(m => m.role === 'system');

                        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${googleKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
                                contents: geminiMessages,
                                generationConfig: { temperature: 0.7, maxOutputTokens: 4096 }
                            }),
                        });

                        if (response.ok && response.body) {
                            const reader = response.body.getReader();
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                const chunk = new TextDecoder().decode(value);
                                const lines = chunk.split('\n').filter(line => line.trim() !== '');
                                for (const line of lines) {
                                    if (line.startsWith('data: ')) {
                                        try {
                                            const data = JSON.parse(line.slice(6));
                                            const content = data.candidates[0]?.content?.parts[0]?.text || '';
                                            fullResponse += content;
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'gemini' })}\n\n`));
                                        } catch (e) { }
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider })}\n\n`));
                            controller.close();
                            return;
                        } else {
                            const errBody = await response.text();
                            logger.warn(`Gemini failed (${response.status}): ${errBody}`, 'chat', { requestId });
                        }
                    } catch (e) {
                        logger.error('Gemini connection error', 'chat', { requestId, error: e });
                    }
                }

                controller.error('All AI providers failed');
            } catch (e) {
                controller.error(e);
            }
        }
    });
}

export async function POST(req: NextRequest) {
    const requestId = generateRequestId();
    
    try {
        const body: ChatRequestBody = await req.json();
        const parsed = chatSchema.safeParse(body);
        
        if (!parsed.success) {
            return NextResponse.json({ error: 'Payload inválido', details: parsed.error }, { status: 400 });
        }

        const { messages, mode = 'default' } = parsed.data;
        
        // 1. Rate Limiting
        const identifier = getIdentifier(req);
        const rateLimit = checkRateLimit(identifier, RATE_LIMITS.chat);
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: 'Límite de peticiones alcanzado', retryAfter: rateLimit.retryAfterMs }, { status: 429 });
        }

        // 2. Validación de entrada
        const validator = new InputValidator();
        const lastMessage = messages[messages.length - 1]?.content || '';
        const validation = validator.validate(typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage));
        
        if (!validation.safe) {
            logger.warn(`Blocked request: ${validation.reason}`, 'chat', { requestId, ip: identifier });
            return NextResponse.json({ error: validation.reason }, { status: 403 });
        }

        // 3. Detección de intención y prompt
        const intent = detectIntent(typeof lastMessage === 'string' ? lastMessage : '');
        const systemPrompt = getSystemPrompt(mode);
        
        // Inyectar system prompt si no existe
        if (!messages.find(m => m.role === 'system')) {
            messages.unshift({ role: 'system', content: systemPrompt });
        }

        logger.info(`Chat request: intent=${intent.type}, messages=${messages.length}`, 'chat', { requestId, intent: intent.type });

        const groqKey = process.env.GROQ_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        if (!groqKey && !googleKey && !anthropicKey) {
            logger.error('No AI provider available', 'chat', { requestId });
            return NextResponse.json({ 
                error: 'No hay proveedor de IA configurado. Configura GROQ_API_KEY, GOOGLE_API_KEY o ANTHROPIC_API_KEY.',
                code: 'NO_AI_PROVIDER'
            }, { status: 503 });
        }

        const stream = createStream(requestId, messages, googleKey, groqKey, anthropicKey, intent);
        
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (e: any) {
        logger.error(`Chat crash: ${e.message}`, 'chat', { 
            requestId, 
            stack: e.stack,
            error: e
        });
        return NextResponse.json({ 
            error: 'Error interno del servidor', 
            details: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}
