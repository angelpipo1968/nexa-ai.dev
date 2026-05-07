import { Model, ModelResponse, ModelRequest, StreamChunk } from '../types';

export interface ModelProvider {
    id: string;
    getModels(): Model[];
    execute(request: ModelRequest): Promise<ModelResponse>;
    streamExecute(request: ModelRequest): AsyncIterable<StreamChunk>;
}

export class OpenAICompatibleProvider implements ModelProvider {
    constructor(
        public id: string,
        private baseUrl: string,
        private apiKey: string,
        private defaultModel: string,
        private models: Model[]
    ) {}

    getModels(): Model[] {
        return this.models;
    }

    async execute(request: ModelRequest): Promise<ModelResponse> {
        const start = Date.now();
        const modelId = request.requirements?.modelId || this.defaultModel;

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        ...(request.context || []),
                        { role: 'user', content: request.message }
                    ],
                    stream: false
                })
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error?.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return {
                text: data.choices[0].message.content,
                latency: Date.now() - start,
                usage: {
                    promptTokens: data.usage?.prompt_tokens || 0,
                    completionTokens: data.usage?.completion_tokens || 0,
                    totalTokens: data.usage?.total_tokens || 0
                },
                cost: 0
            };
        } catch (error: any) {
            console.error(`[${this.id}] Error:`, error);
            throw new Error(`Error from ${this.id}: ${error.message}`);
        }
    }

    async *streamExecute(request: ModelRequest): AsyncIterable<StreamChunk> {
        const modelId = request.requirements?.modelId || this.defaultModel;

        try {
            const response = await fetch(`${this.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: modelId,
                    messages: [
                        ...(request.context || []),
                        { role: 'user', content: request.message }
                    ],
                    stream: true
                })
            });

            if (!response.ok || !response.body) {
                throw new Error(`HTTP ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.slice(6).trim();
                        if (dataStr === '[DONE]') {
                            yield { text: '', done: true };
                            continue;
                        }

                        try {
                            const data = JSON.parse(dataStr);
                            const content = data.choices[0]?.delta?.content || '';
                            if (content) {
                                yield { text: content, done: false };
                            }
                        } catch (e) {
                            // Skip partial JSON
                        }
                    }
                }
            }
        } catch (error: any) {
            throw error;
        }
    }
}

export class OllamaProvider implements ModelProvider {
    id = 'ollama';
    private baseUrl = 'http://localhost:11434/api';

    getModels(): Model[] {
        return [
            { id: 'nexa-os:latest', name: 'Nexa OS (Fast)', provider: 'ollama', capabilities: { contextLength: 4096, streaming: true, functionCalling: true } },
            { id: 'qwen2.5:3b', name: 'Qwen 2.5 3B', provider: 'ollama', capabilities: { contextLength: 8192, streaming: true, functionCalling: true } },
            { id: 'deepseek-r1:1.5b', name: 'DeepSeek R1 1.5B', provider: 'ollama', capabilities: { contextLength: 16000, streaming: true, functionCalling: false } },
            { id: 'mimo-v2.5-pro:latest', name: 'MiMo V2.5 Pro (1T MoE)', provider: 'ollama', capabilities: { contextLength: 1048576, streaming: true, functionCalling: true } }
        ];
    }

    async refreshModels(): Promise<Model[]> {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout
            const res = await fetch(`${this.baseUrl}/tags`, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await res.json();
            return data.models.map((m: any) => ({
                id: m.name,
                name: m.name.charAt(0).toUpperCase() + m.name.slice(1),
                provider: 'ollama',
                capabilities: { contextLength: 8192, streaming: true, functionCalling: m.name.includes('coder') }
            }));
        } catch (e) {
            return this.getModels();
        }
    }

