import { NextRequest, NextResponse } from "next/server";

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

/**
 * GET /api/memory?query=xxx&n=5
 * Search long-term memory
 */
export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('query') || '';
  const n = parseInt(req.nextUrl.searchParams.get('n') || '5');

  if (!query) {
    // Return memory stats
    try {
      const res = await fetch('http://127.0.0.1:8000/memory/stats', {
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data, { headers: corsHeaders });
      }
    } catch {}

    return NextResponse.json({
      status: 'unavailable',
      message: 'Memory requires the Nexa Agent running on port 8000',
    }, { headers: corsHeaders });
  }

  // Search memory
  try {
    const res = await fetch(`http://127.0.0.1:8000/memory/search?query=${encodeURIComponent(query)}&n=${n}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }
  } catch {}

  return NextResponse.json({
    status: 'unavailable',
    results: [],
  }, { headers: corsHeaders });
}

/**
 * POST /api/memory
 * Add a memory entry
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, source = 'user', category = 'general' } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400, headers: corsHeaders });
    }

    const res = await fetch('http://127.0.0.1:8000/memory/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source, category }),
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Memory service unavailable' }, { status: 503, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Memory service unavailable' }, { status: 503, headers: corsHeaders });
  }
}

/**
 * DELETE /api/memory
 * Clear all memories
 */
export async function DELETE() {
  try {
    const res = await fetch('http://127.0.0.1:8000/memory/clear', {
      method: 'DELETE',
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, { headers: corsHeaders });
    }

    return NextResponse.json({ error: 'Memory service unavailable' }, { status: 503, headers: corsHeaders });
  } catch {
    return NextResponse.json({ error: 'Memory service unavailable' }, { status: 503, headers: corsHeaders });
  }
}
