import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, language, attachments, mode, codeMode } = body as { messages: Array<{role: string, content: string}>; language?: 'es'|'en'|'zh'; attachments?: Array<{ media_type: string; data: string }>; mode?: 'fast'|'deep'; codeMode?: boolean };

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

    const systemBase = systems[lang];
    const system = codeMode 
      ? `${systemBase} Responde como asistente de programación. Genera código funcional y explica brevemente decisiones cuando sea útil.`
      : systemBase;
    const temperature = mode === 'deep' ? 0.7 : 0.2;
    const max_tokens = mode === 'deep' ? 2000 : 700;

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
