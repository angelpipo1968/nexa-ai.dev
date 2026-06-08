import { NextResponse } from 'next/server'

function getOllamaBaseUrl(): string {
  const host = process.env.OLLAMA_HOST_URL || process.env.NEXT_PUBLIC_OLLAMA_URL
  if (host) return host.replace(/\/+$/, '')
  const full = process.env.OLLAMA_URL
  if (full) {
    try {
      const u = new URL(full)
      return u.origin
    } catch {}
  }
  return 'http://127.0.0.1:11434'
}

export async function HEAD() {
  return new Response(null, { status: 200 })
}

export async function GET() {
  const checks: Record<string, boolean> = {}

  try {
    const key = process.env.OPENROUTER_API_KEY
    if (!key) {
      checks.openrouter = false
    } else {
      const r = await fetch('https://openrouter.ai/api/v1/models', {
        headers: { 'Authorization': `Bearer ${key}` },
        signal: AbortSignal.timeout(5000),
      })
      checks.openrouter = r.ok
    }
  } catch {
    checks.openrouter = false
  }

  try {
    const r = await fetch(`${getOllamaBaseUrl()}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    })
    checks.ollama = r.ok
  } catch {
    checks.ollama = false
  }

  return NextResponse.json({
    status: 'ok',
    version: '5.2.0',
    timestamp: new Date().toISOString(),
    providers: checks,
    free_models: {
      openrouter: 'google/gemini-2.5-flash',
      ollama: process.env.OLLAMA_MODEL || 'qwen3.6:latest',
    },
  })
}

