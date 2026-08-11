/**
 * NEXA AI — Chat Proxy Route
 *
 * Forwards POST /api/nexa → NEXA backend /v1/chat/completions
 * The API key never reaches the browser; it lives only in env vars.
 *
 * Env vars used (set in Vercel dashboard and .env.local):
 *   NEXA_API_KEY   — master key for the NEXA backend
 *   NEXA_API_URL   — base URL, e.g. https://api.nexa-ai.dev
 *                    defaults to https://api.nexa-ai.dev
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.NEXA_API_KEY;
  const apiUrl = (process.env.NEXA_API_URL ?? 'https://api.nexa-ai.dev').replace(/\/$/, '');

  if (!apiKey) {
    return NextResponse.json(
      { error: 'NEXA_API_KEY not configured on server.' },
      { status: 503, headers: CORS_HEADERS }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body.' },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  try {
    const upstream = await fetch(`${apiUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Bypass-Tunnel-Reminder': 'true',
      },
      body: JSON.stringify(body),
      // Streaming is not proxied here — the front-end uses stream:false
      // If streaming is needed in the future, replace with a ReadableStream passthrough
    });

    const data = await upstream.json();

    return NextResponse.json(data, {
      status: upstream.status,
      headers: CORS_HEADERS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown upstream error';
    return NextResponse.json(
      { error: `Upstream fetch failed: ${message}` },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
