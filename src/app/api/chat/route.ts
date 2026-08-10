import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 120;
export const runtime = 'nodejs';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function cleanAgenticResponse(raw: string): string {
  if (!raw) return '';
  let c = raw;
  c = c.replace(/\[🛠️[^\]]*\]/g, '');
  c = c.replace(/\[✅[^\]]*\]/g, '');
  c = c.replace(/\[❌[^\]]*\]/g, '');
  c = c.replace(/\[Nexa Kernel:[^\]]*\]/g, '');
  c = c.replace(/⚡/g, '');
  c = c.replace(/^\s*Ejecutando\s+\w+.*$/gm, '');
  c = c.replace(/^\s*completado\s*$/gm, '');
  c = c.replace(/^\s*Max iterations reached\s*$/gm, '');
  c = c.replace(/\n{3,}/g, '\n\n');
  c = c.trim();
  if (!c) {
    const lines = raw.split('\n');
    const meaningful = lines.filter(l => {
      const t = l.trim();
      return t && !t.startsWith('[') && !t.startsWith('⚡') && !t.includes('python_worker') && !t.includes('Ejecutando') && !t.includes('completado') && !t.includes('Max iterations');
    });
    if (meaningful.length > 0) c = meaningful.join('\n').trim();
  }
  return c;
}

function extractResponse(data: any): string {
  return data.final_response || data.final_answer || data.answer || data.result || data.response || data.content || data.message || data.output || data.text || '';
}

