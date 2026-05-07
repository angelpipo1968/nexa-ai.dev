/**
 * Vercel Edge Function — /api/ai
 * Proxy seguro a proveedores de AI.
 */

export const config = { runtime: 'edge' };

const PROVIDERS: Record<string, any> = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        headers: (key: string) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        }),
    },
    gemini: {
        url: (model: string, key: string) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    },
    deepseek: {
        url: 'https://api.deepseek.com/chat/completions',
        headers: (key: string) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        }),
    },
    anthropic: {
        url: 'https://api.anthropic.com/v1/messages',
        headers: (key: string) => ({
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
        }),
    },
    xiaomi: {
        url: 'https://platform.xiaomimimo.com/v1/chat/completions',
        headers: (key: string) => ({
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
        }),
    },
};

const SYSTEM_PROMPT = `Eres Nexa, una inteligencia artificial de vanguardia impulsada por el motor MiMo-V2.5-Pro (1T MoE). 
Tu objetivo es ser el asistente definitivo para ingeniería de software, razonamiento complejo y tareas de largo horizonte.
Responde siempre en español. Usa markdown cuando sea apropiado.`;

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

export default async function handler(req: Request) {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders() });
    }

    try {
        const body = await req.json();
        console.log('[API] Request received for provider:', body.provider || 'auto');

        const provider = body.provider || 'auto';
        const messages = body.messages || [];
        
        // Ensure system prompt
        if (!messages.find((m: any) => m.role === 'system')) {
            messages.unshift({ role: 'system', content: SYSTEM_PROMPT });
        }

        // Try Xiaomi first as it's the main provider (MiMo-V2.5-Pro)
        if (provider === 'xiaomi' || provider === 'auto') {
            const key = process.env.VITE_XIAOMI_API_KEY;
            if (key) {
                console.log('[API] Calling Xiaomi (MiMo)...');
                const res = await fetch(PROVIDERS.xiaomi.url, {
                    method: 'POST',
                    headers: PROVIDERS.xiaomi.headers(key),
                    body: JSON.stringify({
                        model: body.model || 'MiMo-V2.5-Pro',
                        messages: messages,
                        temperature: body.temperature ?? 0.7,
                        max_tokens: body.max_tokens ?? 4096,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log('[API] Xiaomi Success');
                    return new Response(JSON.stringify({
                        response: data.choices?.[0]?.message?.content,
                        provider: 'xiaomi'
                    }), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
                }
                console.warn('[API] Xiaomi Failed:', await res.text());
            }
        }

        // Try Groq next
        if (provider === 'groq' || provider === 'auto') {
            const key = process.env.GROQ_API_KEY;
            if (key) {
                console.log('[API] Calling Groq...');
                const res = await fetch(PROVIDERS.groq.url, {
                    method: 'POST',
                    headers: PROVIDERS.groq.headers(key),
                    body: JSON.stringify({
                        model: body.model || 'llama-3.3-70b-versatile',
                        messages: messages,
                        temperature: body.temperature ?? 0.7,
                        max_tokens: body.max_tokens ?? 2048,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    console.log('[API] Groq Success');
                    return new Response(JSON.stringify({
                        response: data.choices?.[0]?.message?.content,
                        provider: 'groq'
                    }), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
                }
                console.warn('[API] Groq Failed:', await res.text());
            }
        }

        // Try Gemini as fallback
        if (provider === 'gemini' || provider === 'auto') {
            const key = process.env.GEMINI_API_KEY;
            if (key) {
                console.log('[API] Calling Gemini...');
                const model = body.model || 'gemini-1.5-flash';
                const geminiMessages = messages
                    .filter((m: any) => m.role !== 'system')
                    .map((m: any) => ({
                        role: m.role === 'assistant' ? 'model' : 'user',
                        parts: [{ text: m.content }]
                    }));

                const systemMsg = messages.find((m: any) => m.role === 'system');

                const res = await fetch(PROVIDERS.gemini.url(model, key), {
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
                    console.log('[API] Gemini Success');
                    return new Response(JSON.stringify({
                        response: data.candidates?.[0]?.content?.parts?.[0]?.text,
                        provider: 'gemini'
                    }), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });
                }
                console.warn('[API] Gemini Failed:', await res.text());
            }
        }

        return new Response(JSON.stringify({ error: 'All providers failed or no keys found' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });

    } catch (err: any) {
        console.error('[API] Error:', err.message);
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json', ...corsHeaders() }
        });
    }
}
