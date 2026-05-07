import { NextRequest, NextResponse } from 'next/server';
import { InputValidator } from '@/lib/security/InputValidator';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';
import { detectIntent } from '@/lib/nexa-core/tools';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages, images, mode } = body;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Se requiere al menos un mensaje', code: 'EMPTY_MESSAGES' }, { status: 400 });
        }

        if (messages.length > 50) {
            return NextResponse.json({ error: 'Conversación demasiado larga. Inicia un nuevo chat.', code: 'CONVERSATION_TOO_LONG' }, { status: 400 });
        }

        // Security check
        const validator = new InputValidator();
        const lastMessage = messages[messages.length - 1]?.content || '';
        const validation = validator.validate(typeof lastMessage === 'string' ? lastMessage : JSON.stringify(lastMessage));
        
        if (!validation.safe) {
            console.warn('NEXA Security: Blocked message:', validation.reason);
            return NextResponse.json({ error: `Seguridad NEXA: ${validation.reason}` }, { status: 403 });
        }

        // Detect intent for smarter routing
        const intent = detectIntent(typeof lastMessage === 'string' ? lastMessage : '');
        const systemPrompt = getSystemPrompt(mode || (intent.type === 'code' ? 'code' : 'default'));

        const groqKey = process.env.GROQ_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        // Build messages array with system prompt
        const apiMessages = [
            { role: 'system', content: systemPrompt },
            ...messages.map((m: any) => ({
                role: m.role,
                content: m.content
            }))
        ];

        // ─── Try Groq (Fast) ───
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
                    const stream = new ReadableStream({
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
                                                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse, provider: 'groq' })}\n\n`));
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
                                } catch (e) {
                                    console.error('Stream error:', e);
                                }
                            }
                            controller.close();
                        },
                    });

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                        },
                    });
                }
            } catch (e) {
                console.error('Groq error:', e);
            }
        }

        // ─── Try Gemini ───
        if (googleKey) {
            try {
                // Convert messages for Gemini format
                const geminiMessages = messages
                    .filter((m: any) => m.role !== 'system')
                    .map((m: any) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }]
                    }));

                const systemMsg = messages.find((m: any) => m.role === 'system');

                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${googleKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: systemPrompt }] },
                            contents: geminiMessages,
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 8192,
                            }
                        }),
                    }
                );

                if (res.ok) {
                    const stream = new ReadableStream({
                        async start(controller) {
                            const encoder = new TextEncoder();
                            const reader = res.body?.getReader();
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

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                        },
                    });
                }
            } catch (e) {
                console.error('Gemini error:', e);
            }
        }

        // ─── Try Anthropic ───
        if (anthropicKey) {
            try {
                const anthropicMessages = messages
                    .filter((m: any) => m.role !== 'system')
                    .map((m: any) => ({
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
                    const stream = new ReadableStream({
                        async start(controller) {
                            const encoder = new TextEncoder();
                            const reader = res.body?.getReader();
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

                    return new Response(stream, {
                        headers: {
                            'Content-Type': 'text/event-stream',
                            'Cache-Control': 'no-cache',
                            'Connection': 'keep-alive',
                        },
                    });
                }
            } catch (e) {
                console.error('Anthropic error:', e);
            }
        }

        return NextResponse.json({ 
            error: 'No hay proveedor de IA configurado. Configura GROQ_API_KEY, GOOGLE_API_KEY, OPENAI_API_KEY o ANTHROPIC_API_KEY.',
            code: 'NO_AI_PROVIDER'
        }, { status: 503 });

    } catch (e: any) {
        console.error('Chat error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
