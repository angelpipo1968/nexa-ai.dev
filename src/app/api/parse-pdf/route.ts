import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/nexa-core/logger';

export const runtime = 'nodejs'; // pdf-parse requires Node.js runtime

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        
        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        
        // Dynamically require to avoid build-time DOMMatrix evaluation and export issues
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);

        
        return NextResponse.json({ text: data.text });
    } catch (error: any) {
        logger.error(`Error parsing PDF: ${error.message}`, 'parse-pdf');
        return NextResponse.json({ error: 'Error parsing PDF' }, { status: 500 });
    }
}
