import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    return NextResponse.json({
        status: 'ok',
        time: new Date().toISOString(),
        env: {
            GROQ_API_KEY: process.env.GROQ_API_KEY ? { len: process.env.GROQ_API_KEY.length, prefix: process.env.GROQ_API_KEY.slice(0, 4) } : null,
            GOOGLE_API_KEY: process.env.GOOGLE_API_KEY ? { len: process.env.GOOGLE_API_KEY.length, prefix: process.env.GOOGLE_API_KEY.slice(0, 4) } : null,
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? { len: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length, prefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.slice(0, 10) } : null,
            NODE_ENV: process.env.NODE_ENV,
        }
    });
}
