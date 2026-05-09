import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    return NextResponse.json({
        status: 'ok',
        time: new Date().toISOString(),
        env: {
            GROQ_API_KEY: !!process.env.GROQ_API_KEY,
            GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
            GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
            GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
            NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            NODE_ENV: process.env.NODE_ENV,
        }
    });
}
