// Re-export shared types
export type { NexaConfig, ChatMessage, ToolResult } from '../../../../lib/shared-types';

export interface EmbeddingOptions {
    modelId?: string;
    dimensions?: number;
    optimize?: boolean;
    cache?: boolean;
}

export interface EmbeddingResult {
    embeddings: number[][];
    model: unknown;
    dimensions: number;
    quality: unknown;
    metadata: unknown;
}

export interface EmbeddingBatchOptions {
    modelId?: string;
    parallel?: boolean;
    batchSize?: number;
}
export interface EmbeddingBatchResult {
    embeddings: number[][];
    processingTime: number;
    batchCount: number;
}

export type SimilarityMetric = 'cosine' | 'euclidean' | 'dot';

export interface SearchOptions {
    limit?: number;
    threshold?: number;
    filter?: Record<string, unknown>;
    modelId?: string;
}

// Embedding/vector search result (distinct from web SearchResult in shared-types)
export interface SearchResult {
    id: string;
    score: number;
    document: unknown;
}

export interface CollectionOptions {
    modelId?: string;
    metadata?: Record<string, unknown>;
}
export interface Collection {
    id: string;
    name: string;
    metadata: Record<string, unknown>;
}

export interface Document {
    id?: string;
    content: string;
    metadata?: Record<string, unknown>;
}
export interface AddOptions {
    batchSize?: number;
    generateEmbeddings?: boolean;
}
export interface AddResult {
    added: number;
    model: unknown;
    dimensions: number;
}

export interface ChatChunk {
    type: 'content' | 'complete';
    content: string;
    metadata?: Record<string, unknown>;
}

export interface HealthResponse {
    status: string;
    version: string;
}

export interface SessionOptions {
    userId?: string;
    metadata?: Record<string, unknown>;
}
export interface Session {
    id: string;
    userId: string;
    metadata: Record<string, unknown>;
}
export interface StreamOptions {
    sessionId?: string;
    modelId?: string;
}
export interface SendOptions {
    sessionId?: string;
    modelId?: string;
}
