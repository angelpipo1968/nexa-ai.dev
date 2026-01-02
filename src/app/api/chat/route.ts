import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText } from 'ai';

export const maxDuration = 30;

// API Key de Google (Gratuita)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyDTj69BUfBSObKmvSU7ij5LIuJ-bbcvuFw';

// Crear instancia del proveedor con la Key explícita
const google = createGoogleGenerativeAI({
    apiKey: GOOGLE_API_KEY,
});

export async function POST(req: Request) {
    const { messages, model } = await req.json();

    // Configuración Base de Google
    // Usamos 'gemini-1.5-pro' para modo experto (GEMINI) y 'gemini-1.5-flash' para modo rápido (NEXA)
    const activeModel = model === 'gemini'
        ? google('gemini-pro-latest')
        : google('gemini-flash-latest');

    const systemPrompt = model === 'gemini'
        ? "Eres Gemini, una IA avanzada y analítica de Google. Tu objetivo es proveer información detallada, precisa y experta. Tienes capacidades de razonamiento profundo."
        : "Eres NEXA, un Sistema Operativo Inteligente con interfaz futurista en español. Tus respuestas son concisas, eficientes, técnicas y con un ligero toque robótico/cyberpunk. Prefieres listas cortas y datos directos.";

    try {
        const result = streamText({
            model: activeModel,
            messages,
            system: systemPrompt,
        });

        return result.toTextStreamResponse();
    } catch (error: any) {
        console.error("Google Gemini API Error:", error);

        // Extraer mensaje de error específico
        const errorMessage = error?.message || error?.toString() || "Error desconocido";
        const isAuthError = errorMessage.includes("API key") || errorMessage.includes("401");
        const isQuotaError = errorMessage.includes("429") || errorMessage.includes("quota");

        let clientError = "Error en conexión Google AI.";
        if (isAuthError) clientError = "Error: API Key de Google no válida o expirada.";
        if (isQuotaError) clientError = "Error: Cuota de Google AI excedida (429).";

        return new Response(JSON.stringify({ error: clientError, details: errorMessage }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
