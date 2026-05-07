const http = require('http');
const path = require('path');

// Load .env from the project root (two levels up from the extension dir)
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const PORT = 3001;

const server = http.createServer(async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (req.method === 'GET' && req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', version: '3.0.0' }));
        return;
    }

    if (req.method === 'GET' && req.url === '/api/models') {
        try {
            const ollamaRes = await fetch('http://127.0.0.1:11434/api/tags').catch(() => null);
            let localModels = [];
            if (ollamaRes && ollamaRes.ok) {
                const ollamaData = await ollamaRes.json();
                localModels = (ollamaData.models || []).map(m => ({
                    id: m.name,
                    name: `${m.name} (Local)`,
                    provider: 'ollama'
                }));
            }
            
            const models = [
                ...localModels,
                { id: 'meta/llama-3.1-405b-instruct', name: 'Nexa Ultra (NVIDIA NIM 405B)', provider: 'nvidia' },
                { id: 'gpt-4o-mini', name: 'Nexa Cloud (OpenAI GPT-4o)', provider: 'openai' },
            ];
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ models }));
        } catch (err) {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ models: [{ id: 'gpt-4o-mini', name: 'Nexa Cloud (Fallback)', provider: 'openai' }] }));
        }
        return;
    }

    if (req.method === 'GET' && req.url === '/api/ollama/models') {
        try {
            const r = await fetch('http://127.0.0.1:11434/api/tags');
            const d = await r.json();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(d));
        } catch (err) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: err.message }));
        }
        return;
    }

    if (req.method === 'POST' && (req.url === '/api/chat' || req.url === '/api/ai')) {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const payload = JSON.parse(body);
                const message = payload.message || (payload.messages && payload.messages[payload.messages.length - 1]?.content) || '';
                const provider = payload.provider || 'auto';
                const modelId = payload.modelId || 'gemini-1.5-flash';

                const SYSTEM = `Eres Nexa Antigravity, el AGENTE PRINCIPAL de inteligencia artificial para este entorno.
Tu misión es ayudar al usuario con tareas de programación y responder en español.`;

                let responseText = '';

                // Fallback Chain Logic
                const tryProvider = async (p, m) => {
                    console.log(`[Nexa Backend] Request for ${p} (${m})...`);
                    
                    if (p === 'ollama') {
                        const r = await fetch('http://127.0.0.1:11434/api/chat', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                model: m || 'nexa-os',
                                messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: message }],
                                stream: false
                            })
                        });
                        if (!r.ok) throw new Error(`Ollama error ${r.status}`);
                        const d = await r.json();
                        return d.message?.content;
                    }

                    if (p === 'google' || p === 'gemini') {
                        const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY;
                        if (!geminiKey) throw new Error("GEMINI_API_KEY no configurada");
                        
                        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m || 'gemini-1.5-flash'}:generateContent?key=${geminiKey}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                system_instruction: { parts: [{ text: SYSTEM }] },
                                contents: [{ role: 'user', parts: [{ text: message }] }]
                            })
                        });
                        if (!r.ok) {
                            const d = await r.json();
                            throw new Error(d.error?.message || `Gemini error ${r.status}`);
                        }
                        const d = await r.json();
                        return d.candidates?.[0]?.content?.parts?.[0]?.text;
                    }

                    if (p === 'nvidia') {
                        const nvidiaKey = process.env.VITE_NVIDIA_API_KEY;
                        if (!nvidiaKey) throw new Error("VITE_NVIDIA_API_KEY no configurada");
                        const r = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${nvidiaKey}` },
                            body: JSON.stringify({
                                model: m || 'meta/llama-3.1-405b-instruct',
                                messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: message }]
                            })
                        });
                        if (!r.ok) throw new Error(`NVIDIA error ${r.status}`);
                        const d = await r.json();
                        return d.choices?.[0]?.message?.content;
                    }

                    // Default to OpenAI/Groq fallback
                    const groqKey = process.env.VITE_GROQ_API_KEY;
                    if (groqKey) {
                        const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
                            body: JSON.stringify({
                                model: 'llama-3.3-70b-versatile',
                                messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: message }]
                            })
                        });
                        if (r.ok) {
                            const d = await r.json();
                            return d.choices?.[0]?.message?.content;
                        }
                    }
                    
                    throw new Error("No se pudo conectar con el proveedor solicitado.");
                };

                // Execution
                try {
                    responseText = await tryProvider(provider, modelId);
                } catch (err) {
                    console.warn(`[Nexa Backend] Falló ${provider}: ${err.message}. Intentando Gemini...`);
                    try {
                        responseText = await tryProvider('google', 'gemini-1.5-flash');
                    } catch (err2) {
                        console.warn(`[Nexa Backend] Falló Gemini. Intentando Ollama Local...`);
                        try {
                            responseText = await tryProvider('ollama', 'nexa-os');
                        } catch (err3) {
                            throw new Error(`Fallo total en todos los proveedores.`);
                        }
                    }
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ response: responseText }));

            } catch (err) {
                console.error('[Nexa Backend] Error crítico:', err.message);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    response: `🔴 **Error de Conexión**\n\nNo se pudo contactar con ningún motor AI.\n\nSugerencia: Asegúrate de que Ollama esté encendido.`,
                    error: true
                }));
            }
        });
        return;
    }

    res.writeHead(404);
    res.end();
});

server.listen(PORT, () => {
    console.log('========================================');
    console.log('🚀 [Nexa Backend] Encendido en puerto', PORT);
    console.log('========================================');
});
