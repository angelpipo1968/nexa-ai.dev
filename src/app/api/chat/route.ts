import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { messages } = body;
        const lastMessage = messages[messages.length - 1]?.content || '';

        const groqKey = process.env.GROQ_API_KEY;
        if (!groqKey) {
            return NextResponse.json({ error: 'GROQ_API_KEY missing' }, { status: 500 });
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${groqKey}`,
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'Eres un asistente útil.' },
                    ...messages
                ],
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            return NextResponse.json({ error: `Groq error: ${response.status}`, details: err }, { status: 500 });
        }

        const data = await response.json();
        return NextResponse.json({ 
            text: data.choices[0].message.content,
            provider: 'groq'
        });

    } catch (e: any) {
        return NextResponse.json({ error: 'Crash', details: e.message, stack: e.stack }, { status: 500 });
    }
}
