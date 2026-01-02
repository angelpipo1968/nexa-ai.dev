
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const docName = searchParams.get('doc');

    if (!docName) {
        return NextResponse.json({ error: 'Falta el nombre del documento' }, { status: 400 });
    }

    // Seguridad básica: solo permitir archivos en /docs/ y sin subir niveles
    const sanitizedName = path.basename(docName);
    const docsDir = path.join(process.cwd(), 'docs');
    const filePath = path.join(docsDir, sanitizedName);

    try {
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: 'Documento no encontrado' }, { status: 404 });
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        return NextResponse.json({ content });
    } catch (error) {
        return NextResponse.json({ error: 'Error leyendo archivo' }, { status: 500 });
    }
}