    async execute(request: ModelRequest): Promise<ModelResponse> {
        const start = Date.now();
        const modelId = request.requirements?.modelId || 'nexa-os:latest';
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelId,
                    messages: (request.context || []).map(m => {
                        const content = Array.isArray(m.parts) 
                            ? m.parts.map((p: any) => p.text || '').join(' ')
                            : (typeof m.parts === 'string' ? m.parts : '');
                        return {
                            role: m.role === 'model' ? 'assistant' : (m.role || 'user'),
                            content: content.trim() || ' '
                        };
                    }).concat([{ role: 'user', content: request.message }]),
                    stream: false,
                    options: { num_ctx: 4096 }
                })
            });
            const data = await response.json();
            return {
                text: data.message.content,
                latency: Date.now() - start,
                usage: {
                    promptTokens: data.prompt_eval_count || 0,
                    completionTokens: data.eval_count || 0,
                    totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
                },
                cost: 0
            };
        } catch (error: any) {
            throw new Error(`Ollama Error: ${error.message}`);
        }
    }

    async *streamExecute(request: ModelRequest): AsyncIterable<StreamChunk> {
        const modelId = request.requirements?.modelId || 'nexa-os:latest';
        try {
            const response = await fetch(`${this.baseUrl}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: modelId,
                    messages: (request.context || []).map(m => {
                        const content = Array.isArray(m.parts) 
                            ? m.parts.map((p: any) => p.text || '').join(' ')
                            : (typeof m.parts === 'string' ? m.parts : '');
                        return {
                            role: m.role === 'model' ? 'assistant' : (m.role || 'user'),
                            content: content.trim() || ' '
                        };
                    }).concat([{ role: 'user', content: request.message }]),
                    stream: true
                })
            });

            if (!response.body) return;
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const lines = decoder.decode(value).split('\n');
                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const json = JSON.parse(line);
                        if (json.message?.content) yield { text: json.message.content, done: false };
                        if (json.done) yield { text: '', done: true };
                    } catch (e) {}
                }
            }
        } catch (e: any) {
            throw e;
        }
    }
}

export class GeminiProvider implements ModelProvider {
    id = 'gemini';
    constructor(private apiKey: string, private defaultModel: string) {}

    getModels(): Model[] {
        return [
            { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', provider: 'gemini', capabilities: { contextLength: 1000000, streaming: true, functionCalling: true } },
            { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash (Futuristic)', provider: 'gemini', capabilities: { contextLength: 1000000, streaming: true, functionCalling: true } },
            { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', provider: 'gemini', capabilities: { contextLength: 2000000, streaming: true, functionCalling: true } },
            { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', provider: 'gemini', capabilities: { contextLength: 1000000, streaming: true, functionCalling: true } }
        ];
    }

    async execute(request: ModelRequest): Promise<ModelResponse> {
        const start = Date.now();
        const modelId = request.requirements?.modelId || this.defaultModel;
        
        // Try v1 first, fallback to v1beta if needed
        const tryFetch = async (version: string, model: string) => {
            const parts: any[] = [{ text: request.message }];
            if ((request as any).audio) {
                parts.push({ inline_data: { mime_type: 'audio/wav', data: (request as any).audio } });
            }

            const response = await fetch(`https://generativelanguage.googleapis.com/${version}/models/${model}:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: (request.context || []).concat([{ role: 'user', parts }]),
                    generationConfig: { maxOutputTokens: 2048 }
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);
            return data;
        };

        try {
            let data;
            try {
                // Try v1 with requested model
                data = await tryFetch('v1', modelId);
            } catch (e1: any) {
                console.warn(`[Gemini] v1 failed for ${modelId}, trying v1beta...`);
                try {
                    data = await tryFetch('v1beta', modelId);
                } catch (e2: any) {
                    console.warn(`[Gemini] v1beta failed for ${modelId}, trying flash fallback...`);
                    data = await tryFetch('v1', 'gemini-1.5-flash');
                }
            }

            return {
                text: data.candidates[0].content.parts[0].text,
                latency: Date.now() - start,
                cost: 0
            };
        } catch (e: any) {
            throw new Error(`Gemini Error Total: ${e.message}`);
        }
    }

    async *streamExecute(request: ModelRequest): AsyncIterable<StreamChunk> {
        const res = await this.execute(request);
        yield { text: res.text, done: true };
    }
}

export class AnthropicProvider implements ModelProvider {
    id = 'anthropic';
    constructor(
        private apiKey: string,
        private defaultModel: string,
        private models: Model[]
    ) {}

    getModels(): Model[] { return this.models; }

    async execute(request: ModelRequest): Promise<ModelResponse> {
        const start = Date.now();
        const modelId = request.requirements?.modelId || this.defaultModel;

        try {
            const response = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.apiKey,
                    'anthropic-version': '2023-06-01'
                },
                body: JSON.stringify({
                    model: modelId,
                    max_tokens: 1024,
                    messages: [
                        ...(request.context || []).map((m: any) => {
                            const content = Array.isArray(m.parts) 
                                ? m.parts.map((p: any) => p.text || '').join(' ')
                                : (typeof m.parts === 'string' ? m.parts : '');
                            return {
                                role: m.role === 'model' ? 'assistant' : (m.role || 'user'),
                                content: content.trim() || ' '
                            };
                        }),
                        { role: 'user', content: request.message }
                    ]
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error?.message || `HTTP ${response.status}`);

            return {
                text: data.content[0].text,
                latency: Date.now() - start,
                usage: {
                    promptTokens: data.usage.input_tokens,
                    completionTokens: data.usage.output_tokens,
                    totalTokens: data.usage.input_tokens + data.usage.output_tokens
                },
                cost: 0
            };
        } catch (error: any) {
            throw new Error(`Anthropic Error: ${error.message}`);
        }
    }

    async *streamExecute(request: ModelRequest): AsyncIterable<StreamChunk> {
        const res = await this.execute(request);
        yield { text: res.text, done: true };
    }
}

export class XiaomiProvider extends OpenAICompatibleProvider {
    constructor(apiKey: string) {
        super(
            'xiaomi',
            'https://platform.xiaomimimo.com/v1',
            apiKey,
            'MiMo-V2.5-Pro',
            [{ 
                id: 'MiMo-V2.5-Pro', 
                name: 'MiMo V2.5 Pro', 
                provider: 'xiaomi', 
                capabilities: { 
                    contextLength: 1048576, 
                    streaming: true, 
                    functionCalling: true 
                } 
            }]
        );
    }
}
