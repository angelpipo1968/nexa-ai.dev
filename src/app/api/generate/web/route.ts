import { NextRequest, NextResponse } from 'next/server';
import { generateHTML } from '@/lib/nexa-core/tools';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { description, type } = body;

        if (!description) {
            return NextResponse.json({ error: 'Se requiere una descripción' }, { status: 400 });
        }

        const html = generateHTML(description);

        return NextResponse.json({
            html,
            type: type || 'auto',
            previewUrl: null, // Could host temporarily
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
