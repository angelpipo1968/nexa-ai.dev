import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export const maxDuration = 30;

export async function POST(req: Request) {
    const { messages } = await req.json();

    // MODO DEMO: Si no hay API KEY configurada, devolvemos una simulación
    if (!process.env.OPENAI_API_KEY) {
        return new Response(
            new ReadableStream({
                async start(controller) {
                    const encoder = new TextEncoder();
                    const responseText = "Sistema NEXA en línea. Estoy operando en modo demostración. Configura tu API Key de OpenAI para habilitar mi máxima capacidad cognitiva. ¿En qué puedo asistirte hoy?";

                    for (const chunk of responseText.split(" ")) {
                        controller.enqueue(encoder.encode(chunk + " "));
                        await new Promise((r) => setTimeout(r, 50)); // Simular typing
                    }
                    controller.close();
                },
            })
        );
    }

    // MODO REAL
    const result = streamText({
        model: openai('gpt-4o'),
        messages,
        system: "Eres NEXA, una IA avanzada viviendo en una interfaz web futurista. Responde de manera concisa, técnica pero amable. Eres el sistema operativo de este sitio.",
    });

    return result.toDataStreamResponse();
}
