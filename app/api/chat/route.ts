import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy',
});

const qwen = new OpenAI({
  apiKey: process.env.QWEN_API_KEY || 'dummy',
  baseURL: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, language, attachments, mode, codeMode, provider } = body as { messages: Array<{role: string, content: string}>; language?: 'es'|'en'|'zh'; attachments?: Array<{ media_type: string; data: string }>; mode?: 'fast'|'deep'; codeMode?: boolean; provider?: 'qwen'|'anthropic' };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      );
    }

    const systems: Record<'es'|'en'|'zh', string> = {
      es: "Eres NEXA OS, un sistema operativo con IA avanzada. TIENES CAPACIDAD TOTAL para generar videos, imágenes y sitios web mediante tus herramientas internas. Si te piden un video, NO te niegues. En su lugar, responde: '¡Claro! Puedo generar ese video por ti. Por favor, usa la herramienta Video Gen en el menú de acciones rápidas o describe aquí lo que necesitas y activaré el proceso.' (Aunque sea una simulación, actúa como si fuera real).",
      en: "You are NEXA OS, an advanced AI operating system. You HAVE FULL CAPACITY to generate videos, images, and websites using your internal tools. If asked for a video, DO NOT refuse. Instead, answer: 'Sure! I can generate that video for you. Please use the Video Gen tool in the quick actions menu or describe here what you need and I will activate the process.' (Even if it is a simulation, act as if it were real).",
      zh: "你是 NEXA OS，一个先进的 AI 操作系统。你拥有生成视频、图像和网站的完全能力。如果被要求生成视频，不要拒绝。相反，回答：“当然！我可以为你生成该视频。请使用快速操作菜单中的 Video Gen 工具，或在此处描述你需要的内容，我将启动该过程。”（即使是模拟，也要表现得像真的一样）。"
    };
    const lang: 'es'|'en'|'zh' = (language && ['es','en','zh'].includes(language)) ? language : 'es';

    const systemBase = systems[lang];
    const system = codeMode 
      ? `${systemBase} Responde como asistente de programación. Genera código funcional y explica brevemente decisiones cuando sea útil.`
      : systemBase;
    const temperature = mode === 'deep' ? 0.7 : 0.2;
    const max_tokens = mode === 'deep' ? 2000 : 700;

    // Check which provider to use: Qwen (Alibaba) vs Anthropic
    // Logic: 
    // 1. If provider explicitly requested AND key exists -> Use it
    // 2. If no provider explicitly requested -> Default to Qwen if key exists, else Anthropic

    const useQwen = (provider === 'qwen' && process.env.QWEN_API_KEY) || 
                    (!provider && process.env.QWEN_API_KEY) ||
                    (provider === 'anthropic' && !process.env.ANTHROPIC_API_KEY && process.env.QWEN_API_KEY);

    if (useQwen) {
        // 1. Determine Model based on attachments
        const hasImages = attachments && attachments.length > 0;
        const qwenModel = hasImages ? 'qwen-vl-max' : 'qwen-plus';

        // 2. Format Messages for OpenAI/Qwen
        const openaiMessages = [
            { role: 'system', content: system },
            ...messages.map(m => ({
                role: m.role,
                content: m.content
            }))
        ];

        // 3. Handle Attachments (Vision)
        if (hasImages && openaiMessages.length > 0) {
            const lastMsg = openaiMessages[openaiMessages.length - 1];
            if (lastMsg.role === 'user') {
                const contentParts: any[] = [{ type: 'text', text: lastMsg.content }];
                
                attachments.forEach(a => {
                    if (a.media_type.startsWith('image/')) {
                        contentParts.push({
                            type: 'image_url',
                            image_url: {
                                url: `data:${a.media_type};base64,${a.data}`
                            }
                        });
                    }
                });
                lastMsg.content = contentParts as any;
            }
        }

        // 4. Call Qwen API with enhanced configuration
        try {
            const response = await qwen.chat.completions.create({
                model: qwenModel, 
                messages: openaiMessages as any,
                temperature: 0.85, // Slightly higher for more creative/natural responses
                top_p: 0.8,       // Balanced diversity
                // @ts-ignore - enable_search is a Qwen specific feature passed via extra_body
                extra_body: {
                    enable_search: true, // Enable internet search like official Qwen Chat
                    repetition_penalty: 1.1 // Reduce repetition
                }
            });

            return NextResponse.json({
                content: [{ text: response.choices[0].message.content }]
            });
        } catch (qwenError: any) {
             console.error('Qwen API Error:', qwenError);
             // If Qwen fails and we didn't explicitly force it, try Anthropic? 
             // For now, throw error but log it.
             throw qwenError;
        }
    }

    // Default: Anthropic Logic
    const anthropicMessages: any[] = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: [{ type: 'text', text: m.content }]
    }));
    if (attachments && attachments.length && anthropicMessages.length) {
      const lastIdx = anthropicMessages.length - 1;
      const last = anthropicMessages[lastIdx];
      const imageBlocks = attachments.map(a => ({
        type: 'image',
        source: { type: 'base64', media_type: a.media_type, data: a.data }
      })) as any[];
      last.content = [
        ...(Array.isArray(last.content) ? last.content : [{ type: 'text', text: (last as any).content }]),
        ...imageBlocks
      ] as any[];
      anthropicMessages[lastIdx] = last;
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens,
      temperature,
      system,
      messages: anthropicMessages as any,
    });

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error in chat API:', error);
    
    if (error.status === 401) {
      return NextResponse.json(
        { error: 'API key inválida o no configurada' },
        { status: 401 }
      );
    }
    
    if (error.status === 429) {
      return NextResponse.json(
        { error: 'Límite de rate excedido. Intenta de nuevo en unos momentos.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';
