import { Model, ModelResponse, ModelRequest, RoutingOptions, SelectedModel, SwitchResult, StreamChunk } from './types'
import { OllamaProvider, OpenAICompatibleProvider, AnthropicProvider, ModelProvider, XiaomiProvider } from './providers/real-providers'
import { PerformanceMonitor } from './monitor'
import { ModelCache } from './cache'
import { StreamingCache } from './cache/stream-cache'
import { ModelLoadBalancer } from './load-balancer'
import { logger } from '@/lib/nexa-core/logger'

interface Session { // Stub session
    id: string;
    userId: string;
    model: Model;
    context: Record<string, unknown>[];
}

interface SelectionCriteria {
    message: string;
    context?: Record<string, unknown>[];
    requirements?: Record<string, unknown>;
    budget?: number;
    priority: string;
    userId: string;
}

export class ModelRouter {
    private providers: Map<string, ModelProvider>
    private monitor: PerformanceMonitor
    private cache: ModelCache
    private streamingCache: StreamingCache
    private loadBalancer: ModelLoadBalancer

    constructor() {
        this.providers = new Map()
        this.monitor = new PerformanceMonitor()
        this.cache = new ModelCache()
        this.streamingCache = new StreamingCache()
        this.loadBalancer = new ModelLoadBalancer()

        this.initializeProviders()
    }

