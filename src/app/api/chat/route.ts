import { NextRequest, NextResponse } from 'next/server';
import { InputValidator } from '@/lib/security/InputValidator';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';
import { detectIntent } from '@/lib/nexa-core/tools';
import { checkRateLimit, getIdentifier, RATE_LIMITS } from '@/lib/nexa-core/rate-limiter';
import { logger, generateRequestId } from '@/lib/nexa-core/logger';
import { chatSchema } from '@/lib/validation';

interface ChatRequestMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

interface ChatRequestBody {
    messages: ChatRequestMessage[];
    mode?: string;
}

export async function POST(req: NextRequest) {
    const requestId = generateRequestId();
    const start = Date.now();

    try {
        // Rate limiting
        const identifier = getIdentifier(req);
        const rateLimit = checkRateLimit(identifier, RATE_LIMITS.chat);
        
        if (!rateLimit.allowed) {
            logger.warn(`Rate limit exceeded for ${identifier}`, 'chat', { requestId });
            return NextResponse.json(
                { 
                    error: 'Demasiadas solicitudes. Espera un momento antes de enviar otro mensaje.',
                    code: 'RATE_LIMITED',
                    retryAfterMs: rateLimit.retryAfterMs,
                },
                { 
                    status: 429,
                    headers: {
                        'Retry-After': String(Math.ceil((rateLimit.retryAfterMs || 60000) / 1000)),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(rateLimit.resetAt),
                    }
                }
            );
        }

        const body: ChatRequestBody = await req.json();
        const parsed = chatSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error.issues },
                { status: 400 }
            );
        }
        const { messages, mode } = parsed.data;

        // Security check
        const validator = new InputValidator();
        const lastMessage = messages[messages.length - 1]?.content || '';
        const validation = validator.validate(typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage));
        
        if (!validation.safe) {
            logger.warn(`Security block: ${validation.reason}`, 'chat', { requestId, identifier });
            return NextResponse.json({ error: `Seguridad NEXA: ${validation.reason}` }, { status: 403 });
        }

        // Detect intent
        const intent = detectIntent(typeof lastMessage === 'string' ? lastMessage : '');
        const systemPrompt = getSystemPrompt(mode || (intent.type === 'code' ? 'code' : 'default'));

        logger.info(`Chat request: intent=${intent.type}, messages=${messages.length}`, 'chat', { requestId, intent: intent.type });

        const groqKey = process.env.GROQ_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m: ChatRequestMessage) => ({ role: m.role, content: m.content }))
        ];

        // ─── Try Groq (Fastest) ───
        if (groqKey) {
            try {
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${groqKey}`,
                    },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: apiMessages,
                        stream: true,
                        temperature: 0.7,
                        max_tokens: 8192,
                    }),
                });

                if (response.ok) {
                    logger.info('Streaming from Groq', 'chat', { requestId });
                    const stream = createStream(response, 'groq');
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                            'X-RateLimit-Remaining': String(rateLimit.remaining),
                        },
                    });
                } else {
                    const errBody = await response.text();
                    logger.warn(`Groq failed (${response.status}): ${errBody}`, 'chat', { requestId });
                }
            } catch (e: unknown) {
                logger.error(`Groq error: ${e.message}`, 'chat', { requestId });
            }
        }

        // ─── Try Gemini ───
        if (googleKey) {
            try {
                const geminiMessages = messages
                    .filter((m: ChatRequestMessage) => m.role !== 'system')
                    .map((m: ChatRequestMessage) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
                    }));

                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${googleKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: systemPrompt }] },
                            contents: geminiMessages,
                            generationConfig: { temperature: 0.7, maxOutputTokens: 8192 }
                        }),
                    }
                );

                if (res.ok) {
                    logger.info('Streaming from Gemini', 'chat', { requestId });
                    const stream = createGeminiStream(res);
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                            'X-RateLimit-Remaining': String(rateLimit.remaining),
                        },
                    });
                } else {
                    const errBody = await res.text();
                    logger.warn(`Gemini failed (${res.status}): ${errBody}`, 'chat', { requestId });
                }
            } catch (e: unknown) {
                logger.error(`Gemini error: ${e.message}`, 'chat', { requestId });
            }
        }

        // ─── Try Anthropic ───
        if (anthropicKey) {
            try {
                const anthropicMessages = messages
                    .filter((m: ChatRequestMessage) => m.role !== 'system')
                    .map((m: ChatRequestMessage) => ({
                        role: m.role,
                        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                    }));

                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': anthropicKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-sonnet-20241022',
                        max_tokens: 8192,
                        system: systemPrompt,
                        messages: anthropicMessages,
                        stream: true,
                    }),
                });

                if (res.ok) {
                    logger.info('Streaming from Anthropic', 'chat', { requestId });
                    const stream = createAnthropicStream(res);
                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                            'X-RateLimit-Remaining': String(rateLimit.remaining),
                        },
                    });
                }
            } catch (e: unknown) {
                logger.error(`Anthropic error: ${e.message}`, 'chat', { requestId });
            }
        }

        logger.error('No AI provider available', 'chat', { requestId });
        return NextResponse.json({ 
            error: 'No hay proveedor de IA configurado. Configura GROQ_API_KEY, GOOGLE_API_KEY o ANTHROPIC_API_KEY.',
            code: 'NO_AI_PROVIDER'
        }, { status: 503 });

    } catch (e: any) {
        logger.error(`Chat crash: ${e.message}`, 'chat', { 
            requestId, 
            stack: e.stack,
            error: e
        });
        return NextResponse.json({ 
            error: 'Error interno del servidor', 
            details: process.env.NODE_ENV === 'development' ? e.message : undefined 
        }, { status: 500 });
    }
}

// ─── Stream helpers ───

function createStream(response: Response, provider: string): ReadableStream {
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        for (const line of chunk.split('\n')) {
                            if (!line.startsWith('data: ')) continue;
                            const data = line.slice(6).trim();
                            if (data === '[DONE]') {
                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider })}\n\n`));
                                break;
                            }
                            try {
                                const parsed = JSON.parse(data);
                                const text = parsed.choices?.[0]?.delta?.content || '';
                                if (text) {
                                    fullResponse += text;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                                }
                            } catch {}
                        }
                    }
                } catch {}
            }
            controller.close();
        },
    });
}

function createGeminiStream(response: Response): ReadableStream {
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        for (const line of chunk.split('\n')) {
                            if (!line.startsWith('data: ')) continue;
                            try {
                                const data = JSON.parse(line.slice(6));
                                const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                if (text) {
                                    fullResponse += text;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                                }
                            } catch {}
                        }
                    }
                } catch {}
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'gemini' })}\n\n`));
            controller.close();
        },
    });
}

function createAnthropicStream(response: Response): ReadableStream {
    return new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = '';

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        const chunk = decoder.decode(value, { stream: true });
                        for (const line of chunk.split('\n')) {
                            if (!line.startsWith('data: ')) continue;
                            try {
                                const data = JSON.parse(line.slice(6));
                                if (data.type === 'content_block_delta') {
                                    const text = data.delta?.text || '';
                                    if (text) {
                                        fullResponse += text;
                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                                    }
                                }
                                if (data.type === 'message_stop') {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'anthropic' })}\n\n`));
                                }
                            } catch {}
                        }
                    }
                } catch {}
            }
            controller.close();
        },
    });
}
