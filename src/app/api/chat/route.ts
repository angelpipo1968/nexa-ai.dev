import { NextRequest, NextResponse } from 'next/server';
import { getIdentifier } from '@/lib/nexa-core/rate-limiter';
import { logger, generateRequestId } from '@/lib/nexa-core/logger';
import { chatSchema } from '@/lib/validation';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';
import { detectIntent, executeIntent } from '@/lib/nexa-core/tools';

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
    anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-sonnet-4-20250514',
        keyEnv: 'ANTHROPIC_API_KEY'
    }
};

const FALLBACK_ORDER = ['groq', 'gemini', 'openai', 'anthropic'];

// ─── Tool Integration: Detect and execute tools before AI responds ───
async function processTools(userMessage: string): Promise<string | null> {
    const intent = detectIntent(userMessage);
    
    // Only process tool-related intents (not chat/code/web/design/analysis/vision)
    const toolTypes = ['weather', 'search', 'geolocation', 'geocode', 'exchange', 'translate', 'news', 'jokes', 'facts', 'time', 'qrcode', 'countries'];
    if (!toolTypes.includes(intent.type)) return null;
    
    try {
        const result = await executeIntent(intent);
        if (result.success && result.output) {
            return result.output;
        }
    } catch (e: any) {
        logger.warn(`Tool execution failed: ${e.message}`, 'tools');
    }
    return null;
}

function createStream(requestId: string, messages: any[], keys: Record<string, string | undefined>, toolContext?: string) {
    const encoder = new TextEncoder();
    return new ReadableStream({
        async start(controller) {
            let fullResponse = '';
            
            // Inject tool context into the conversation if available
            if (toolContext) {
                const toolMessage = {
                    role: 'system',
                    content: `[DATOS EN TIEMPO REAL - Usa estos datos para responder al usuario]\n\n${toolContext}\n\nResponde al usuario usando estos datos. Sé natural y conversacional.`
                };
                // Insert tool message before the last user message
                const lastUserIdx = messages.map(m => m.role).lastIndexOf('user');
                if (lastUserIdx >= 0) {
                    messages.splice(lastUserIdx, 0, toolMessage);
                } else {
                    messages.push(toolMessage);
                }
            }
            
            for (const providerKey of FALLBACK_ORDER) {
                const config = (PROVIDERS as any)[providerKey];
                const key = keys[config.keyEnv];
                if (!key) continue;
                try {
                    logger.info(`Attempting chat with ${providerKey}`, 'chat', { requestId });
                    
                    if (providerKey === 'anthropic') {
                        // Anthropic API
                        const systemMsg = messages.find(m => m.role === 'system');
                        const nonSystemMsgs = messages.filter(m => m.role !== 'system');
                        const res = await fetch(config.url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
                            body: JSON.stringify({
                                model: config.model,
                                max_tokens: 4096,
                                system: systemMsg?.content || '',
                                messages: nonSystemMsgs.map(m => ({ role: m.role, content: m.content })),
                                stream: true,
                            }),
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
                                            const data = JSON.parse(line.slice(6));
                                            if (data.type === 'content_block_delta' && data.delta?.text) {
                                                fullResponse += data.delta.text;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: data.delta.text, provider: 'anthropic' })}\n\n`));
                                            }
                                        } catch {}
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'anthropic' })}\n\n`));
                            controller.close();
                            return;
                        }
                    } else if (providerKey === 'groq' || providerKey === 'openai') {
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
        
        // Get the last user message for tool detection
        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        let toolContext: string | undefined;
        
        if (lastUserMessage) {
            toolContext = await processTools(lastUserMessage.content) || undefined;
            if (toolContext) {
                logger.info(`Tool context generated for: ${lastUserMessage.content.slice(0, 50)}`, 'tools', { requestId });
            }
        }
        
        if (!messages.find(m => m.role === 'system')) messages.unshift({ role: 'system', content: getSystemPrompt(mode) });
        const keys = { GROQ_API_KEY: process.env.GROQ_API_KEY, GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY, ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY };
        const stream = createStream(requestId, messages, keys, toolContext);
        return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
    } catch (e: any) {
        logger.error(`Chat crash: ${e.message}`, 'chat', { requestId });
        return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: corsHeaders });
    }
}