    private initializeProviders() {
        // 1. Ollama (Local)
        this.providers.set('ollama', new OllamaProvider())

        // 2. OpenAI (Cloud)
        if (process.env.VITE_OPENAI_API_KEY) {
            this.providers.set('openai', new OpenAICompatibleProvider(
                'openai',
                'https://api.openai.com/v1',
                process.env.VITE_OPENAI_API_KEY,
                'gpt-4o',
                [{ id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', capabilities: { contextLength: 128000, streaming: true, functionCalling: true } }]
            ))
        }

        // 3. DeepSeek (Cloud)
        if (process.env.VITE_DEEPSEEK_API_KEY) {
            this.providers.set('deepseek', new OpenAICompatibleProvider(
                'deepseek',
                'https://api.deepseek.com',
                process.env.VITE_DEEPSEEK_API_KEY,
                'deepseek-chat',
                [{ id: 'deepseek-chat', name: 'DeepSeek V3', provider: 'deepseek', capabilities: { contextLength: 64000, streaming: true, functionCalling: true } }]
            ))
        }

        // 4. Groq (Cloud - Ultra Fast)
        if (process.env.VITE_GROQ_API_KEY) {
            this.providers.set('groq', new OpenAICompatibleProvider(
                'groq',
                'https://api.groq.com/openai/v1',
                process.env.VITE_GROQ_API_KEY,
                'llama3-70b-8192',
                [{ id: 'llama3-70b-8192', name: 'Llama 3 70B (Groq)', provider: 'groq', capabilities: { contextLength: 8192, streaming: true, functionCalling: true } }]
            ))
        }

        // 5. Anthropic (Claude)
        if (process.env.VITE_ANTHROPIC_API_KEY) {
            this.providers.set('anthropic', new AnthropicProvider(
                process.env.VITE_ANTHROPIC_API_KEY,
                'claude-3-5-sonnet-20240620',
                [{ id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet', provider: 'anthropic', capabilities: { contextLength: 200000, streaming: true, functionCalling: true } }]
            ))
        }

        // 6. Gemini (Google)
        if (process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY) {
            this.providers.set('gemini', new (require('./providers/real-providers').GeminiProvider)(
                process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY,
                'gemini-1.5-flash'
            ));
        }

        // 7. NVIDIA NIM (Ultra Performance)
        if (process.env.VITE_NVIDIA_API_KEY) {
            this.providers.set('nvidia', new OpenAICompatibleProvider(
                'nvidia',
                'https://integrate.api.nvidia.com/v1',
                process.env.VITE_NVIDIA_API_KEY,
                'meta/llama-3.1-405b-instruct',
                [{ id: 'meta/llama-3.1-405b-instruct', name: 'Llama 3.1 405B (NVIDIA)', provider: 'nvidia', capabilities: { contextLength: 32000, streaming: true, functionCalling: true } }]
            ))
            // 8. Xiaomi (MiMo V2.5 Pro)
        if (process.env.VITE_XIAOMI_API_KEY) {
            this.providers.set('xiaomi', new XiaomiProvider(process.env.VITE_XIAOMI_API_KEY))
        }
    }
    }

    async route(
        request: ModelRequest,
        options: RoutingOptions = {}
    ): Promise<ModelResponse> {
        const {
            userId,
            message,
            context,
            requirements,
            budget,
            priority = 'balanced'
        } = request

        // 1. Determinar modelo óptimo
        const selectedModel = await this.selectOptimalModel({
            message,
            context,
            requirements,
            budget,
            priority,
            userId
        })

        const model = selectedModel.model;

        // 2. Verificar disponibilidad
        const available = await this.checkAvailability(model)
        if (!available) {
            // Fallback automático
            return await this.routeWithFallback(request, model)
        }

        // 3. Ejecutar con modelo seleccionado
        const response = await this.executeWithModel(model, request)

        // 4. Monitorear performance
        await this.monitor.record({
            model: model.id,
            userId,
            latency: response.latency,
            tokens: response.usage?.totalTokens,
            cost: response.cost,
            quality: await this.evaluateQuality(response)
        })

        // 5. Actualizar preferencias del usuario
        await this.updateUserPreferences(userId, model, response)

        return {
            ...response,
            modelId: model.id
        }
    }

    async *stream(
        request: ModelRequest,
        options: RoutingOptions = {}
    ): AsyncIterable<StreamChunk> {
        const {
            userId,
            message,
            context,
            requirements,
            budget,
            priority = 'balanced'
        } = request

        // 1. Check Streaming Cache
        const cacheGenerator = this.streamingCache.getOrStream(
            message,
            this.streamInternal(request, options)
        );

        yield* cacheGenerator;
    }

    private async *streamInternal(
        request: ModelRequest,
        options: RoutingOptions = {}
    ): AsyncIterable<StreamChunk> {
        const priority = request.priority as 'speed' | 'quality' | 'balanced' || 'balanced';

        // 1. Get fallback sequence
        const fallbackSequence = this.getFallbackProviders(priority);
        let lastError: unknown = null;

        for (const providerKey of fallbackSequence) {
            const provider = this.providers.get(providerKey);
            if (!provider) continue;

            try {
                const start = Date.now();
                let tokens = 0;

                for await (const chunk of provider.streamExecute({
                    ...request,
                    requirements: { ...request.requirements, provider: providerKey }
                })) {
                    tokens++;
                    yield chunk;

                    if (chunk.done) {
                        // 3. Monitor performance
                        await this.monitor.record({
                            model: providerKey, // Simple ID for stub
                            userId: request.userId,
                            latency: Date.now() - start,
                            tokens: chunk.usage?.totalTokens || tokens,
                            cost: 0
                        });
                    }
                }
                return; // Success!
            } catch (e) {
                logger.warn(`Stream fallback: ${providerKey} failed, trying next...`, 'Router');
                lastError = e;
            }
        }
        throw lastError || new Error("All providers failed");
    }

    private getFallbackProviders(priority: string = 'balanced'): string[] {
        // High Speed Priority: Gemini Flash (Free/Fast) -> Groq -> NVIDIA -> Ollama
        if (priority === 'speed') {
            return ['gemini', 'groq', 'nvidia', 'ollama', 'openai'].filter(p => this.providers.has(p));
        }
        // Quality Priority: Anthropic -> OpenAI -> DeepSeek -> Gemini
        if (priority === 'quality') {
            return ['anthropic', 'openai', 'deepseek', 'xiaomi', 'gemini', 'ollama'].filter(p => this.providers.has(p));
        }
        // Default Balanced (Max Free Tokens): Ollama (Local) -> Gemini (Free Cloud) -> Groq (Free Cloud) -> Others
        const sequence = ['ollama', 'gemini', 'groq', 'nvidia', 'openai', 'deepseek', 'anthropic'];
        return sequence.filter(p => this.providers.has(p));
    }

    private async selectOptimalModel(
        criteria: SelectionCriteria
    ): Promise<SelectedModel> {
        const models = await this.getAvailableModels(criteria.userId);

        // If specific model is requested, prioritize it
        const requestedId = criteria.requirements?.modelId;
        if (requestedId) {
            const model = models.find(m => m.id === requestedId);
            if (model) return { model, score: 1.0 };
        }

        // Default analysis multi-factor stub
        const model = models[0];
        return { model, score: 0.9 };
    }

    async switchModel(
        currentSession: Session,
        newModelId: string,
        reason?: string
    ): Promise<SwitchResult> {
        const newModel = this.getModel(newModelId)
        if (!newModel) throw new Error("Model not found");

        // Transferir contexto STUB
        const transferredContext = currentSession.context;

        // Iniciar nueva sesión STUB
        const newSession = {
            ...currentSession,
            model: newModel,
            context: transferredContext
        }

        return {
            success: true,
            newSession,
            transferredContext: transferredContext.length,
            warnings: []
        }
    }

    async getAvailableModels(
        userId: string,
        filter?: Record<string, unknown>
    ): Promise<Model[]> {
        const allModels = Array.from(this.providers.values())
            .flatMap(p => p.getModels())
        return allModels;
    }

    async getMetrics() {
        return {
            streaming: {
                activeConnections: 0, // Placeholder
                tokensPerSecond: this.monitor.getTPS(),
                avgLatency: 0 // Placeholder
            },
            performance: this.monitor.getAllMetrics(),
            recommendations: this.monitor.getOptimizationRecommendations()
        };
    }

    // Helpers to satisfy interface
    private async checkAvailability(model: Model) { return true; }
    private async routeWithFallback(req: ModelRequest, model: Model) { return { text: "Fallback", latency: 0, cost: 0 }; }
    private async executeWithModel(model: Model, request: ModelRequest) {
        const fallbackSequence = [model.provider, ...this.getFallbackProviders().filter(p => p !== model.provider)];
        let lastError: unknown = null;

        for (const providerKey of fallbackSequence) {
            const provider = this.providers.get(providerKey);
            if (!provider) continue;

            try {
                return await provider.execute(request);
            } catch (e) {
                logger.warn(`Execution fallback: ${providerKey} failed, trying next...`, 'Router');
                lastError = e;
            }
        }
        throw lastError || new Error("All providers failed");
    }
    private async evaluateQuality(response: ModelResponse) { return 0.9; }
    private async updateUserPreferences(userId: string, model: Model, response: ModelResponse) { }
    private getModel(id: string) {
        return (this.getAvailableModels('stub') as unknown as Model[]).find(m => m.id === id);
    }
}
