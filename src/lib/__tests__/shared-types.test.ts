import { describe, it, expect } from 'vitest';
import type {
    SearchResult,
    ChatMessage,
    ToolCall,
    ToolResult,
    Model,
    ModelRequest,
    ModelResponse,
    StreamChunk,
    ModelProvider,
    NexaConfig,
    RateLimitResult,
} from '../shared-types';

// Type tests — verify type shapes compile correctly and
// runtime values match the expected interfaces.

describe('SharedTypes — type shape validation', () => {

    describe('SearchResult', () => {
        it('debe aceptar un resultado mínimo', () => {
            const result: SearchResult = {
                title: 'Test',
                url: 'https://example.com',
                snippet: 'A snippet',
            };
            expect(result.title).toBe('Test');
            expect(result.url).toBe('https://example.com');
        });

        it('debe aceptar campos opcionales', () => {
            const result: SearchResult = {
                title: 'Test',
                url: 'https://example.com',
                snippet: 'A snippet',
                content: 'Full content here',
                score: 0.95,
                source: 'google',
                publishedDate: '2024-01-01',
            };
            expect(result.score).toBe(0.95);
            expect(result.source).toBe('google');
        });
    });

    describe('ChatMessage', () => {
        it('debe aceptar mensaje de usuario', () => {
            const msg: ChatMessage = {
                role: 'user',
                content: 'Hola NEXA',
            };
            expect(msg.role).toBe('user');
        });

        it('debe aceptar mensaje de assistant', () => {
            const msg: ChatMessage = {
                id: 'msg-1',
                role: 'assistant',
                content: 'Respuesta de NEXA',
                timestamp: new Date(),
                model: 'gemini-1.5-flash',
                tokens: 150,
            };
            expect(msg.role).toBe('assistant');
            expect(msg.model).toBe('gemini-1.5-flash');
        });

        it('debe aceptar mensaje de sistema', () => {
            const msg: ChatMessage = {
                role: 'system',
                content: 'System prompt',
            };
            expect(msg.role).toBe('system');
        });

        it('debe aceptar role model (Gemini)', () => {
            const msg: ChatMessage = {
                role: 'model',
                parts: [{ text: 'Gemini response' }],
            };
            expect(msg.role).toBe('model');
        });

        it('debe aceptar toolCalls', () => {
            const msg: ChatMessage = {
                role: 'assistant',
                content: '',
                toolCalls: [{
                    id: 'call-1',
                    name: 'search',
                    arguments: { query: 'test' },
                    result: { items: [] },
                }],
            };
            expect(msg.toolCalls).toHaveLength(1);
            expect(msg.toolCalls![0].name).toBe('search');
        });
    });

    describe('ToolCall', () => {
        it('debe tener estructura correcta', () => {
            const call: ToolCall = {
                id: 'tc-1',
                name: 'web_search',
                arguments: { query: 'NEXA AI', limit: 10 },
            };
            expect(call.id).toBe('tc-1');
            expect(call.arguments.query).toBe('NEXA AI');
        });

        it('debe aceptar result opcional', () => {
            const call: ToolCall = {
                id: 'tc-2',
                name: 'calculate',
                arguments: { expression: '2+2' },
                result: 4,
            };
            expect(call.result).toBe(4);
        });
    });

    describe('ToolResult', () => {
        it('debe representar resultado exitoso', () => {
            const result: ToolResult = {
                success: true,
                output: 'Result text',
                data: { items: [1, 2, 3] },
            };
            expect(result.success).toBe(true);
        });

        it('debe representar resultado fallido', () => {
            const result: ToolResult = {
                success: false,
                error: 'Timeout exceeded',
            };
            expect(result.success).toBe(false);
            expect(result.error).toBe('Timeout exceeded');
        });
    });

    describe('Model', () => {
        it('debe tener estructura completa', () => {
            const model: Model = {
                id: 'gemini-1.5-flash',
                name: 'Gemini 1.5 Flash',
                provider: 'google',
                capabilities: {
                    contextLength: 1000000,
                    streaming: true,
                    functionCalling: true,
                    vision: true,
                },
            };
            expect(model.capabilities.vision).toBe(true);
        });

        it('debe aceptar recommendationReason opcional', () => {
            const model: Model = {
                id: 'llama-3.3-70b',
                name: 'Llama 3.3 70B',
                provider: 'groq',
                capabilities: {
                    contextLength: 128000,
                    streaming: true,
                    functionCalling: false,
                },
                recommendationReason: 'Fastest for code tasks',
            };
            expect(model.recommendationReason).toBe('Fastest for code tasks');
        });
    });

    describe('ModelRequest', () => {
        it('debe tener campos mínimos', () => {
            const req: ModelRequest = {
                userId: 'user-123',
                message: 'Hello',
            };
            expect(req.userId).toBe('user-123');
        });

        it('debe aceptar todos los campos opcionales', () => {
            const req: ModelRequest = {
                userId: 'user-123',
                message: 'Analyze this image',
                context: [{ role: 'user', content: 'Previous message' }],
                images: ['base64data'],
                requirements: { format: 'json' },
                budget: 0.01,
                priority: 'quality',
            };
            expect(req.images).toHaveLength(1);
            expect(req.priority).toBe('quality');
        });
    });

    describe('ModelResponse', () => {
        it('debe tener estructura completa', () => {
            const resp: ModelResponse = {
                text: 'Response text',
                modelId: 'gemini-1.5-flash',
                latency: 1200,
                usage: {
                    promptTokens: 100,
                    completionTokens: 200,
                    totalTokens: 300,
                },
                cost: 0.00045,
            };
            expect(resp.latency).toBe(1200);
            expect(resp.usage!.totalTokens).toBe(300);
        });
    });

    describe('StreamChunk', () => {
        it('debe representar chunk intermedio', () => {
            const chunk: StreamChunk = {
                text: 'partial ',
                done: false,
            };
            expect(chunk.done).toBe(false);
        });

        it('debe representar chunk final con usage', () => {
            const chunk: StreamChunk = {
                text: '',
                done: true,
                usage: {
                    promptTokens: 50,
                    completionTokens: 100,
                    totalTokens: 150,
                },
            };
            expect(chunk.done).toBe(true);
        });
    });

    describe('NexaConfig', () => {
        it('debe aceptar configuración mínima', () => {
            const config: NexaConfig = {};
            expect(config).toBeDefined();
        });

        it('debe aceptar configuración completa', () => {
            const config: NexaConfig = {
                apiUrl: 'https://api.nexa.ai',
                apiKey: 'key-123',
                model: 'gemini-1.5-flash',
                temperature: 0.7,
                maxTokens: 8192,
                stream: true,
                timeout: 30000,
                maxRetries: 3,
            };
            expect(config.stream).toBe(true);
            expect(config.maxRetries).toBe(3);
        });
    });

    describe('RateLimitResult', () => {
        it('debe representar solicitud permitida', () => {
            const result: RateLimitResult = {
                allowed: true,
                remaining: 29,
                resetAt: Date.now() + 60000,
            };
            expect(result.allowed).toBe(true);
            expect(result.remaining).toBe(29);
        });

        it('debe representar solicitud bloqueada', () => {
            const result: RateLimitResult = {
                allowed: false,
                remaining: 0,
                resetAt: Date.now() + 30000,
                retryAfterMs: 30000,
            };
            expect(result.allowed).toBe(false);
            expect(result.retryAfterMs).toBeGreaterThan(0);
        });

        it('debe aceptar campos opcionales extendidos', () => {
            const result: RateLimitResult = {
                allowed: true,
                remaining: 5,
                resetAt: Date.now() + 60000,
                reset: Math.floor(Date.now() / 1000) + 60,
                limit: 30,
                retryAfter: 0,
                algorithm: 'sliding-window',
            };
            expect(result.algorithm).toBe('sliding-window');
        });
    });
});

