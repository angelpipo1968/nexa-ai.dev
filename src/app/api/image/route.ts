import { NextRequest, NextResponse } from 'next/server';

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
 * NEXA IMAGE GENERATION API
 * 
 * Genera imágenes usando z-ai-web-dev-sdk (GRATIS, sin API key).
 * Fallback a Pollinations.ai si el SDK falla.
 * 
 * POST /api/image
 * Body: { prompt, size?, style?, n? }
 * 
 * Sizes: 1024x1024, 768x1344, 864x1152, 1344x768, 1152x864, 1440x720, 720x1440
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Body vacío' }, { status: 400, headers: corsHeaders });
    }

    const { prompt, size, style, n } = body;

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length < 2) {
      return NextResponse.json(
        { error: 'Se requiere un prompt de al menos 2 caracteres.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const imageSize = size || '1024x1024';
    const validSizes = ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440'];
    if (!validSizes.includes(imageSize)) {
      return NextResponse.json(
        { error: `Size inválido. Usa uno de: ${validSizes.join(', ')}` },
        { status: 400, headers: corsHeaders }
      );
    }

    // Enhance prompt with style if provided
    let enhancedPrompt = prompt.trim();
    if (style && style !== 'default') {
      const styleMap: Record<string, string> = {
        cinematic: ', cinematic lighting, dramatic, movie still, 8k',
        anime: ', anime style, vibrant colors, detailed illustration',
        realistic: ', photorealistic, ultra detailed, DSLR quality',
        fantasy: ', fantasy art, magical, ethereal, detailed',
        artistic: ', artistic, painterly, expressive brushstrokes',
        '3d': ', 3D render, octane render, volumetric lighting',
        minimalist: ', minimalist, clean, simple design',
        vintage: ', vintage, retro aesthetic, film grain',
        scifi: ', science fiction, futuristic, cyberpunk',
        nature: ', nature photography, wildlife, landscape',
      };
      enhancedPrompt += styleMap[style] || '';
    }

    console.log(`[Nexa Image] Generating: "${enhancedPrompt.substring(0, 80)}..." size=${imageSize}`);

    // ═══════════════════════════════════════
    // 1. Z-AI WEB DEV SDK (GRATIS, sin API key)
    // ═══════════════════════════════════════
    try {
      const ZAI = await import('z-ai-web-dev-sdk').then(m => m.default);
      const zai = await ZAI.create();
      
      const numImages = Math.min(Math.max(n || 1, 1), 4);
      const images: Array<{ base64: string; url: string }> = [];

      for (let i = 0; i < numImages; i++) {
        const response = await zai.images.generations.create({
          prompt: enhancedPrompt,
          size: imageSize as any,
        });

        if (response.data?.[0]?.base64) {
          images.push({
            base64: response.data[0].base64,
            url: `data:image/png;base64,${response.data[0].base64}`,
          });
        }
      }

      if (images.length > 0) {
        console.log(`[Nexa Image] ✅ Generated ${images.length} image(s) via z-ai SDK`);
        return NextResponse.json({
          success: true,
          provider: 'z-ai-sdk',
          prompt: enhancedPrompt,
          size: imageSize,
          style: style || 'default',
          images,
          count: images.length,
        }, { headers: corsHeaders });
      }
    } catch (sdkError: any) {
      console.log(`[Nexa Image] z-ai SDK failed: ${sdkError.message}, trying Pollinations...`);
    }

    // ═══════════════════════════════════════
    // 2. POLLINATIONS.AI FALLBACK (100% GRATIS)
    // ═══════════════════════════════════════
    try {
      const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(enhancedPrompt)}?width=${imageSize.split('x')[0]}&height=${imageSize.split('x')[1]}&nologo=true&enhance=true`;
      
      const pollRes = await fetch(pollinationsUrl, {
        signal: AbortSignal.timeout(60000),
      });

      if (pollRes.ok) {
        const arrayBuffer = await pollRes.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString('base64');
        
        console.log(`[Nexa Image] ✅ Generated image via Pollinations.ai`);
        return NextResponse.json({
          success: true,
          provider: 'pollinations',
          prompt: enhancedPrompt,
          size: imageSize,
          style: style || 'default',
          images: [{
            base64,
            url: `data:image/png;base64,${base64}`,
          }],
          count: 1,
        }, { headers: corsHeaders });
      }
    } catch (pollError: any) {
      console.log(`[Nexa Image] Pollinations failed: ${pollError.message}`);
    }

    // ═══════════════════════════════════════
    // 3. OPENAI DALL-E FALLBACK (requiere API key)
    // ═══════════════════════════════════════
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      try {
        const dallERes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: 'dall-e-3',
            prompt: enhancedPrompt,
            n: 1,
            size: imageSize === '1024x1024' ? '1024x1024' : '1024x1792',
            quality: 'hd',
            response_format: 'b64_json',
          }),
          signal: AbortSignal.timeout(60000),
        });

        if (dallERes.ok) {
          const data = await dallERes.json();
          if (data.data?.[0]?.b64_json) {
            console.log(`[Nexa Image] ✅ Generated image via DALL-E 3`);
            return NextResponse.json({
              success: true,
              provider: 'dall-e-3',
              prompt: enhancedPrompt,
              size: imageSize,
              style: style || 'default',
              images: [{
                base64: data.data[0].b64_json,
                url: `data:image/png;base64,${data.data[0].b64_json}`,
              }],
              count: 1,
            }, { headers: corsHeaders });
          }
          // Fallback to URL format
          if (data.data?.[0]?.url) {
            console.log(`[Nexa Image] ✅ Generated image via DALL-E 3 (URL)`);
            return NextResponse.json({
              success: true,
              provider: 'dall-e-3',
              prompt: enhancedPrompt,
              size: imageSize,
              style: style || 'default',
              images: [{ base64: '', url: data.data[0].url }],
              count: 1,
            }, { headers: corsHeaders });
          }
        }
      } catch (dallEError: any) {
        console.log(`[Nexa Image] DALL-E failed: ${dallEError.message}`);
      }
    }

    // All providers failed
    return NextResponse.json({
      error: 'No se pudo generar la imagen. Todos los proveedores fallaron.',
      hint: 'z-ai SDK y Pollinations.ai no disponibles temporalmente.',
    }, { status: 503, headers: corsHeaders });

  } catch (error: any) {
    console.error('[Nexa Image] Error:', error.message);
    return NextResponse.json(
      { error: `Error interno: ${error.message}` },
      { status: 500, headers: corsHeaders }
    );
  }
}

/**
 * GET /api/image — Service info & health check
 */
export async function GET() {
  let sdkStatus = 'unavailable';
  try {
    await import('z-ai-web-dev-sdk');
    sdkStatus = 'available';
  } catch { sdkStatus = 'not_installed'; }

  return NextResponse.json({
    service: 'NEXA Image Generation API',
    version: '2.0.0',
    providers: [
      { id: 'z-ai-sdk', name: 'Z-AI Cloud SDK', free: true, requiresApiKey: false, status: sdkStatus },
      { id: 'pollinations', name: 'Pollinations.ai', free: true, requiresApiKey: false, status: 'available' },
      { id: 'dall-e-3', name: 'OpenAI DALL-E 3', free: false, requiresApiKey: true, status: process.env.OPENAI_API_KEY ? 'configured' : 'no_key' },
    ],
    sizes: ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440'],
    styles: ['default', 'cinematic', 'anime', 'realistic', 'fantasy', 'artistic', '3d', 'minimalist', 'vintage', 'scifi', 'nature'],
    endpoint: 'POST /api/image { prompt, size?, style?, n? }',
  }, { headers: corsHeaders });
}
