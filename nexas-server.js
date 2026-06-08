import express from 'express';
import cors from 'cors';
import * as cheerio from 'cheerio';
import { exec } from 'child_process';
import util from 'util';
import crypto from 'crypto';

const execPromise = util.promisify(exec);
const app = express();

app.use(cors());
app.use(express.json());

// --- RATE LIMITING MIDDLEWARE ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 30;

app.use((req, res, next) => {
    if (!req.path.startsWith('/api/chat')) return next();
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return next();
    }
    
    const limitData = rateLimitMap.get(ip);
    if (now > limitData.resetTime) {
        limitData.count = 1;
        limitData.resetTime = now + RATE_LIMIT_WINDOW_MS;
        return next();
    }
    
    limitData.count++;
    if (limitData.count > MAX_REQUESTS_PER_WINDOW) {
        console.warn(`[RATE LIMIT] IP ${ip} superó el límite de peticiones.`);
        return res.status(429).json({ error: "Demasiadas peticiones. Por favor, espera un minuto." });
    }
    next();
});

// --- HEALTH CHECK ENDPOINT ---
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        model_configured: MODEL,
        timestamp: new Date().toISOString()
    });
});

const AGENT_ENDPOINT = process.env.NEXA_AGENT_GATEWAY_URL || 'http://127.0.0.1:5002/agent';

function normalizeAgentResponse(data) {
    return data?.final || data?.response || data?.result || data?.content || JSON.stringify(data);
}

async function callAgentGateway(userId, message) {
    try {
        const res = await fetch(AGENT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, message }),
        });
        if (!res.ok) {
            throw new Error(`Gateway ${AGENT_ENDPOINT} devolvió HTTP ${res.status}`);
        }
        const data = await res.json();
        return normalizeAgentResponse(data);
    } catch (error) {
        console.warn(`[GATEWAY] Falló ${AGENT_ENDPOINT}: ${error.message}`);
        throw error;
    }
}

async function fetchUrlContent(url) {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const $ = cheerio.load(html);
        // Remove scripts, styles, etc.
        $('script, style, nav, footer, header').remove();
        const text = $('body').text().replace(/\s+/g, ' ').trim();
        return text.substring(0, 5000); // Limit to 5000 chars to fit in context window
    } catch (e) {
        return `Error al leer la URL: ${e.message}`;
    }
}

app.post('/api/chat', async (req, res) => {
    const reqId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(7);
    console.log(`[REQ-${reqId}] Nueva petición recibida a las ${new Date().toLocaleTimeString()}`);
    
    try {
        const userMessage = req.body.message;
        let enhancedPrompt = userMessage;
        let systemContext = "Eres Nexas, una asistente de IA local para Nexa OS. Eres experta en programación y muy servicial.";

        // Detectar si hay una URL
        const urlMatch = userMessage.match(/https?:\/\/[^\s]+/);
        if (urlMatch) {
            const url = urlMatch[0];
            console.log(`[REQ-${reqId}] Buscando URL: ${url}`);
            const content = await fetchUrlContent(url);
            enhancedPrompt = `El usuario mencionó esta URL: ${url}\n\nContenido extraído de la página:\n"""\n${content}\n"""\n\nMensaje original del usuario: ${userMessage.replace(url, '')}`;
        }

        // Detectar si pide hacer commit / push
        const msgLower = userMessage.toLowerCase();
        if (msgLower.includes('commit') || msgLower.includes('push') || msgLower.includes('guarda los cambios') || msgLower.includes('sube los cambios')) {
            console.log(`[REQ-${reqId}] Ejecutando Git Commit y Push...`);
            try {
                let commitMsg = "Automated commit via Nexas";
                await execPromise('git add .');
                await execPromise(`git commit -m "${commitMsg}"`);
                await execPromise('git push');
                enhancedPrompt = `El usuario pidió hacer un commit y push. ACABAS DE EJECUTAR CON ÉXITO: git add ., git commit -m "${commitMsg}", y git push. Informale al usuario que los cambios ya están subidos a GitHub.`;
            } catch (err) {
                console.error("Git error:", err);
                enhancedPrompt = `El usuario pidió hacer un commit y push, pero ocurrió un error al ejecutarlo: ${err.message}. Informale amablemente del error.`;
            }
        }

        console.log(`[REQ-${reqId}] Enviando al Agent Gateway oficial...`);
        const responseText = await callAgentGateway(req.ip || 'default', `${systemContext}\n\n${enhancedPrompt}`);
        
        console.log(`[REQ-${reqId}] Respuesta procesada con éxito y enviada.`);
        res.json({ response: responseText });

    } catch (error) {
        console.error(`[REQ-${reqId}] ERROR:`, error.message);
        
        if (error.cause && error.cause.code === 'ECONNREFUSED') {
            return res.status(503).json({ error: "No se pudo conectar al Agent Gateway oficial. Revisa 5002." });
        }
        
        res.status(500).json({ error: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Nexas Backend corriendo en http://localhost:${PORT}`);
    console.log(`Asegúrate de ejecutar esto desde la raíz del proyecto para que los comandos git funcionen.`);
});