describe('SharedTypes — type compatibility', () => {
    it('ChatMessage debe ser compatible con message mapping', () => {
        const messages: ChatMessage[] = [
            { role: 'user', content: 'Hello' },
            { role: 'assistant', content: 'Hi there' },
            { role: 'system', content: 'You are NEXA' },
        ];
        const mapped = messages.map(m => ({ role: m.role, content: m.content }));
        expect(mapped).toHaveLength(3);
        expect(mapped[0].role).toBe('user');
    });

    it('ModelProvider debe ser implementable', () => {
        const provider: ModelProvider = {
            id: 'test-provider',
            name: 'Test',
            getModels: () => [],
            execute: async (req) => ({
                text: 'response',
                latency: 100,
                cost: 0,
            }),
            streamExecute: async function* () {
                yield { text: 'chunk', done: false };
                yield { text: '', done: true };
            },
        };
        expect(provider.id).toBe('test-provider');
        expect(provider.getModels()).toEqual([]);
    });

    it('ModelRequest.priority debe aceptar solo valores válidos', () => {
        const priorities: ModelRequest['priority'][] = ['balanced', 'speed', 'quality', 'cost'];
        for (const priority of priorities) {
            const req: ModelRequest = { userId: 'u', message: 'm', priority };
            expect(req.priority).toBe(priority);
        }
    });
});
