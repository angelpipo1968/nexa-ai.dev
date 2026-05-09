// Re-export shared types
export type { SearchResult, ToolResult } from '../../../lib/shared-types';

export interface ExecutionContext {
    userId: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
}

export interface ToolValidationResult {
    valid: boolean;
    errors: string[];
}

export interface VerifiedResult {
    title: string;
    url: string;
    snippet: string;
    content?: string;
    score?: number;
    source?: string;
    publishedDate?: string;
    verification: {
        factual: boolean;
        recent: boolean;
        credible: boolean;
        confidence: number;
    };
}

export interface ToolRoutingResult {
    tool: string;
    confidence: number;
    parameters: Record<string, unknown>;
    alternativeTools?: string[];
}
