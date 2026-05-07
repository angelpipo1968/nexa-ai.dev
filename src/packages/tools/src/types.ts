export interface ExecutionContext {
    userId: string;
    sessionId?: string;
    metadata?: Record<string, unknown>;
}

export interface ToolResult {
    success: boolean;
    error?: string;
    data: unknown;
    metadata?: Record<string, unknown>;
}

export interface ToolValidationResult {
    valid: boolean;
    errors: string[];
}

export interface SearchResult {
    title: string;
    url: string;
    content: string;
    source: string;
    publishedDate?: string;
}

export interface VerifiedResult extends SearchResult {
    verification: {
        factual: boolean;
        recent: boolean;
        credible: boolean;
        confidence: number;
    }
}

export interface ToolRoutingResult {
    tool: string;
    confidence: number;
    parameters: Record<string, unknown>;
    alternativeTools?: string[];
}
