import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { headers: corsHeaders });
}

/**
 * POST /api/agent
 * Direct access to the LangGraph agent on port 8000.
 * Supports: chat, reasoning, code generation, image generation, etc.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Body vacío' }, { status: 400, headers: corsHeaders });
    }

    const message = body.message || '';
    const taskType = body.task_type || 'simple_chat';
    const useMemory = body.use_memory !== false;
    const stream = body.stream || false;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400, headers: corsHeaders });
    }

    // Try the LangGraph agent first
    const agentEndpoints = [
      'http://127.0.0.1:8000/chat',
      'http://127.0.0.1:8000/v1/chat/completions',
    ];

    for (const url of agentEndpoints) {
      try {
        const isAgentFormat = url.includes('/chat') && !url.includes('/v1/');
        const payload = isAgentFormat
          ? { message, task_type: taskType, use_memory: useMemory, stream }
          : {
              model: 'nexa-agent',
              messages: [{ role: 'user', content: message }],
              temperature: 0.7,
              max_tokens: 4096,
              stream,
            };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(30000),
        });

        if (res.ok) {
          const data = await res.json();
          
          // Extract response based on format
          let response = '';
          if (data.response) response = data.response;
          else if (data.choices?.[0]?.message?.content) response = data.choices[0].message.content;
          else if (data.content) response = data.content;

          if (response) {
            return NextResponse.json({
              response,
              model: data.model || 'nexa-agent',
              task_type: taskType,
              iterations: data.iterations || 0,
              elapsed_seconds: data.elapsed_seconds || 0,
              routing: {
                intent: taskType,
                engine: 'langgraph-agent',
                reasoning: 'Direct LangGraph agent with tools + memory',
              },
              datacenter: true,
              agent: true,
              tools_available: [
                'web_search', 'execute_python', 'read_file', 'write_file',
                'list_directory', 'gpu_status', 'generate_image', 'search_wikipedia',
                'recall_memory',
              ],
            }, { headers: corsHeaders });
          }
        }
      } catch (e: any) {
        if (e?.name === 'TimeoutError') {
          console.log(`[Agent] Timeout: ${url}`);
        }
      }
    }

    // Fallback: Use z-ai-web-dev-sdk
    try {
      const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({
        messages: [{ role: 'user', content: message }],
        temperature: 0.7,
        max_tokens: 4096,
      });
      const response = completion.choices?.[0]?.message?.content || '';
      if (response) {
        return NextResponse.json({
          response,
          model: 'cloud-fallback',
          task_type: taskType,
          routing: { intent: taskType, engine: 'cloud', reasoning: 'Agent offline, cloud fallback' },
          datacenter: false,
          agent: false,
        }, { headers: corsHeaders });
      }
    } catch {
      console.log('[Agent] Cloud SDK not available');
    }

    return NextResponse.json({
      error: 'Agent no disponible',
      hint: 'El agente LangGraph (puerto 8000) y Cloud SDK no están disponibles.',
    }, { status: 503, headers: corsHeaders });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error interno', details: error.message },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/agent
 * Get agent status and capabilities
 */
export async function GET() {
  let agentStatus = 'offline';
  let agentLatency = 0;
  let capabilities: string[] = [];

  const start = performance.now();
  try {
    const res = await fetch('http://127.0.0.1:8000/health', {
      signal: AbortSignal.timeout(5000),
    });
    agentLatency = Math.round(performance.now() - start);
    
    if (res.ok) {
      agentStatus = 'online';
      const data = await res.json();
      capabilities = [
        'langgraph_agent',
        'tools',
        'memory',
        ...(data.features?.image_gen ? ['image_generation'] : []),
        ...(data.features?.code_exec ? ['code_execution'] : []),
        ...(data.features?.web_search ? ['web_search'] : []),
      ];
    }
  } catch {
    agentLatency = Math.round(performance.now() - start);
  }

  return NextResponse.json({
    agent: agentStatus,
    engine: 'LangGraph',
    latency: agentLatency,
    capabilities,
    version: '2.0.0',
    gpu: 'RTX 3090',
  }, { headers: corsHeaders });
}