export async function OPTIONS() { return new Response(null, { headers: corsHeaders }); }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Body vacío' }, { status: 400, headers: corsHeaders });

    // Support both formats: {message, model, history} and {messages, model}
    let message = '';
    let model = body.model || 'nexa-fast';
    let history = body.history || [];
    let skipJudge = body.skipJudge || false;
    let messages = body.messages || [];

    if (body.message) {
      message = body.message;
    } else if (messages.length > 0) {
      message = messages[messages.length - 1]?.content || '';
      history = messages.slice(0, -1).map((m: any) => ({ role: m.role, content: m.content }));
    }

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400, headers: corsHeaders });
    }

    // Intent classification
    const classifyIntent = (msg: string) => {
      const lower = msg.toLowerCase();
      if (/video|clip|animaci|pel.cula|movi|film|cinem/i.test(lower)) return 'video';
      if (/image|picture|draw|design|visual|creat|generat.*art|foto|fotograf|ilustr/i.test(lower)) return 'image';
      if (/code|program|function|bug|debug|implement|develop|build|api|class|method/i.test(lower)) return 'coding';
      if (/analy|data|statistic|chart|report|number|metric/i.test(lower)) return 'data';
      if (/reason|think|explain|why|how|compare|evaluate/i.test(lower)) return 'reasoning';
      if (/story|write|poem|creative|imagin/i.test(lower)) return 'creative';
      return 'casual';
    };
    const intent = classifyIntent(message);

    // ═══════════════════════════════════════
    // IMAGE GENERATION — Direct generation
    // ═══════════════════════════════════════
    if (intent === 'image') {
      try {
        const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
        const zai = await ZAI.create();
        const imgResponse = await zai.images.generations.create({
          prompt: message,
          size: '1024x1024',
        });
        if (imgResponse?.data?.[0]?.base64) {
          const base64 = imgResponse.data[0].base64;
          return NextResponse.json({
            response: `🎨 **Imagen generada exitosamente**\n\nHe creado una imagen basada en: _"${message.substring(0, 100)}"_\n\n![Imagen generada](data:image/png;base64,${base64.substring(0, 50)}...)`,
            imageBase64: base64,
            imageUrl: `data:image/png;base64,${base64}`,
            model: 'z-ai-image-gen',
            routing: { intent: 'image', confidence: 0.99, engine: 'z-ai-sdk-image', reasoning: 'Image intent detected → direct generation' },
            datacenter: false,
          }, { headers: corsHeaders });
        }
      } catch (imgError: any) {
        console.log(`[Nexa] Image SDK failed: ${imgError.message}, trying Pollinations...`);
      }
      // Pollinations fallback
      try {
        const pollUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(message)}?width=1024&height=1024&nologo=true&enhance=true`;
        const pollRes = await fetch(pollUrl, { signal: AbortSignal.timeout(60000) });
        if (pollRes.ok) {
          const buf = await pollRes.arrayBuffer();
          const base64 = Buffer.from(buf).toString('base64');
          return NextResponse.json({
            response: `🎨 **Imagen generada exitosamente**\n\nHe creado una imagen basada en: _"${message.substring(0, 100)}"_`,
            imageBase64: base64,
            imageUrl: `data:image/png;base64,${base64}`,
            model: 'pollinations-image',
            routing: { intent: 'image', confidence: 0.9, engine: 'pollinations', reasoning: 'Image intent → Pollinations.ai fallback' },
            datacenter: false,
          }, { headers: corsHeaders });
        }
      } catch (pollErr: any) {
        console.log(`[Nexa] Pollinations image failed: ${pollErr.message}`);
      }
      // If image gen fails, continue to chat as fallback
      console.log('[Nexa] Image generation failed, falling back to chat response');
    }

    // ═══════════════════════════════════════
    // VIDEO GENERATION — Direct generation
    // ═══════════════════════════════════════
    if (intent === 'video') {
      try {
        const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
        const zai = await ZAI.create();
        const vidResponse = await zai.video.generations.create({
          prompt: message,
          size: '1344x768',
          fps: 24,
          duration: 5,
        });
        if (vidResponse?.id) {
          return NextResponse.json({
            response: `🎬 **Video en proceso de generación**\n\nTu video basado en: _"${message.substring(0, 100)}"_ se está generando. Esto puede tardar unos segundos...`,
            taskId: vidResponse.id,
            model: 'z-ai-video-gen',
            routing: { intent: 'video', confidence: 0.99, engine: 'z-ai-sdk-video-async', reasoning: 'Video intent → async generation' },
            datacenter: false,
          }, { headers: corsHeaders });
        }
      } catch (vidError: any) {
        console.log(`[Nexa] Video SDK failed: ${vidError.message}`);
      }
      // If video gen fails, continue to chat as fallback
      console.log('[Nexa] Video generation failed, falling back to chat response');
    }

    const buildMessages = (systemPrompt: string) => {
      const msgs: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
        { role: 'system', content: systemPrompt }
      ];
      if (Array.isArray(history)) {
        for (const msg of history.slice(-10)) {
          const role = msg.role === 'user' ? 'user' as const : 'assistant' as const;
          const content = msg.content || msg.text || '';
          if (content) msgs.push({ role, content });
        }
      }
      msgs.push({ role: 'user', content: message });
      return msgs;
    };

    const systemPrompt = `Eres Nexa, un asistente de IA avanzado del workspace Nexa AI. Responde DIRECTAMENTE en el idioma del usuario. NO uses herramientas, NO ejecutes código, NO muestres traces de ejecución. Solo responde con texto claro. Formato markdown si aplica. Modelo: ${model}.`;
    const openaiMessages = buildMessages(systemPrompt);

    // ============================================
    // 1. FASTAPI LOCAL — RTX 3090 (puerto 8000)
    //    Timeout: 12s para evitar colgados
    // ============================================
    // ─── NEXA AGENT (LangGraph) — Primary route ─────────────
    // New LangGraph agent with tools, memory, and reasoning
    const agentEndpoints = [
      { url: 'http://127.0.0.1:8000/v1/chat/completions', format: 'openai' },
      { url: 'http://127.0.0.1:8000/chat', format: 'agent' },
      { url: 'http://127.0.0.1:8000/deliberate', format: 'agent' },
    ];

    const fastapiEndpoints = [
      // LangGraph Agent endpoints (new)
      ...agentEndpoints,
      // Legacy FastAPI endpoints
      { url: 'http://127.0.0.1:8000/v1/chat', format: 'openai' },
      { url: 'http://127.0.0.1:8000/api/chat', format: 'custom' },
    ];

    const FASTAPI_TIMEOUT = 12000;

    for (const endpoint of fastapiEndpoints) {
      try {
        let bodyStr: string;
        if (endpoint.format === 'openai') {
          bodyStr = JSON.stringify({ model: model || 'default', messages: openaiMessages, temperature: 0.7, max_tokens: 2048 });
        } else if (endpoint.format === 'agent') {
          // LangGraph agent format - supports tools and memory
          bodyStr = JSON.stringify({
            message,
            task_type: intent === 'reasoning' ? 'reasoning' : intent === 'coding' ? 'code_generation' : 'simple_chat',
            use_memory: true,
          });
        } else {
          bodyStr = JSON.stringify({ message, model, history, skip_judge: skipJudge, direct_mode: true });
        }

        const res = await fetch(endpoint.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: bodyStr,
          signal: AbortSignal.timeout(FASTAPI_TIMEOUT)
        });

        if (res.ok) {
          const data = await res.json();
          let rawResponse = '';
          if (endpoint.format === 'openai') {
            rawResponse = data.choices?.[0]?.message?.content || '';
          } else {
            rawResponse = extractResponse(data);
          }
          const response = cleanAgenticResponse(rawResponse);

          if (response) {
            return NextResponse.json({
              response,
              model: data.model || model || 'RTX3090-Local',
              routing: data.routing || {
                intent: skipJudge ? 'forced' : intent,
                confidence: skipJudge ? 1.0 : 0.95,
                engine: model || 'fastapi-local',
                reasoning: skipJudge ? 'Judge bypassed — RTX 3090' : `Intent "${intent}", RTX 3090 (${endpoint.url})`
              },
              judge: data.judge || null,
              datacenter: true
            }, { headers: corsHeaders });
          }
        }
      } catch (e: any) {
        if (e?.name === 'TimeoutError') console.log(`[Nexa] Timeout: ${endpoint.url}`);
      }
    }

    console.log('[Nexa] FastAPI unavailable, trying LiteLLM...');

    // ============================================
    // 2. LITELLM GATEWAY (puerto 4000)
    //    API Key: sk-nexa-master-3090
    // ============================================
    const litellmEndpoints = [
      'http://127.0.0.1:4000/v1/chat/completions',
      'http://127.0.0.1:4000/chat/completions',
    ];

    for (const endpoint of litellmEndpoints) {
      try {
        const litellmRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer sk-nexa-master-3090',
          },
          body: JSON.stringify({
            model: model || 'fast',
            messages: openaiMessages,
            temperature: 0.7,
            max_tokens: 2048,
          }),
          signal: AbortSignal.timeout(30000)
        });

        if (litellmRes.ok) {
          const data = await litellmRes.json();
          const rawResponse = data.choices?.[0]?.message?.content || '';
          const response = cleanAgenticResponse(rawResponse);

          if (response) {
            return NextResponse.json({
              response,
              model: data.model || model || 'LiteLLM',
              routing: {
                intent: skipJudge ? 'forced' : intent,
                confidence: skipJudge ? 1.0 : 0.8,
                engine: model || 'litellm',
                reasoning: skipJudge ? 'Judge bypassed — LiteLLM' : `Intent "${intent}", LiteLLM gateway (port 4000)`
              },
              datacenter: false
            }, { headers: corsHeaders });
          }
        }
      } catch {
        console.log(`[Nexa] LiteLLM ${endpoint} failed`);
      }
    }

    // ============================================
    // 3. CLOUD SDK FALLBACK
    // ============================================
    try {
      const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
      const zai = await ZAI.create();
      const completion = await zai.chat.completions.create({ messages: openaiMessages, temperature: 0.7, max_tokens: 2048 });
      const response = completion.choices?.[0]?.message?.content || '';
      if (response) {
        return NextResponse.json({
          response,
          model: model || 'Nexa Cloud',
          routing: { intent, confidence: 0.75, engine: model || 'cloud', reasoning: `Intent "${intent}", cloud fallback` },
          datacenter: false
        }, { headers: corsHeaders });
      }
    } catch {
      console.log('[Nexa] Cloud SDK not available');
    }

    // ============================================
    // 4. NADA DISPONIBLE
    // ============================================
    return NextResponse.json({
      error: 'Todos los backends están fuera de línea o no responden',
      hint: 'FastAPI (:8000), LiteLLM (:4000) y Cloud SDK no disponibles.'
    }, { status: 503, headers: corsHeaders });

  } catch (error: any) {
    console.error('[Nexa] Chat error:', error.message);
    return NextResponse.json({ error: 'Error interno', details: error.message }, { status: 500, headers: corsHeaders });
  }
}

// ============================================
// GET: Health check
// ============================================
export async function GET() {
  let dcStatus = 'offline';
  let dcLatency = 0;
  let dcEndpoint = '';
  const dcStart = performance.now();

  for (const url of ['http://127.0.0.1:8000/health', 'http://127.0.0.1:8000/', 'http://127.0.0.1:8000/v1/models']) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      dcLatency = Math.round(performance.now() - dcStart);
      if (res.ok) { dcStatus = 'online'; dcEndpoint = url; break; }
    } catch {}
  }
  if (dcStatus === 'offline') dcLatency = Math.round(performance.now() - dcStart);

  let litellmStatus = 'offline';
  let litellmLatency = 0;
  for (const url of ['http://127.0.0.1:4000/health', 'http://127.0.0.1:4000/v1/models']) {
    try {
      const lStart = performance.now();
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      litellmLatency = Math.round(performance.now() - lStart);
      if (res.ok) { litellmStatus = 'online'; break; }
    } catch {}
  }

  let sdkStatus = 'unavailable';
  try { await import('z-ai-web-dev-sdk'); sdkStatus = 'available'; } catch { sdkStatus = 'not_installed'; }

  const activeRoute = dcStatus === 'online'
    ? `RTX 3090 (${dcEndpoint})`
    : litellmStatus === 'online' ? 'LiteLLM (:4000)'
    : sdkStatus === 'available' ? 'Cloud SDK'
    : 'NONE';

  return NextResponse.json({
    status: 'ok',
    datacenter: dcStatus,
    datacenterLatency: dcLatency,
    datacenterEndpoint: dcEndpoint,
    litellm: litellmStatus,
    litellmLatency,
    sdk: sdkStatus,
    activeRoute,
  }, { headers: corsHeaders });
}
