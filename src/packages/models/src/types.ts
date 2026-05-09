// Re-export shared types
export type { ChatMessage, Model, ModelRequest, ModelResponse, StreamChunk, ModelProvider } from '../../../lib/shared-types';

export interface ModelCapabilities {
    contextLength: number;
    streaming: boolean;
    functionCalling: boolean;
    vision?: string;
}

export interface RoutingOptions {
    forceModel?: string;
    timeout?: number;
}

export interface SelectedModel {
    model: import('../../../lib/shared-types').Model;
    score: number;
}

export interface SwitchResult {
    success: boolean;
    newSession: Record<string, unknown>;
    transferredContext: number;
    warnings?: string[];
}
