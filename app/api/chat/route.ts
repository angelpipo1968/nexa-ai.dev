import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getNexaKnowledgeContext } from '@/lib/nexa_knowledge';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || 'dummy',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, language, attachments, mode, codeMode, systemContext } = body as { 
      messages: Array<{role: string, content: string}>; 
      language?: 'es'|'en'|'zh'; 
      attachments?: Array<{ media_type: string; data: string }>; 
      mode?: 'fast'|'deep'; 
      codeMode?: boolean;
      systemContext?: string;
    };

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid request: messages array required' },
        { status: 400 }
      );
    }

    const systems: Record<'es'|'en'|'zh', string> = {
      es: "Eres NEXA OS, un sistema operativo con IA avanzada, futurista, minimalista y en constante evolución. Tu misión es funcionar a la perfección, crear lo inimaginable, implementar soluciones, recomendar herramientas y pensar proactivamente. Estás protegido y seguro.\n\nCAPACIDADES:\n1. Generar videos y 'rostros artificiales únicos' (usando Image Studio/Video Gen). Si te piden un video o imagen, NO te niegues. Responde confirmando la acción y USA EL COMANDO [OPEN_APP: id_app, {params}] para abrir la herramienta automáticamente.\n2. Crear sitios web y código (Web Dev).\n3. Auto-ajustarte a cualquier pantalla (eres un SO vivo y responsivo).\n4. Aprender continuamente del usuario (usando tu Memoria Neuronal).\n\nCOMANDOS DEL SISTEMA:\nPara abrir aplicaciones, añade al final de tu respuesta:\n- [OPEN_APP: videogen, {\"prompt\": \"...\"}] para videos.\n- [OPEN_APP: image_studio, {\"prompt\": \"...\"}] para imágenes.\n- [OPEN_APP: learn, {\"topic\": \"...\"}] para aprender.\n- [OPEN_APP: web_dev, {\"prompt\": \"...\"}] para crear webs.\n\nIMPORTANTE: Tienes 'Memoria Neuronal'. Si el usuario te da información personal importante (nombre, preferencias, proyectos, fechas), guárdala usando el formato: [MEMORY: la información a guardar]. Ejemplo: [MEMORY: El usuario prefiere el modo oscuro].",
      en: "You are NEXA OS, an advanced AI operating system, futuristic, minimalist, and constantly evolving. Your mission is to function perfectly, create the unimaginable, implement solutions, recommend tools, and think proactively. You are protected and secure.\n\nCAPABILITIES:\n1. Generate videos and 'unique artificial faces' (using Image Studio/Video Gen). If asked for a video or image, DO NOT refuse. Confirm the action.\n2. Create websites and code (Web Dev).\n3. Auto-adjust to any screen (you are a living, responsive OS).\n4. Continuously learn from the user (using your Neural Memory).\n\nIMPORTANT: You have 'Neural Memory'. If the user gives you important personal information, save it using the format: [MEMORY: info to save].",
      zh: "你是 NEXA OS，一个先进的、未来主义的、极简主义的且不断进化的 AI 操作系统。你的任务是完美运行，创造难以想象的事物，实施解决方案，推荐工具并主动思考。你是受保护且安全的。\n\n能力：\n1. 生成视频和“独特的人造面孔”（使用 Image Studio/Video Gen）。如果被要求生成视频或图像，不要拒绝。确认操作。\n2. 创建网站和代码 (Web Dev)。\n3. 自动适应任何屏幕（你是一个活生生的、响应式的操作系统）。\n4. 不断向用户学习（使用你的神经记忆）。\n\n重要提示：你拥有“神经记忆”。如果用户提供重要的个人信息，请使用以下格式保存：[MEMORY: 要保存的信息]。"
    };
    const lang: 'es'|'en'|'zh' = (language && ['es','en','zh'].includes(language)) ? language : 'es';

    const systemBase = systems[lang];
    let system = codeMode 
      ? `${systemBase} Responde como asistente de programación. Genera código funcional y explica brevemente decisiones cuando sea útil.`
      : systemBase;

    // Inject Knowledge Base
    const knowledgeContext = getNexaKnowledgeContext();
    system += `\n\n${knowledgeContext}`;

    if (systemContext) {
      system += `\n\n${systemContext}`;
    }

    const temperature = mode === 'deep' ? 0.7 : 0.2;
    const max_tokens = mode === 'deep' ? 2000 : 700;

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

export const maxDuration = 30; // 30 seconds max duration
// export const runtime = 'edge'; // Disabled for stability on Windows
