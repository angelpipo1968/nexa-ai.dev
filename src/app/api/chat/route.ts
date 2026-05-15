import { NextRequest, NextResponse } from 'next/server';
import { getIdentifier } from '@/lib/nexa-core/rate-limiter';
import { logger, generateRequestId } from '@/lib/nexa-core/logger';
import { chatSchema } from '@/lib/validation';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';
import { detectIntent, executeIntent } from '@/lib/nexa-core/tools';
import { searchFlights } from '@/lib/nexa-core/aviation';
import { getWeather } from '@/lib/nexa-core/weather';
import { generateImage } from '@/lib/nexa-core/images';

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
    anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        keyEnv: 'ANTHROPIC_API_KEY'
    },
    gemini: {
        url: (model: string, key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${key}`,
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
    zai: {
        url: 'https://api.z.ai/api/v4/chat/completions',
        model: 'glm-4.7',
        keyEnv: 'ZAI_API_KEY'
    }
};

const FALLBACK_ORDER = ['groq', 'zai', 'anthropic', 'gemini', 'deepseek', 'openai'];

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
                    
                    // OpenAI Compatible (Groq, DeepSeek, OpenAI, Z.ai)
                    if (['groq', 'deepseek', 'openai', 'zai'].includes(providerKey)) {
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
                    } 
                    // Anthropic Logic
                    else if (providerKey === 'anthropic') {
                        const systemMessage = messages.find(m => m.role === 'system')?.content;
                        const userMessages = messages.filter(m => m.role !== 'system');
                        const res = await fetch(config.url, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json', 
                                'x-api-key': key,
                                'anthropic-version': '2023-06-01'
                            },
                            body: JSON.stringify({ 
                                model: config.model, 
                                system: systemMessage,
                                messages: userMessages, 
                                stream: true, 
                                max_tokens: 4096 
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
                                            const content = data.delta?.text || '';
                                            if (content) {
                                                fullResponse += content;
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content, provider: 'anthropic' })}\n\n`));
                                            }
                                        } catch {}
                                    }
                                }
                            }
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'anthropic' })}\n\n`));
                            controller.close();
                            return;
                        }
                    }
                    // Gemini Multimodal Logic
                    else if (providerKey === 'gemini') {
                        const contents = messages.filter(m => m.role !== 'system').map(m => {
                            const parts = [];
                            // Si el contenido tiene una imagen (asumimos formato [IMAGE:base64])
                            const imageMatch = m.content.match(/\[IMAGE:(.*?)\]/);
                            if (imageMatch) {
                                const base64 = imageMatch[1];
                                parts.push({ inlineData: { mimeType: "image/jpeg", data: base64 } });
                                parts.push({ text: m.content.replace(/\[IMAGE:.*?\]/, '').trim() || "Describe esta imagen." });
                            } else {
                                parts.push({ text: m.content });
                            }
                            return { role: m.role === 'assistant' ? 'model' : 'user', parts };
                        });

                        const res = await fetch(config.url(config.model, key), {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ contents }),
                        });
                        if (res.ok && res.body) {
                            const reader = res.body.getReader();
                            // ... resto del stream
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
        let { messages, mode = 'default' } = parsed.data;
        
        // --- NEXA INTELLIGENCE HUB (V3 - HIGH PRIORITY) ---
        const userQuery = messages[messages.length - 1].content;
        const lowerQuery = userQuery.toLowerCase();
        let toolContext = "";

        // 1. CLIMA
        if (lowerQuery.includes('clima') || lowerQuery.includes('tiempo') || lowerQuery.includes('weather') || lowerQuery.includes('temperatura')) {
            try {
                const extractionRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'system', content: 'Extract city in JSON: {"city": "Name"}. Only JSON.' }, { role: 'user', content: userQuery }],
                        response_format: { type: "json_object" }
                    }),
                });
                const info = JSON.parse((await extractionRes.json()).choices[0].message.content);
                if (info.city) toolContext += await getWeather(info.city) + "\n";
            } catch {}
        }

        // 2. IMÁGENES (Detección Ultra-Sensible)
        const triggerImages = ['dibuja', 'genera', 'diseña', 'crea', 'imagina', 'muestra', 'muéstrame', 'foto', 'imagen', 'ver', 'mira', 'playa', 'sol'];
        if (triggerImages.some(kw => lowerQuery.includes(kw))) {
            try {
                const promptRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'system', content: 'Crea un prompt descriptivo en inglés para DALL-E basado en el pedido del usuario. Solo el prompt.' }, { role: 'user', content: userQuery }],
                    }),
                });
                const cleanPrompt = promptRes.ok ? (await promptRes.json()).choices[0].message.content : userQuery;
                const imageResult = await generateImage(cleanPrompt);
                toolContext += `RESULTADO GENERACIÓN IMAGEN: ${imageResult}\n`;
            } catch {}
        }

        // 3. VUELOS
        if (lowerQuery.includes('vuelo') || lowerQuery.includes('viaje')) {
            try {
                const extractionRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'system', content: 'Extract IATA origin/dest: {"origin": "IATA", "destination": "IATA"}.' }, { role: 'user', content: userQuery }],
                        response_format: { type: "json_object" }
                    }),
                });
                const info = JSON.parse((await extractionRes.json()).choices[0].message.content);
                if (info.destination) toolContext += await searchFlights(info.origin || 'LAS', info.destination) + "\n";
            } catch {}
        }

        // 4. OLD DETECT INTENT
        if (!toolContext) {
            const extraContext = await processTools(userQuery) || undefined;
            if (extraContext) toolContext += extraContext + "\n";
        }

        // INYECCIÓN DE CONTEXTO FINAL (ADJUNTO AL MENSAJE DEL USUARIO)
        if (toolContext) {
            const lastIndex = messages.length - 1;
            messages[lastIndex].content += `\n\n[SISTEMA - INFORMACIÓN REAL OBTENIDA]:\n${toolContext}\n\nINSTRUCCIÓN: Usa los datos de arriba para responder. SI HAY UNA IMAGEN, DEBES MOSTRARLA USANDO Markdown: ![Imagen](URL). NO DIGAS QUE NO PUEDES.`;
        }

        if (!messages.find((m: any) => m.role === 'system')) messages.unshift({ role: 'system', content: getSystemPrompt(mode) });
        
        const keys = { 
            GROQ_API_KEY: process.env.GROQ_API_KEY, 
            GOOGLE_AI_API_KEY: process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY, 
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
            DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
            ZAI_API_KEY: process.env.ZAI_API_KEY
        };
        const stream = createStream(requestId, messages, keys);
        return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } });
    } catch (e: any) {
        logger.error(`Chat crash: ${e.message}`, 'chat', { requestId });
        return NextResponse.json({ error: 'Error interno' }, { status: 500, headers: corsHeaders });
    }
}

