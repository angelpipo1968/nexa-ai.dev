import { NextRequest, NextResponse } from 'next/server';
import { InputValidator } from '@/lib/security/InputValidator';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';
import { detectIntent } from '@/lib/nexa-core/tools';
import { checkRateLimit, getIdentifier, RATE_LIMITS } from '@/lib/nexa-core/rate-limiter';
import { logger, generateRequestId } from '@/lib/nexa-core/logger';
import { chatSchema } from '@/lib/validation';

export const maxDuration = 60;
export const runtime = 'nodejs';

const PROVIDERS = {
    xiaomi: {
        url: 'https://platform.xiaomimimo.com/v1/chat/completions',
        model: 'MiMo-V2.5-Pro',
        keyEnv: 'VITE_XIAOMI_API_KEY'
    },
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        keyEnv: 'GROQ_API_KEY'
    },
    deepseek: {
        url: 'https://api.deepseek.com/chat/completions',
        model: 'deepseek-chat',
        keyEnv: 'DEEPSEEK_API_KEY'
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        keyEnv: 'OPENAI_API_KEY'
    },
    gemini: {
        url: (model: string, key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
        model: 'gemini-1.5-flash',
        keyEnv: 'GOOGLE_AI_API_KEY'
    },
    anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20240620',
        keyEnv: 'ANTHROPIC_API_KEY'
    },
    ollama: {
        url: 'http://localhost:11434/api/chat',
        model: 'nexa-os:latest'
    }
};

const FALLBACK_ORDER = ['xiaomi', 'groq', 'gemini', 'deepseek', 'openai', 'anthropic', 'ollama'];

