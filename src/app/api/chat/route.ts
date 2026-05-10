import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter, getIdentifier } from '@/lib/rate-limiter';
import { aiSchema } from '@/lib/validation';

export const runtime = 'edge';

const limiter = createRateLimiter();

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new Response(null, { status: 204, headers: corsHeaders });
}

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
        const identifier = getIdentifier(req);
        const rateLimit = await limiter.checkPreset(identifier, 'chat');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
                {
                    status: 429,
                    headers: { ...corsHeaders, 'Retry-After': String(Math.ceil((rateLimit.retryAfterMs || 60000) / 1000)) }
                }
            );
        }

        const body: RequestBody = await req.json();
        const provider = body.provider || 'auto';
        const messages = body.messages || [];
        
        if (!messages.find((m) => m.role === 'system')) {
            messages.unshift({ role: 'system', content: SYSTEM_PROMPT });
        }

        let fullText = '';
        let usedProvider = '';

        // Gemini (Google)
        if (provider === 'gemini' || provider === 'auto') {
            const key = process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
            if (key) {
                const model = body.model || 'gemini-1.5-flash';
                const geminiMessages = messages.filter(m => m.role !== 'system').map(m => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));
                const systemMsg = messages.find(m => m.role === 'system');

                try {
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
                } catch {}
            }
        }

        // Groq
        if (!fullText && (provider === 'groq' || provider === 'auto')) {
            const key = process.env.GROQ_API_KEY;
            if (key) {
                try {
                    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                        body: JSON.stringify({
                            model: body.model || 'llama-3.3-70b-versatile',
                            messages: messages.map(m => ({ role: m.role, content: m.content })),
                            temperature: body.temperature ?? 0.7
                        }),
                    });
                    if (res.ok) {
                        const data = await res.json();
                        fullText = data.choices?.[0]?.message?.content || '';
                        usedProvider = 'groq';
                    }
                } catch {}
            }
        }

        if (!fullText) {
            return NextResponse.json({ error: 'All providers failed or no key found' }, { status: 503, headers: corsHeaders });
        }

        return NextResponse.json({ 
            content: fullText, 
            provider: usedProvider,
            ts: Date.now() 
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('[NEXA] Chat error:', error);
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}
