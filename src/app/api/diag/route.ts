import { NextResponse } from 'next/server';

export async function GET() {
    const vars = {
        GROQ_API_KEY: !!process.env.GROQ_API_KEY,
        GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
        GOOGLE_API_KEY: !!process.env.GOOGLE_API_KEY,
        GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
        DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
        OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
        ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
        VITE_XIAOMI_API_KEY: !!process.env.VITE_XIAOMI_API_KEY,
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        VERCEL_ENV: process.env.VERCEL_ENV,
    };
    
    return NextResponse.json(vars);
}
