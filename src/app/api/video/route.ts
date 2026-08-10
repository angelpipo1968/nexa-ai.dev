import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 180;
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
 * NEXA VIDEO GENERATION API v2.0
 * 
 * Genera videos usando z-ai-web-dev-sdk (GRATIS, sin API key).
 * Fallback a Pollinations.ai video si el SDK falla.
 * 
 * POST /api/video
 * Actions:
 *  - generate: { action: "generate", prompt, duration?, aspectRatio?, style? }
 *  - status: { action: "status", taskId }
 *  - providers: { action: "providers" }
 */

// In-memory task store for polling (resets on server restart)
const taskStore = new Map<string, any>();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Body vacío' }, { status: 400, headers: corsHeaders });
    }

    const { action } = body;

    switch (action) {
      case 'generate': {
        const { prompt, duration, aspectRatio, style, negativePrompt } = body;
        
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 3) {
          return NextResponse.json(
            { error: 'Se requiere un prompt de al menos 3 caracteres.' },
            { status: 400, headers: corsHeaders }
          );
        }

        const videoDuration = duration || 5;
        const ratio = aspectRatio || '16:9';
        const videoStyle = style || 'cinematic';

        // Enhance prompt with style
        let enhancedPrompt = prompt.trim();
        const styleMap: Record<string, string> = {
          cinematic: ', cinematic, dramatic lighting, movie quality',
          anime: ', anime style, vibrant, detailed animation',
          realistic: ', photorealistic, ultra detailed, 4K',
          artistic: ', artistic, creative, expressive',
          '3d': ', 3D animation, rendered, volumetric',
          scifi: ', science fiction, futuristic, cyberpunk',
          nature: ', nature documentary, wildlife, landscape',
          vintage: ', vintage film, retro, grain',
        };
        enhancedPrompt += styleMap[videoStyle] || '';

        console.log(`[Nexa Video] Generating: "${enhancedPrompt.substring(0, 80)}..." duration=${videoDuration}s ratio=${ratio}`);

        // ═══════════════════════════════════════
        // 1. Z-AI WEB DEV SDK (GRATIS)
        // ═══════════════════════════════════════
        try {
          const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
          const zai = await ZAI.create();

          const sizeMap: Record<string, string> = {
            '16:9': '1344x768',
            '9:16': '768x1344',
            '1:1': '1024x1024',
          };
          const videoSize = sizeMap[ratio] || '1344x768';

          const response = await zai.video.generations.create({
            prompt: enhancedPrompt,
            size: videoSize as any,
            fps: 24,
            duration: Math.min(videoDuration, 10),
          });

          // Check if response has task ID (async) or direct result
          if (response?.id) {
            const taskId = response.id;
            taskStore.set(taskId, {
              prompt: enhancedPrompt,
              provider: 'z-ai-sdk',
              status: 'processing',
              createdAt: Date.now(),
            });

            // Poll for result
            try {
              const result = await zai.async.result.query(taskId);
              const videoUrl = result?.video_result?.[0]?.url || result?.video_url || result?.url || '';
              if (videoUrl) {
                console.log(`[Nexa Video] ✅ Video generated via z-ai SDK`);
                return NextResponse.json({
                  success: true,
                  provider: 'z-ai-sdk',
                  prompt: enhancedPrompt,
                  duration: videoDuration,
                  aspectRatio: ratio,
                  style: videoStyle,
                  videoUrl,
                  videoBase64: '',
                  status: 'completed',
                }, { headers: corsHeaders });
              }
            } catch (pollErr: any) {
              // Return task ID for client-side polling
              return NextResponse.json({
                success: true,
                provider: 'z-ai-sdk',
                prompt: enhancedPrompt,
                taskId,
                status: 'processing',
                estimatedTimeSeconds: videoDuration * 8,
                message: 'Video en proceso. Usa action "status" con el taskId para verificar.',
              }, { headers: corsHeaders });
            }
          }

          // Direct result fallback
          const directUrl = (response as any)?.video_result?.[0]?.url || (response as any)?.video_url || (response as any)?.url || '';
          if (directUrl) {
            console.log(`[Nexa Video] ✅ Video generated via z-ai SDK (direct)`);
            return NextResponse.json({
              success: true,
              provider: 'z-ai-sdk',
              prompt: enhancedPrompt,
              duration: videoDuration,
              aspectRatio: ratio,
              style: videoStyle,
              videoUrl: directUrl,
              videoBase64: '',
              status: 'completed',
            }, { headers: corsHeaders });
          }
        } catch (sdkError: any) {
          console.log(`[Nexa Video] z-ai SDK failed: ${sdkError.message}, trying Pollinations...`);
        }

        // ═══════════════════════════════════════
        // 2. POLLINATIONS.AI VIDEO FALLBACK
        // ═══════════════════════════════════════
        try {
          const width = ratio === '9:16' ? 768 : ratio === '1:1' ? 1024 : 1344;
          const height = ratio === '9:16' ? 1344 : ratio === '1:1' ? 1024 : 768;
          const pollinationsUrl = `https://video.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${width}&height=${height}&nologo=true`;
          
          const pollRes = await fetch(pollinationsUrl, {
            signal: AbortSignal.timeout(120000),
          });

          if (pollRes.ok) {
            const contentType = pollRes.headers.get('content-type') || '';
            
            if (contentType.includes('video') || contentType.includes('octet-stream')) {
              const arrayBuffer = await pollRes.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              
              console.log(`[Nexa Video] ✅ Video generated via Pollinations.ai`);
              return NextResponse.json({
                success: true,
                provider: 'pollinations',
                prompt: enhancedPrompt,
                duration: videoDuration,
                aspectRatio: ratio,
                style: videoStyle,
                videoBase64: base64,
                videoUrl: pollinationsUrl,
                status: 'completed',
              }, { headers: corsHeaders });
            }
            
            // If response is JSON, it might be a task reference
            const text = await pollRes.text();
            try {
              const json = JSON.parse(text);
              if (json.url || json.video_url) {
                return NextResponse.json({
                  success: true,
                  provider: 'pollinations',
                  prompt: enhancedPrompt,
                  duration: videoDuration,
                  aspectRatio: ratio,
                  style: videoStyle,
                  videoUrl: json.url || json.video_url,
                  status: 'completed',
                }, { headers: corsHeaders });
              }
            } catch {}
          }
        } catch (pollError: any) {
          console.log(`[Nexa Video] Pollinations failed: ${pollError.message}`);
        }

        // ═══════════════════════════════════════
        // 3. CLOUD API FALLBACKS (con API keys)
        // ═══════════════════════════════════════

        // Runway ML
        const runwayKey = process.env.RUNWAY_API_KEY;
        if (runwayKey) {
          try {
            const rwRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${runwayKey}`,
                'X-Runway-Version': '2024-11-06',
              },
              body: JSON.stringify({
                promptText: enhancedPrompt,
                duration: Math.min(videoDuration, 10),
                ratio,
              }),
              signal: AbortSignal.timeout(30000),
            });

            if (rwRes.ok) {
              const data = await rwRes.json();
              if (data.id) {
                return NextResponse.json({
                  success: true,
                  provider: 'runway',
                  prompt: enhancedPrompt,
                  taskId: data.id,
                  status: 'processing',
                  estimatedTimeSeconds: videoDuration * 10,
                  message: 'Video en proceso con Runway ML. Usa action "status" para verificar.',
                }, { headers: corsHeaders });
              }
            }
          } catch {}
        }

        // All providers failed
        return NextResponse.json({
          success: false,
          error: 'No se pudo generar el video. Todos los proveedores fallaron.',
          hint: 'z-ai SDK y Pollinations.ai no disponibles. Verifica la conexión.',
          suggestion: 'Intenta de nuevo en unos segundos o usa un prompt más corto.',
        }, { status: 503, headers: corsHeaders });
      }

      case 'status': {
        const { taskId } = body;
        if (!taskId) {
          return NextResponse.json(
            { error: 'Se requiere taskId.' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Check local task store first
        const localTask = taskStore.get(taskId);
        if (localTask) {
          // Try to query SDK for result
          try {
            const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
            const zai = await ZAI.create();
            const result = await zai.async.result.query(taskId);
            
            if (result?.data?.[0]?.url || result?.data?.[0]?.base64) {
              taskStore.delete(taskId);
              return NextResponse.json({
                status: 'completed',
                provider: 'z-ai-sdk',
                videoUrl: result.data[0].url || '',
                videoBase64: result.data[0].base64 || '',
              }, { headers: corsHeaders });
            }
          } catch {}

          const elapsed = (Date.now() - localTask.createdAt) / 1000;
          if (elapsed > 180) {
            taskStore.delete(taskId);
            return NextResponse.json({
              status: 'failed',
              error: 'Timeout: el video tardó demasiado en generarse.',
            }, { headers: corsHeaders });
          }

          return NextResponse.json({
            status: 'processing',
            provider: localTask.provider,
            progress: Math.min(Math.round((elapsed / (localTask.estimatedTimeSeconds || 40)) * 100), 95),
            elapsed: Math.round(elapsed),
          }, { headers: corsHeaders });
        }

        // Check Runway task
        const runwayKey = process.env.RUNWAY_API_KEY;
        if (runwayKey) {
          try {
            const rwRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
              headers: {
                'Authorization': `Bearer ${runwayKey}`,
                'X-Runway-Version': '2024-11-06',
              },
              signal: AbortSignal.timeout(10000),
            });
            if (rwRes.ok) {
              const data = await rwRes.json();
              return NextResponse.json({
                status: data.status === 'SUCCEEDED' ? 'completed' : data.status === 'FAILED' ? 'failed' : 'processing',
                provider: 'runway',
                videoUrl: data.output?.[0] || '',
                progress: data.progress || 0,
              }, { headers: corsHeaders });
            }
          } catch {}
        }

        return NextResponse.json({
          status: 'unknown',
          error: 'Task no encontrado.',
        }, { status: 404, headers: corsHeaders });
      }

      case 'providers': {
        let sdkStatus = 'unavailable';
        try {
          await import('z-ai-web-dev-sdk');
          sdkStatus = 'available';
        } catch { sdkStatus = 'not_installed'; }

        return NextResponse.json({
          providers: [
            { id: 'z-ai-sdk', name: 'Z-AI Cloud SDK', free: true, requiresApiKey: false, status: sdkStatus },
            { id: 'pollinations', name: 'Pollinations.ai Video', free: true, requiresApiKey: false, status: 'available' },
            { id: 'runway', name: 'Runway ML Gen-3', free: false, requiresApiKey: true, status: process.env.RUNWAY_API_KEY ? 'configured' : 'no_key' },
          ],
          styles: ['cinematic', 'anime', 'realistic', 'artistic', '3d', 'scifi', 'nature', 'vintage'],
          aspectRatios: ['16:9', '9:16', '1:1'],
          maxDuration: 10,
        }, { headers: corsHeaders });
      }

      default:
        return NextResponse.json(
          { error: 'Acción no válida. Usa: generate, status, o providers.' },
          { status: 400, headers: corsHeaders }
        );
    }
  } catch (error: any) {
    console.error('[Nexa Video] Error:', error.message);
    return NextResponse.json(
      { error: `Error interno: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

export async function GET() {
  let sdkStatus = 'unavailable';
  try {
    await import('z-ai-web-dev-sdk');
    sdkStatus = 'available';
  } catch { sdkStatus = 'not_installed'; }

  return NextResponse.json({
    service: 'NEXA Video Generation API',
    version: '2.0.0',
    providers: [
      { id: 'z-ai-sdk', name: 'Z-AI Cloud SDK', free: true, requiresApiKey: false, status: sdkStatus },
      { id: 'pollinations', name: 'Pollinations.ai Video', free: true, requiresApiKey: false, status: 'available' },
      { id: 'runway', name: 'Runway ML', free: false, requiresApiKey: true, status: process.env.RUNWAY_API_KEY ? 'configured' : 'no_key' },
    ],
    endpoints: {
      generate: 'POST { action: "generate", prompt, duration?, aspectRatio?, style? }',
      status: 'POST { action: "status", taskId }',
      providers: 'POST { action: "providers" }',
    },
  }, { headers: corsHeaders });
}
