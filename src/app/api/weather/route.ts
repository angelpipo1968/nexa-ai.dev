import { NextRequest, NextResponse } from 'next/server';
import { getWeather } from '@/lib/nexa-core/weather';

export const dynamic = 'force-dynamic';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new NextResponse(null, { headers: corsHeaders });
}

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!city) {
        return NextResponse.json({ error: 'Missing city parameter' }, { status: 400, headers: corsHeaders });
    }

    try {
        if (apiKey) {
            // Future implementation for OpenWeatherMap
            const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=es`);
            const data = await res.json();
            if (res.ok) {
                return NextResponse.json(data, { headers: corsHeaders });
            }
        }
        
        // Fallback to existing wttr.in logic
        const report = await getWeather(city);
        return NextResponse.json({ report }, { headers: corsHeaders });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500, headers: corsHeaders });
    }
}
