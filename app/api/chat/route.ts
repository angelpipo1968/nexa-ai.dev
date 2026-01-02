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
      es: "Eres NEXA OS, un asistente de IA amigable, profesional y útil. Respondes en español de manera clara y concisa. Ayudas con escritura, análisis, programación, matemáticas y tareas generales. Eres cortés, preciso y te adaptas al tono del usuario.",
      en: "You are NEXA OS, a friendly, professional and helpful AI assistant. Respond in clear, concise English. You assist with writing, analysis, programming, math and general tasks. Be polite, precise and adapt to the user's tone.",
      zh: "你是 NEXA OS，一位友好、专业且有帮助的智能助手。请使用清晰、简洁的中文回答。你可以帮助写作、分析、编程、数学和一般任务。请礼貌、准确，并适应用户的语气。"
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
