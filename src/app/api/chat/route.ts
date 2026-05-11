import { NextRequest, NextResponse } from 'next/server';
import { getIdentifier } from '@/lib/nexa-core/rate-limiter';
import { logger, generateRequestId } from '@/lib/nexa-core/logger';
import { chatSchema } from '@/lib/validation';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';

export const maxDuration = 60;
export const runtime = 'nodejs';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const PROVIDERS = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        keyEnv: 'GROQ_API_KEY'
    },
    gemini: {
        url: (model: string, key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
        model: 'gemini-1.5-flash',
        keyEnv: 'GOOGLE_AI_API_KEY'
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        keyEnv: 'OPENAI_API_KEY'
    },
    deepseek: {
        url: 'https://api.deepseek.com/chat/completions',
        model: 'deepseek-chat',
        keyEnv: 'DEEPSEEK_API_KEY'
    },
    anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20240620',
        keyEnv: 'ANTHROPIC_API_KEY'
    }
};

const FALLBACK_ORDER = ['groq', 'gemini', 'deepseek', 'openai', 'anthropic'];

function createStream(requestId: string, messages: any[], keys: Record<string, string | undefined>) {
    const encoder = new TextEncoder();
    
    return new ReadableStream({
        async start(controller) {
            let fullResponse = '';

            for (const providerKey of FALLBACK_ORDER) {
                const config = (PROVIDERS as any)[providerKey];
                const key = keys[config.keyEnv];
                
                if (!key) continue;

                try {
                    logger.info(`Attempting chat with ${providerKey}`, 'chat', { requestId });
                    
                    if (providerKey === 'groq' || providerKey === 'openai' || providerKey === 'deepseek') {
                        const res = await fetch(config.url, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${key}`,
                            },
                            body: JSON.stringify({
                                model: config.model,
                                messages: messages,
                                stream: true,
                                temperature: 0.7,
                            }),
                        });

                        if (res.ok && res.body) {
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
                                            if (content) {
                                                fullResponse += content;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: providerKey })}\n\n`));
                                            }
                                        } catch (e) { }
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: providerKey })}\n\n`));
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
                                            if (content) {
                                                fullResponse += content;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'gemini' })}\n\n`));
                                            }
                                        } catch (e) { }
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'gemini' })}\n\n`));
                            controller.close();
                            return;
                        }
                    } else if (providerKey === 'anthropic') {
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
                    }
                } catch (e: any) {
                    logger.warn(`Provider ${providerKey} failed: ${e.message}`, 'chat', { requestId });
                }
            }

            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Nexa Core: Todos los proveedores fallaron.' })}\n\n`));
            controller.close();
        }
    });
}

export async function OPTIONS() {
    return new Response(null, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    const requestId = generateRequestId();
    
    try {
        const body = await req.json().catch(() => null);
        if (!body) {
            return NextResponse.json({ error: 'Cuerpo de petición vacío' }, { status: 400, headers: corsHeaders });
        }

        const parsed = chatSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Formato inválido', details: parsed.error.issues }, { status: 400, headers: corsHeaders });
        }

        const { messages, mode = 'default' } = parsed.data;
        const systemPrompt = getSystemPrompt(mode);
        
        if (!messages.find(m => m.role === 'system')) {
            messages.unshift({ role: 'system', content: systemPrompt });
        }

        const keys = {
            GROQ_API_KEY: process.env.GROQ_API_KEY,
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY,
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        };

        const stream = createStream(requestId, messages, keys);
        
        return new Response(stream, {
            headers: {
                ...corsHeaders,
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (e: any) {
        logger.error(`Chat crash: ${e.message}`, 'chat', { requestId });
        return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: corsHeaders });
    }
}
