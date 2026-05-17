import { NextRequest, NextResponse } from 'next/server';
import { InputValidator } from '@/lib/security/InputValidator';

export async function POST(req: NextRequest) {
    try {
        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json({ error: 'Se requiere al menos un mensaje', code: 'EMPTY_MESSAGES' }, { status: 400 });
        }

        // Rate limiting check - max 50 messages per conversation
        if (messages.length > 50) {
            return NextResponse.json({ error: 'Conversación demasiado larga. Inicia un nuevo chat.', code: 'CONVERSATION_TOO_LONG' }, { status: 400 });
        }

        // --- SECURITY CHECK ---
        const validator = new InputValidator();
        const lastMessage = messages[messages.length - 1]?.content || '';
        const validation = validator.validate(lastMessage);
        
        if (!validation.safe) {
            console.warn('NEXA Security: Blocked message:', validation.reason);
            return NextResponse.json({ error: `Seguridad NEXA: ${validation.reason}` }, { status: 403 });
        }
        // ----------------------

        const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY || process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
        const googleKey = process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
        const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;

        // Keys loaded (no logging in production)

        // 1. TRY GROQ (Fastest & Most Reliable currently)
        if (groqKey) {
            try {
                console.log('NEXA: Attempting Groq...');
                const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                    body: JSON.stringify({
                        model: 'llama-3.3-70b-versatile',
                        messages: [{ role: 'system', content: 'Eres NEXA, una IA avanzada.' }, ...messages],
                        stream: true,
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
                                        const lines = chunk.split('\n');
                                        
                                        for (const line of lines) {
                                            const trimmedLine = line.trim();
                                            if (!trimmedLine || trimmedLine === 'data: [DONE]') continue;
                                            
                                            if (trimmedLine.startsWith('data: ')) {
                                                try {
                                                    const data = JSON.parse(trimmedLine.slice(6));
                                                    const content = data.choices[0]?.delta?.content || '';
                                                    if (content) {
                                                        fullResponse += content;
                                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: content })}\n\n`));
                                                    }
                                                } catch (e) {
                                                    // Skip partial JSON or non-JSON lines
                                                }
                                            }
                                        }
                                    }
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`));
                                } catch (e: any) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
                                }
                            }
                            controller.close();
                        },
                    });
                    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
                } else {
                    const err = await response.text();
                    console.error('NEXA: Groq failed:', response.status, err);
                }
            } catch (e) { console.error('NEXA: Groq exception:', e); }
        }

        // 2. TRY ANTHROPIC (High Intelligence)
        if (anthropicKey) {
            try {
                console.log('NEXA: Attempting Anthropic...');
                const response = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': anthropicKey,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: 'claude-3-5-sonnet-latest',
                        max_tokens: 4096,
                        system: 'Eres NEXA, una IA avanzada. Responde en el idioma del usuario.',
                        messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
                        stream: true,
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
                                            if (line.startsWith('data: ')) {
                                                try {
                                                    const data = JSON.parse(line.slice(6));
                                                    if (data.type === 'content_block_delta' && data.delta?.text) {
                                                        fullResponse += data.delta.text;
                                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: data.delta.text })}\n\n`));
                                                    }
                                                    if (data.type === 'message_stop') {
                                                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse })}\n\n`));
                                                    }
                                                } catch { }
                                            }
                                        }
                                    }
                                } catch (e: any) {
                                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
                                }
                            }
                            controller.close();
                        },
                    });
                    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
                } else {
                    const err = await response.text();
                    console.error('NEXA: Anthropic failed:', response.status, err);
                }
            } catch (e) { console.error('NEXA: Anthropic exception:', e); }
        }

        // 3. TRY GOOGLE (Context)
        if (googleKey) {
            try {
                console.log('NEXA: Attempting Google...');
                const geminiMsgs = messages
                    .filter((m: any) => m.role !== 'system')
                    .map((m: any) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${googleKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: { parts: [{ text: 'Eres NEXA, una IA avanzada.' }] },
                            contents: geminiMsgs,
                            generationConfig: { temperature: 0.7 },
                        }),
                    }
                );

                if (res.ok) {
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    const encoder = new TextEncoder();
                    const stream = new ReadableStream({
                        start(controller) {
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
                            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse: text })}\n\n`));
                            controller.close();
                        },
                    });
                    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' } });
                } else {
                    const err = await res.text();
                    console.error('NEXA: Google failed:', res.status, err);
                }
            } catch (e) { console.error('NEXA: Google exception:', e); }
        }

        return NextResponse.json({ error: 'NEXA ERROR: All AI providers failed. Check keys.' }, { status: 503 });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
