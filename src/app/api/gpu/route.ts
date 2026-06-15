import { NextResponse } from "next/server";

export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

/**
 * GET /api/gpu
 * Get real-time GPU status from the RTX 3090 datacenter
 */
export async function GET() {
  try {
    const res = await fetch('http://127.0.0.1:8000/gpu/status', {
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json({
        ...data,
        source: 'datacenter',
      }, { headers: corsHeaders });
    }
  } catch {
    // Agent not available, try health endpoint
  }

  // Fallback: health endpoint might have GPU info
  try {
    const res = await fetch('http://127.0.0.1:8000/health', {
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.gpu) {
        return NextResponse.json({
          ...data.gpu,
          source: 'health-endpoint',
        }, { headers: corsHeaders });
      }
    }
  } catch {}

  return NextResponse.json({
    status: 'unavailable',
    message: 'GPU monitoring requires the Nexa Agent running on port 8000',
  }, { headers: corsHeaders });
}