function createStream(
    requestId: string, 
    messages: any[], 
    keys: Record<string, string | undefined>,
    intent: any
) {
    const encoder = new TextEncoder();
    const model = intent?.model;
    
    return new ReadableStream({
        async start(controller) {
            let usedProvider = '';
            let fullResponse = '';

            for (const providerKey of FALLBACK_ORDER) {
                const config = (PROVIDERS as any)[providerKey];
                const key = keys[config.keyEnv];
                
                if (providerKey !== 'ollama' && !key) {
                    logger.debug(`Skipping ${providerKey} - Missing API Key`, 'chat', { requestId });
                    continue;
                }

                try {
                    logger.info(`Attempting chat with ${providerKey}`, 'chat', { requestId, model: model || config.model });
                    
                    if (providerKey === 'groq') {
                        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${key}`,
                            },
                            body: JSON.stringify({
                                model: model || 'llama-3.3-70b-versatile',
                                messages: messages,
                                stream: true,
                                temperature: 0.7,
                            }),
                        });

                        if (res.ok && res.body) {
                            usedProvider = 'groq';
                            const reader = res.body.getReader();
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
                                            const content = data.choices?.[0]?.delta?.content || '';
                                            fullResponse += content;
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'groq' })}\n\n`));
                                        } catch (e) { }
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'groq' })}\n\n`));
                            controller.close();
                            return;
                        }
                    } else if (providerKey === 'gemini') {
                        const geminiMessages = messages
                            .filter(m => m.role !== 'system')
                            .map(m => ({
                                role: m.role === 'assistant' ? 'model' : 'user',
                                parts: [{ text: m.content }]
                            }));
                        const systemMsg = messages.find(m => m.role === 'system');

                        const response = await fetch(config.url(config.model, key), {
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
                                            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                            fullResponse += content;
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'gemini' })}\n\n`));
                                        } catch (e) { }
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'gemini' })}\n\n`));
                            controller.close();
                            return;
                        }
                    } else if (providerKey === 'anthropic') {
                        // Anthropic doesn't support easy SSE streaming without their SDK or more complex parsing
                        // For now, let's do a non-streaming fallback for Anthropic if others fail
                        const response = await fetch(config.url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'x-api-key': key,
                                'anthropic-version': '2023-06-01'
                            },
                            body: JSON.stringify({
                                model: config.model,
                                messages: messages.filter(m => m.role !== 'system'),
                                system: messages.find(m => m.role === 'system')?.content,
                                max_tokens: 4096,
                                temperature: 0.7
                            }),
                        });

                        if (response.ok) {
                            const data = await response.json();
                            const content = data.content?.[0]?.text || '';
                            fullResponse = content;
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'anthropic' })}\n\n`));
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'anthropic' })}\n\n`));
                            controller.close();
                            return;
                        }
                    } else if (providerKey === 'ollama') {
                        const response = await fetch(config.url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: config.model,
                                messages,
                                stream: true
                            }),
                        });

                        if (response.ok && response.body) {
                            const reader = response.body.getReader();
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                const chunk = new TextDecoder().decode(value);
                                try {
                                    const data = JSON.parse(chunk);
                                    const content = data.message?.content || '';
                                    fullResponse += content;
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'ollama' })}\n\n`));
                                } catch (e) { }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'ollama' })}\n\n`));
                            controller.close();
                            return;
                        } else {
                            const errorText = await response.text().catch(() => 'No error text');
                            console.error(`Chat API: Ollama returned ${response.status}: ${errorText}`);
                        }
                    } else {
                        // OpenAI Compatible (Groq, DeepSeek, OpenAI)
                        const response = await fetch(config.url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${key}`,
                            },
                            body: JSON.stringify({
                                model: config.model,
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
                                            const content = data.choices?.[0]?.delta?.content || '';
                                            fullResponse += content;
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: providerKey })}\n\n`));
                                        } catch (e) { }
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: providerKey })}\n\n`));
                            controller.close();
                            return;
                        } else {
                            const errorText = await response.text().catch(() => 'No error text');
                        }
                    }
                } catch (e: any) {
                    logger.warn(`Provider ${providerKey} failed`, 'chat', { requestId, error: e.message });
                }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                error: 'NEXA CORE Error: Todos los proveedores de IA han fallado o no están configurados.',
                details: 'Por favor, verifica las variables de entorno (API Keys) en Vercel/Producción.',
                requestId
            })}\n\n`));
            controller.close();
        }
    });
}

export async function POST(req: NextRequest) {
    const requestId = generateRequestId();
    
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: 'Cuerpo de petición vacío o inválido' }, { status: 400 });
        }

        const parsed = chatSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ 
                error: 'Invalid input format', 
                details: parsed.error.issues,
                code: 'VALIDATION_ERROR'
            }, { status: 400 });
        }

        const { messages, mode = 'default' } = parsed.data;
        
        const identifier = getIdentifier(req);
        const rateLimit = checkRateLimit(identifier, RATE_LIMITS.chat);
        if (!rateLimit.allowed) {
            return NextResponse.json({ error: 'Límite alcanzado' }, { status: 429 });
        }

        const validator = new InputValidator();
        const lastMessage = messages[messages.length - 1]?.content || '';
        const validation = validator.validate(lastMessage);
        
        if (!validation.safe) {
            return NextResponse.json({ error: validation.reason }, { status: 403 });
        }

        const intent = detectIntent(lastMessage);
        const systemPrompt = getSystemPrompt(mode);
        
        if (!messages.find(m => m.role === 'system')) {
            messages.unshift({ role: 'system', content: systemPrompt });
        }

        const keys = {
            GROQ_API_KEY: process.env.GROQ_API_KEY,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            VITE_XIAOMI_API_KEY: process.env.VITE_XIAOMI_API_KEY
        };

        const stream = createStream(requestId, messages, keys, intent);
        
        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (e: any) {
        logger.error(`Chat crash: ${e.message}`, 'chat', { requestId });
        return NextResponse.json({ 
            error: 'Internal Error',
            details: e.message,
            stack: e.stack
        }, { status: 500 });
    }
}
