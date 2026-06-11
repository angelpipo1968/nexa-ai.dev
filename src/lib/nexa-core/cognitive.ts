import { logger } from './logger';

// Ollama (primary — siempre disponible localmente)
const OLLAMA_URL = process.env.OLLAMA_HOST_URL || 'http://127.0.0.1:11434';
const OLLAMA_API_URL = `${OLLAMA_URL}/v1/chat/completions`;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-32b-instruct-nexa:latest';

// LiteLLM (fallback opcional)
const LITELLM_URL = process.env.AGENT_GATEWAY_V3_LITELLM_URL || 'http://127.0.0.1:4000/v1/chat/completions';
const LITELLM_KEY = process.env.AGENT_GATEWAY_V3_LITELLM_KEY || 'sk-nexa-master-3090';
const MODEL = process.env.AGENT_GATEWAY_V3_MODEL || OLLAMA_MODEL;
const REQUEST_TIMEOUT_MS = parseInt(process.env.AGENT_GATEWAY_V3_TIMEOUT_S || '90', 10) * 1000;

const BASE_BEHAVIOR =
    "Eres un agente determinista de Nexa. " +
    "Responde siempre en español, de forma breve y clara, salvo que el usuario pida otro idioma. " +
    "Si el usuario pide una salida literal corta, por ejemplo 'di ok', devuelve exactamente esa salida y nada más.";

export async function callLLM(systemPrompt: string, userContent: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // 1. Intentar Ollama (primario)
    try {
        const response = await fetch(OLLAMA_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ],
                stream: false
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return data.choices?.[0]?.message?.content?.trim() || "";
        }
        const body = await response.text();
        logger.warn(`Ollama devolvió HTTP ${response.status}: ${body}. Intentando LiteLLM...`, 'cognitive');
    } catch (e: any) {
        clearTimeout(timeoutId);
        logger.warn(`Ollama falló: ${e.message}. Intentando LiteLLM...`, 'cognitive');
    }

    // 2. Fallback a LiteLLM
    try {
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), REQUEST_TIMEOUT_MS);
        const response = await fetch(LITELLM_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LITELLM_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userContent }
                ]
            }),
            signal: controller2.signal
        });
        clearTimeout(timeoutId2);
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`LiteLLM devolvió HTTP ${response.status}: ${body}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (e: any) {
        logger.error(`Error en callLLM (Ollama + LiteLLM fallidos): ${e.message}`, 'cognitive');
        throw e;
    }
}

export async function callNexaLLM(systemPrompt: string, userContent: string, jsonMode: boolean = false): Promise<string> {
    const groqKey = process.env.GROQ_API_KEY;
    const isGroqValid = groqKey && !groqKey.startsWith('tu_') && groqKey.length > 10;
    
    if (isGroqValid) {
        try {
            const body: any = {
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.1
            };
            if (jsonMode) {
                body.response_format = { type: "json_object" };
            }
            const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${groqKey}` 
                },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                const data = await res.json();
                return data.choices?.[0]?.message?.content?.trim() || "";
            }
            const errBody = await res.text().catch(() => '');
            logger.warn(`Groq API returned HTTP ${res.status}: ${errBody}. Falling back to local LiteLLM.`, 'cognitive');
        } catch (e: any) {
            logger.warn(`Groq call failed: ${e.message}. Falling back to local LiteLLM.`, 'cognitive');
        }
    }

    // Fallback/Default: Local LiteLLM
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const body: any = {
            model: MODEL,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userContent }
            ],
            temperature: 0.1
        };
        if (jsonMode) {
            body.response_format = { type: "json_object" };
        }

        const response = await fetch(LITELLM_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${LITELLM_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const bodyText = await response.text();
            throw new Error(`Litellm devolvió HTTP ${response.status}: ${bodyText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content?.trim() || "";
    } catch (e: any) {
        logger.error(`Error in local LLM fallback (callNexaLLM): ${e.message}`, 'cognitive');
        throw e;
    }
}

export async function* runCognitiveLoop(message: string, context: string = ""): AsyncGenerator<string, { plan: string, response: string }, unknown> {
    yield JSON.stringify({ type: 'status', text: '🧠 Analizando la tarea (Planner)...', provider: 'nexa-brain' });
    
    // 1. Planner
    const plannerPrompt = `${BASE_BEHAVIOR} Actúas como planner. Devuelve solo pasos breves. Si la petición es trivial o pide una salida literal corta, indica responder directamente.`;
    const plan = await callLLM(plannerPrompt, message);

    yield JSON.stringify({ type: 'status', text: '⚡ Ejecutando plan (Executor)...', provider: 'nexa-brain' });

    // 2. Executor
    const executorPrompt = `${BASE_BEHAVIOR} Actúas como executor. Sigue el plan y responde con precisión, sin relleno. Usa el contexto proporcionado si es útil.`;
    const executorContent = `PLAN:\n${plan}\n\nCONTEXTO:\n${context}\n\nINPUT:\n${message}`;
    const result = await callLLM(executorPrompt, executorContent);

    yield JSON.stringify({ type: 'status', text: '🔍 Refinando respuesta (Critic)...', provider: 'nexa-brain' });

    // 3. Critic
    const criticPrompt = `${BASE_BEHAVIOR} Actúas como critic. Mejora la respuesta manteniéndola breve, correcta y coherente.`;
    const finalResponse = await callLLM(criticPrompt, result);

    // Stream final response words to mimic streaming
    const words = finalResponse.split(/(\s+)/);
    for (const word of words) {
        if (word.length > 0) {
            yield JSON.stringify({ text: word, provider: 'nexa-brain' });
        }
    }

    return { plan, response: finalResponse };
}
