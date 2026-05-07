import './env';
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { memoryManager } from '@nexa/memory'
import embeddingsRoute from './routes/embeddings'
import aiRoute from './routes/ai'
import { safetyFilter } from '@nexa/core'
import { securityMiddleware } from './middleware/security'
import { ToolOrchestrator } from '@nexa/tools'
import { ModelRouter } from '@nexa/models'
import { NexaWritingStudio } from '@nexa/writing'
import { RealTimeMetrics } from './metrics'
import { nexaLocalBridge } from './services/NexaLocalBridge'
import { EvolutionDaemon } from './services/EvolutionDaemon'

const app = new Hono()

// Services
const toolOrchestrator = new ToolOrchestrator();
const modelRouter = new ModelRouter();
const studio = new NexaWritingStudio();
const evolutionDaemon = new EvolutionDaemon(toolOrchestrator);

if (process.env.ENABLE_AUTO_EVOLUTION === 'true') {
    evolutionDaemon.start(60);
}

app.use('/*', cors())
app.use('/api/*', securityMiddleware())

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Nexa API',
    version: '1.0.0',
    status: 'running',
    endpoints: ['/api/health', '/api/chat', '/api/tools/execute', '/api/models/switch', '/api/admin/metrics']
  })
})

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Models Endpoint
app.get('/api/models', async (c) => {
  const models = await modelRouter.getAvailableModels('vscode-user');
  return c.json({ models })
})

// Chat Endpoint
app.get('/api/chat', (c) => {
  return c.json({ status: 'ok', message: 'Chat endpoint is ready for POST requests.' })
})

app.post('/api/chat', async (c) => {
  console.log('📬 [API]: Recibida petición de chat!');
  const body = await c.req.json()
  const { message, userId, context, deepDint, searching } = body

  // 1. Safety Check (Pre-LLM)
  const safety = await safetyFilter.validate(message)
  if (!safety.allowed) {
    return c.json({ error: 'Safety violation', reason: safety.reason }, 400)
  }

  // 2. Memory Retrieval (Safe Mode)
  let userMemory: { recent: any[], similar: any[] } = { recent: [], similar: [] };
  try {
    userMemory = await memoryManager.retrieve(userId, message)
  } catch (dbError) {
    console.warn('[DB-OFFLINE]: Continuing without memory context.');
  }

  // 3. Model Routing
  let text = '';
  let responseMetadata = {};

  if (deepDint) {
    const thought = await studio.deepThinker.think(
      message,
      'deepseek-r1:8b',
      [...(context || []), ...userMemory.recent, ...userMemory.similar]
    );
    text = thought.insights.join('\n\n');
    responseMetadata = { deepDint: true, model: 'deepseek-r1:8b' };
  } else {
    let priority = body.priority || 'balanced';
    if (searching) priority = 'precise';

    const response = await modelRouter.route({
      userId,
      message,
      context: [...(context || []), ...userMemory.recent, ...userMemory.similar],
      priority
    });
    text = response.text;
    responseMetadata = {
      model: response.modelId || 'routed-model',
      latency: response.latency,
      cost: response.cost,
      deepDint: false
    };
  }

  // 4. Memory Update (Non-blocking)
  try {
    await memoryManager.update(userId, { query: message, response: text })
  } catch (memError) {
    console.warn('[MEMORY-ERROR]: Failed to update user memory.', memError);
  }

  return c.json({
    response: text,
    metadata: {
      ...responseMetadata,
      searching: !!searching
    }
  })
})

