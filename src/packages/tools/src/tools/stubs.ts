import { Tool } from '../base-tool';
import { SearchResult, ToolResult, ExecutionContext } from '../types';

// Sandbox Manager Stub
export class SandboxManager {
    async execute(tool: Tool, params: Record<string, unknown>, context: ExecutionContext): Promise<ToolResult> {
        return tool.execute(params, context);
    }
}

// Permission Manager Stub
export class PermissionManager {
    async check(_userId: string, _toolName: string, _params: Record<string, unknown>): Promise<boolean> {
        return true; // Allow all for MVP
    }
}

// Search Providers Stubs
export async function searchWeb(_query: string, _options: Record<string, unknown>): Promise<SearchResult> {
    return { title: 'Mock Web Result', url: 'http://example.com', content: 'Mock content', source: 'web' };
}

export async function searchAcademic(_query: string, _options: Record<string, unknown>): Promise<SearchResult> {
    return { title: 'Mock Academic Result', url: 'http://scholar.example.com', content: 'Mock academic content', source: 'academic' };
}

export async function searchNews(_query: string, _options: Record<string, unknown>): Promise<SearchResult> {
    return { title: 'Mock News Result', url: 'http://news.example.com', content: 'Mock news content', source: 'news' };
}

// Other Tools Stubs (CodeExecutionTool omitted - use from code-execution.ts)
export class RAGTool extends Tool {
    name = 'rag';
    description = 'Retrieval Augmented Generation';
    parameters = {};
    async execute(_params: Record<string, unknown>, _context: ExecutionContext): Promise<ToolResult> {
        return { success: true, data: 'RAG result' };
    }
}

export class BrowserTool extends Tool {
    name = 'browser';
    description = 'Browser automation';
    parameters = {};
    async execute(_params: Record<string, unknown>, _context: ExecutionContext): Promise<ToolResult> {
        return { success: true, data: 'Browser action completed' };
    }
}

export class CalculatorTool extends Tool {
    name = 'calculator';
    description = 'Performs calculations';
    parameters = {};
    async execute(_params: Record<string, unknown>, _context: ExecutionContext): Promise<ToolResult> {
        return { success: true, data: 'Calculation result' };
    }
}
