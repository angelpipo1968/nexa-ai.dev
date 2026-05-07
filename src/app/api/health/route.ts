import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
    const providers = {
        groq: !!process.env.GROQ_API_KEY,
        gemini: !!(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY),
        anthropic: !!process.env.ANTHROPIC_API_KEY,
        openai: !!process.env.OPENAI_API_KEY,
        supabase: !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    };

    const activeProviders = Object.entries(providers).filter(([_, v]) => v).map(([k]) => k);

    return NextResponse.json({
        status: 'ok',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        providers,
        activeProviders,
        environment: process.env.NODE_ENV || 'development',
    });
}