// Tools Execution Endpoint
app.post('/api/tools/execute', async (c) => {
  const body = await c.req.json();
  const { tool, params, userId } = body;

  try {
    const result = await toolOrchestrator.execute(tool, params, { userId });
    return c.json({ success: true, result });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// List All Available Tools (including dynamic MCP tools)
app.get('/api/tools/list', (c) => {
  const tools = toolOrchestrator.getToolsDefinitions();
  return c.json({ success: true, tools });
});

// Model Switching Endpoint
app.post('/api/models/switch', async (c) => {
  const body = await c.req.json();
  const { userId, modelId, reason } = body;

  try {
    const mockSession = { id: 'current', userId, model: { id: 'old' } as any, context: [] };
    const result = await modelRouter.switchModel(mockSession, modelId, reason);
    return c.json({ success: true, result });
  } catch (e: any) {
    return c.json({ success: false, error: e.message }, 500);
  }
});

// --- Local Core Control (Nexa SDK integration) ---
app.get('/api/local/status', (c) => {
  const id = c.req.query('id') || 'llm';
  return c.json({ success: true, id, ...nexaLocalBridge.getStatus(id) });
});

app.post('/api/local/start', async (c) => {
  const { id = 'llm', modelId, port = 3002 } = await c.req.json();
  nexaLocalBridge.start(id, modelId, port);
  return c.json({ success: true, message: `Starting ${id} core with ${modelId}...` });
});

app.post('/api/local/stop', async (c) => {
  const { id = 'llm' } = await c.req.json();
  nexaLocalBridge.stop(id);
  return c.json({ success: true, message: `Stopping ${id} core...` });
});

app.post('/api/local/vision/analyze', async (c) => {
  const { prompt = "Describe what is on the screen" } = await c.req.json();

  try {
    // 1. Capture screen
    const { execSync } = await import('node:child_process');
    execSync('powershell -ExecutionPolicy Bypass -File c:\\nexa\\scripts\\capture.ps1');

    // 2. Read image
    const { readFileSync } = await import('node:fs');
    const imageBase64 = readFileSync('c:\\nexa\\temp\\screen.png', 'base64');

    // 3. Call local VLM server (port 3003)
    const response = await fetch('http://localhost:3003/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "qwen-vl", // SDK mapping
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    return c.json({ success: true, analysis: data.choices[0].message.content });

  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/api/local/voice/process', async (c) => {
  try {
    const { execSync } = await import('node:child_process');
    const { readFileSync } = await import('node:fs');
    
    // 1. Record audio (5s)
    execSync('powershell -ExecutionPolicy Bypass -File c:\\nexa\\scripts\\record_audio.ps1');

    // 2. Read and convert to base64
    const audioBase64 = readFileSync('c:\\nexa\\temp\\voice.wav', 'base64');

    // 3. Process with Gemini (Vision/Audio capability)
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY;
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Transcibe este audio y responde de forma breve." },
            { inline_data: { mime_type: "audio/wav", data: audioBase64 } }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "No se pudo transcribir el audio.";

    return c.json({ success: true, text });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/api/local/system/focus', async (c) => {
  const { enabled } = await c.req.json();
  try {
    const { execSync } = await import('node:child_process');
    const value = enabled ? 0 : 1;
    const psCmd = `Set-ItemProperty -Path "HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Notifications\\Settings" -Name "NOC_GLOBAL_SETTING_TOASTS_ENABLED" -Value ${value}`;
    execSync(`powershell -ExecutionPolicy Bypass -Command "${psCmd}"`);
    return c.json({ success: true, focusMode: enabled });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/api/admin/evolution/start', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const interval = body.interval || 10;
    evolutionDaemon.start(interval);
    return c.json({ success: true, message: `Evolution daemon started with ${interval}m interval.` });
});

app.post('/api/admin/evolution/stop', (c) => {
    evolutionDaemon.stop();
    return c.json({ success: true, message: 'Evolution daemon stopped.' });
});

// Admin Metrics Endpoint
app.get('/api/admin/metrics', async (c) => {
  const metrics = await RealTimeMetrics.getAll();
  return c.json({
    ...metrics,
    activeUsers: 1, // Local mode
    rpm: 0,
    errorRate: 0,
  });
});

// Performance Metrics Endpoint
app.get('/api/metrics/performance', async (c) => {
  const metrics = await modelRouter.getMetrics();
  return c.json(metrics);
});

// Writing Studio: Complete Flow
app.post('/api/studio/complete', async (c) => {
  const body = await c.req.json();
  const { idea, options } = body;

  const result = await studio.createCompleteBook(idea);
  return c.json(result);
});

app.route('/', embeddingsRoute)
app.route('/', aiRoute)

const port = parseInt(process.env.PORT || '3001');
console.log(`Server is running on port ${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0'
})
