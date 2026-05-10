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
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        keyEnv: 'GROQ_API_KEY'
    },
    gemini: {
        url: (model: string, key: string) => `https://generativelanguage.googleapis.com/v1/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
        model: 'gemini-1.5-flash',
        keyEnv: 'GOOGLE_AI_API_KEY'
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
};

const FALLBACK_ORDER = ['groq', 'gemini', 'deepseek', 'openai'];

function createStream(
    requestId: string,
    messages: any[],
    keys: Record<string, string | undefined>,
) {
    const encoder = new TextEncoder();

    return new ReadableStream({
        async start(controller) {
            let fullResponse = '';
            const errors: string[] = [];

            for (const providerKey of FALLBACK_ORDER) {
                const config = (PROVIDERS as any)[providerKey];
                const key = keys[config.keyEnv];

                if (!key) {
                    continue;
                }

                try {
                    logger.info(`Trying provider: ${providerKey}`, 'chat', { requestId });

                    if (providerKey === 'gemini') {
                        const systemMsg = messages.find(m => m.role === 'system');
                        const nonSystemMessages = messages.filter(m => m.role !== 'system');
                        const geminiMessages = nonSystemMessages.map(m => ({
                            role: m.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: m.content }]
                        }));
                        // v1 API does not support system_instruction — inject as first user turn
                        if (systemMsg) {
                            geminiMessages.unshift({ role: 'user', parts: [{ text: systemMsg.content }] });
                        }

                        const response = await fetch(config.url(config.model, key), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
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
                                for (const line of chunk.split('\n').filter(l => l.trim())) {
                                    if (line.startsWith('data: ')) {
                                        try {
                                            const data = JSON.parse(line.slice(6));
                                            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                                            fullResponse += content;
                                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                                        } catch {}
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`));
                            controller.close();
                            return;
                        } else {
                            const errText = await response.text().catch(() => '');
                            errors.push(`${providerKey}: ${response.status} - ${errText.slice(0, 200)}`);
                            logger.warn(`${providerKey} failed: ${response.status}`, 'chat', { requestId, error: errText.slice(0, 200) });
                        }
                    } else {
                        // OpenAI-compatible (Groq, DeepSeek, OpenAI)
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
                            const dec = new TextDecoder();
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                const chunk = dec.decode(value, { stream: true });
                                for (const line of chunk.split('\n').filter(l => l.trim())) {
                                    if (line.includes('[DONE]')) continue;
                                    if (line.startsWith('data: ')) {
                                        try {
                                            const data = JSON.parse(line.slice(6));
                                            const content = data.choices?.[0]?.delta?.content || '';
                                            if (content) {
                                                fullResponse += content;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                                            }
                                        } catch {}
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`));
                            controller.close();
                            return;
                        } else {
                            const errText = await response.text().catch(() => '');
                            errors.push(`${providerKey}: ${response.status} - ${errText.slice(0, 200)}`);
                            logger.warn(`${providerKey} failed: ${response.status}`, 'chat', { requestId, error: errText.slice(0, 200) });
                        }
                    }
                } catch (e: any) {
                    errors.push(`${providerKey}: ${e.message}`);
                    logger.warn(`Provider ${providerKey} error`, 'chat', { requestId, error: e.message });
                }
            }

            // All providers failed — send detailed error
            const errorMsg = errors.length > 0
                ? `Error: Todos los proveedores fallaron.\n${errors.join('\n')}`
                : 'Error: No hay API keys configuradas. Añade GROQ_API_KEY en Vercel → Settings → Environment Variables.';

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMsg })}\n\n`));
            controller.close();
        }
    });
}

export async function POST(req: NextRequest) {
    const requestId = generateRequestId();

    try {
        const body = await req.json();
        const parsed = chatSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
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

        const systemPrompt = getSystemPrompt(mode);

        if (!messages.find(m => m.role === 'system')) {
            messages.unshift({ role: 'system', content: systemPrompt });
        }

        const keys: Record<string, string | undefined> = {
            GROQ_API_KEY: process.env.GROQ_API_KEY,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        };

        const stream = createStream(requestId, messages, keys);

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
        }, { status: 500 });
    }
}
