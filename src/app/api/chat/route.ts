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
    }
};

const FALLBACK_ORDER = ['groq', 'gemini', 'openai'];

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
                    if (providerKey === 'groq' || providerKey === 'openai') {
                        const res = await fetch(config.url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                            body: JSON.stringify({ model: config.model, messages, stream: true, temperature: 0.7 }),
                        });
                        if (res.ok && res.body) {
                            const reader = res.body.getReader();
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                const chunk = new TextDecoder().decode(value);
                                for (const line of chunk.split('\n')) {
                                    if (line.startsWith('data: ') && !line.includes('[DONE]')) {
                                        try {
                                            const content = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content || '';
                                            if (content) {
                                                fullResponse += content;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: providerKey })}\n\n`));
                                            }
                                        } catch {}
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: providerKey })}\n\n`));
                            controller.close();
                            return;
                        }
                    } else if (providerKey === 'gemini') {
                        const res = await fetch(config.url(config.model, key), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents: messages.filter(m => m.role !== 'system').map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })) }),
                        });
                        if (res.ok && res.body) {
                            const reader = res.body.getReader();
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;
                                const chunk = new TextDecoder().decode(value);
                                for (const line of chunk.split('\n')) {
                                    if (line.startsWith('data: ')) {
                                        try {
                                            const content = JSON.parse(line.slice(6)).candidates?.[0]?.content?.parts?.[0]?.text || '';
                                            if (content) {
                                                fullResponse += content;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'gemini' })}\n\n`));
                                            }
                                        } catch {}
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'gemini' })}\n\n`));
                            controller.close();
                            return;
                        }
                    }
                } catch (e: any) { logger.warn(`Provider ${providerKey} failed: ${e.message}`, 'chat', { requestId }); }
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Todos los proveedores fallaron.' })}\n\n`));
            controller.close();
        }
    });
}

export async function OPTIONS() { return new Response(null, { headers: corsHeaders }); }

export async function POST(req: NextRequest) {
    const requestId = generateRequestId();
    try {
        const body = await req.json().catch(() => null);
        if (!body) return NextResponse.json({ error: 'Body vacío' }, { status: 400, headers: corsHeaders });
        const parsed = chatSchema.safeParse(body);
        if (!parsed.success) return NextResponse.json({ error: 'Formato inválido' }, { status: 400, headers: corsHeaders });
        const { messages, mode = 'default' } = parsed.data;
        if (!messages.find(m => m.role === 'system')) messages.unshift({ role: 'system', content: getSystemPrompt(mode) });
        const keys = { GROQ_API_KEY: process.env.GROQ_API_KEY, GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
        const stream = createStream(requestId, messages, keys);
        return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
    } catch (e: any) {
        logger.error(`Chat crash: ${e.message}`, 'chat', { requestId });
        return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: corsHeaders });
    }
}
