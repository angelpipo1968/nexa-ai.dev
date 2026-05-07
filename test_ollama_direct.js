
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function test() {
    console.log("🧪 Iniciando prueba de conexión a Ollama...");
    try {
        const res = await fetch('http://127.0.0.1:11434/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama3.2:3b',
                messages: [{ role: 'user', content: 'Di: CONEXIÓN EXITOSA' }],
                stream: false
            })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        console.log("✅ RESPUESTA RECIBIDA:");
        console.log("-----------------------");
        console.log(data.message.content);
        console.log("-----------------------");
    } catch (e) {
        console.error("❌ ERROR EN LA PRUEBA:", e.message);
    }
}

test();
