import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, getIdentifier } from '@/lib/rate-limiter';
import { aiSchema } from '@/lib/validation';

export const runtime = 'edge';

const limiter = createRateLimiter();

interface IncomingMessage {
    role: string;
    content: string;
}

interface RequestBody {
    provider?: string;
    model?: string;
    messages: IncomingMessage[];
    temperature?: number;
    max_tokens?: number;
}

const SYSTEM_PROMPT = `Eres Nexa, una inteligencia artificial de vanguardia.
Tu objetivo es ser el asistente definitivo para ingeniería de software, razonamiento complejo y tareas de largo horizonte.
Responde siempre en español. Usa markdown cuando sea apropiado.`;

export async function POST(req: NextRequest) {
    try {
        // Rate limiting
        const identifier = getIdentifier(req);
        const rateLimit = await limiter.checkPreset(identifier, 'chat');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
                {
                    status: 429,
                    headers: { 'Retry-After': String(Math.ceil((rateLimit.retryAfterMs || 60000) / 1000)) }
                }
            );
        }

        const rawBody = await req.json();
        const parsed = aiSchema.safeParse(rawBody);
        if (!parsed.success) {
            return NextResponse.json(
                { error: 'Invalid input', code: 'VALIDATION_ERROR', details: parsed.error.issues },
                { status: 400 }
            );
        }

        const body: RequestBody = {
            ...rawBody,
            messages: parsed.data.messages,
        };
        const provider = body.provider || 'auto';
        const messages: IncomingMessage[] = body.messages || [];
        
        // Ensure system prompt
        if (!messages.find((m) => m.role === 'system')) {
            messages.unshift({ role: 'system', content: SYSTEM_PROMPT });
        }

        let fullText = '';
        let usedProvider = '';

        // Try Gemini (Google) first
        if (provider === 'gemini' || provider === 'auto') {
            const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
            if (key) {
                const model = body.model || 'gemini-1.5-flash';
                const geminiMessages = messages
                    .filter((m) => m.role !== 'system')
                    .map((m) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }));

                const systemMsg = messages.find((m) => m.role === 'system');

                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        system_instruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
                        contents: geminiMessages,
                        generationConfig: { temperature: body.temperature ?? 0.7 }
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    usedProvider = 'gemini';
                }
            }
        }

        // Try Anthropic next
        if (!fullText && (provider === 'anthropic' || provider === 'auto')) {
            const key = process.env.ANTHROPIC_API_KEY;
            if (key) {
                const anthropicMessages = messages
                    .filter((m) => m.role !== 'system')
                    .map((m) => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.content
                    }));
                    
                const systemMsg = messages.find((m) => m.role === 'system');

                const res = await fetch('https://api.anthropic.com/v1/messages', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': key,
                        'anthropic-version': '2023-06-01',
                    },
                    body: JSON.stringify({
                        model: body.model || 'claude-3-haiku-20240307',
                        messages: anthropicMessages,
                        system: systemMsg?.content,
                        temperature: body.temperature ?? 0.7,
                        max_tokens: body.max_tokens ?? 2048,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    fullText = data.content?.[0]?.text || '';
                    usedProvider = 'anthropic';
                }
            }
        }

        if (!fullText) {
            return NextResponse.json({ error: 'All providers failed or no keys found' }, { status: 503 });
        }

        // Return fake SSE stream so NexaApp.tsx parses it correctly
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            start(controller) {
                // Send the text chunk
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fullText })}\n\n`));
                // Send the done chunk
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, fullResponse: fullText })}\n\n`));
                controller.close();
            }
        });

        return new NextResponse(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}
