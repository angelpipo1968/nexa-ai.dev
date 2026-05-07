import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt } from '@/lib/nexa-core/prompts';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { image, mimeType, question } = body;

        if (!image) {
            return NextResponse.json({ error: 'Se requiere una imagen' }, { status: 400 });
        }

        const googleKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;

        // Try Gemini first (best for vision)
        if (googleKey) {
            try {
                const model = body.model || 'gemini-1.5-flash';
                const res = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${googleKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            system_instruction: {
                                parts: [{ text: getSystemPrompt('vision') }]
                            },
                            contents: [{
                                parts: [
                                    { text: question || 'Analiza esta imagen en detalle. Describe TODO lo que ves, identifica texto, objetos, patrones. Si es código, explica qué hace. Si es UI, sugiere mejoras. Da recomendaciones específicas y accionables.' },
                                    {
                                        inline_data: {
                                            mime_type: mimeType || 'image/jpeg',
                                            data: image
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.7,
                                maxOutputTokens: 4096,
                            }
                        }),
                    }
                );

                if (res.ok) {
                    const data = await res.json();
                    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    return NextResponse.json({ 
                        response: text, 
                        provider: 'gemini',
                        model 
                    });
                }
            } catch (e) {
                console.error('Gemini vision error:', e);
            }
        }

        // Try OpenAI GPT-4 Vision
        if (openaiKey) {
            try {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`,
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            { role: 'system', content: getSystemPrompt('vision') },
                            {
                                role: 'user',
                                content: [
                                    { type: 'text', text: question || 'Analiza esta imagen en detalle.' },
                                    {
                                        type: 'image_url',
                                        image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${image}` }
                                    }
                                ]
                            }
                        ],
                        max_tokens: 4096,
                    }),
                });

                if (res.ok) {
                    const data = await res.json();
                    return NextResponse.json({
                        response: data.choices[0]?.message?.content || '',
                        provider: 'openai',
                        model: 'gpt-4o'
                    });
                }
            } catch (e) {
                console.error('OpenAI vision error:', e);
            }
        }

        return NextResponse.json({ 
            error: 'No hay proveedor de visión configurado. Configura GOOGLE_API_KEY, OPENAI_API_KEY o ANTHROPIC_API_KEY.',
            code: 'NO_VISION_PROVIDER'
        }, { status: 503 });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
