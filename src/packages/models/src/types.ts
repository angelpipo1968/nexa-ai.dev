export interface Model {
    id: string;
    name: string;
    provider: string;
    capabilities: ModelCapabilities;
    recommendationReason?: string;
}

export interface ModelCapabilities {
    contextLength: number;
    streaming: boolean;
    functionCalling: boolean;
    vision?: boolean;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system' | 'model';
    content?: string;
    parts?: string | { text: string }[];
}

export interface ModelRequest {
    userId: string;
    message: string;
    context?: ChatMessage[];
    images?: string[]; // Base64 encoding
    requirements?: Record<string, any>;
    budget?: number;
    priority?: 'balanced' | 'speed' | 'quality' | 'cost';
}

export interface ModelResponse {
    text: string;
    modelId?: string;
    latency: number;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
    cost: number;
}

export interface StreamChunk {
    text: string;
    done: boolean;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface RoutingOptions {
    forceModel?: string;
    timeout?: number;
}

export interface SelectedModel {
    model: Model;
    score: number;
}

export interface SwitchResult {
    success: boolean;
    newSession: Record<string, any>;
    transferredContext: number;
    warnings?: string[];
}
