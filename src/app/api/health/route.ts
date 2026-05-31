import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, boolean> = {}
  
  // Check OpenRouter
  try {
    const r = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY || ''}` },
      signal: AbortSignal.timeout(5000),
    })
    checks.openrouter = r.ok
  } catch { checks.openrouter = false }

  // Check Ollama
  try {
    const r = await fetch(process.env.OLLAMA_URL || 'http://localhost:11434/api/tags', {
      signal: AbortSignal.timeout(3000),
    })
    checks.ollama = r.ok
  } catch { checks.ollama = false }

  return NextResponse.json({
    status: 'ok',
    version: '5.2.0',
    timestamp: new Date().toISOString(),
    providers: checks,
    free_models: {
      openrouter: 'google/gemini-2.5-flash',
      ollama: process.env.OLLAMA_MODEL || 'llama3.1:8b',
    },
    features: [
      'chat', 'vision', 'code_generation', 'web_search',
      'flights', 'weather', 'lottery', 'movies', 'news',
      'spotify', 'maps', 'finance', 'nasa', 'academic',
      'translation', 'image_generation', 'voice_mode',
    ],
  })
}
