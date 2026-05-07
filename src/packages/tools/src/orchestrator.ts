import { Tool } from './base-tool'
import { ToolResult, ExecutionContext, ToolRoutingResult } from './types'
import { WebSearchTool } from './tools/web-search'
import { CodeExecutionTool } from './tools/code-execution'
import { RAGTool } from './tools/rag'
import { SequentialThinkingTool } from './tools/sequential-thinking'
import { ReadUrlTool } from './tools/read-url'
import {
    SandboxManager,
    PermissionManager,
    BrowserTool,
    CalculatorTool
} from './tools/stubs'
import { ListDirTool, ReadFileTool, WriteFileTool } from './tools/file-system'
import { SaveKnowledgeTool } from './tools/knowledge'
import { CodebaseSearchTool, IndexCodebaseTool } from './tools/codebase'

import { GenericMCPTool } from './tools/mcp-tool'
import { MCPClient } from './mcp-client'
import * as fs from 'fs'
import * as path from 'path'

export class ToolOrchestrator {
    private tools: Map<string, Tool>
    private sandbox: SandboxManager
    private permissionManager: PermissionManager
    private mcpClient: MCPClient

    constructor() {
        this.tools = new Map()
        this.sandbox = new SandboxManager()
        this.permissionManager = new PermissionManager()
        this.mcpClient = new MCPClient()

        this.registerDefaultTools()
        this.loadMCPServers()
    }

    private registerDefaultTools() {
        this.registerTool(new WebSearchTool())
        this.registerTool(new CodeExecutionTool())
        this.registerTool(new RAGTool())
        this.registerTool(new BrowserTool())
        this.registerTool(new CalculatorTool())
        this.registerTool(new SequentialThinkingTool())
        this.registerTool(new ReadUrlTool())
        this.registerTool(new ListDirTool())
        this.registerTool(new ReadFileTool())
        this.registerTool(new WriteFileTool())
        this.registerTool(new SaveKnowledgeTool())
        this.registerTool(new CodebaseSearchTool())
        this.registerTool(new IndexCodebaseTool())
    }

    registerTool(tool: Tool) {
        this.tools.set(tool.name, tool);
    }

    getToolsDefinitions() {
        return Array.from(this.tools.values()).map(tool => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        }));
    }

    private async loadMCPServers() {
        try {
            const configPath = path.join(process.cwd(), 'mcp_config.json');
            if (fs.existsSync(configPath)) {
                const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                const servers = config.mcpServers || {};

                for (const [serverName, serverConfig] of Object.entries(servers)) {
                    const typedConfig = serverConfig as { disabled?: boolean };
                    if (typedConfig.disabled) continue;

                    try {
                        console.log(`[ToolOrchestrator] 🌐 Discovering tools on MCP Server: ${serverName}...`);
                        // In a real scenario, we would use JSON-RPC over the transport.
                        // Here we use the client to list tools.
                        const response = await this.mcpClient.callTool(serverName, serverConfig as Record<string, unknown>, 'tools/list', {}) as { result?: { tools?: { name: string, description: string, inputSchema: Record<string, unknown> }[] } };

                        if (response?.result?.tools) {
                            for (const toolDef of response.result.tools) {
                                const mcpTool = new GenericMCPTool(
                                    serverName,
                                    toolDef.name,
                                    toolDef.description,
                                    toolDef.inputSchema,
                                    serverConfig as Record<string, unknown>,
                                    this.mcpClient
                                );
                                this.registerTool(mcpTool);
                                console.log(`[ToolOrchestrator] ✅ Registered MCP Tool: ${mcpTool.name}`);
                            }
                        }
                    } catch (err) {
                        console.warn(`[ToolOrchestrator] ⚠️ Could not load tools from ${serverName}:`, err);
                    }
                }
            }
        } catch (e) {
            console.error('[ToolOrchestrator] Error loading MCP configuration:', e);
        }
    }

    async execute(
        toolName: string,
        params: Record<string, unknown>,
        context: ExecutionContext
    ): Promise<ToolResult> {
        // 1. Verificar permisos
        const allowed = await this.permissionManager.check(
            context.userId,
            toolName,
            params
        )

        if (!allowed) {
            return {
                success: false,
                error: 'Permission denied',
                data: null,
                metadata: { tool: toolName, blocked: true }
            }
        }

        // 2. Obtener tool
        const tool = this.tools.get(toolName)
        if (!tool) {
            return {
                success: false,
                error: `Tool ${toolName} not found`,
                data: null
            }
        }

        // 3. Validar parámetros
        const validation = tool.validate(params)
        if (!validation.valid) {
            return {
                success: false,
                error: `Invalid parameters: ${validation.errors.join(', ')}`,
                data: null
            }
        }

        // 4. Ejecutar en sandbox si es necesario
        if (tool.requiresSandbox) {
            return await this.sandbox.execute(tool, params, context)
        }

        // 5. Ejecutar directamente
        try {
            const result = await tool.execute(params, context)

            // 6. Loggear ejecución
            await this.logExecution({
                tool: toolName,
                userId: context.userId,
                params,
                result,
                timestamp: new Date()
            })

            return result
        } catch (error: unknown) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error),
                data: null,
                metadata: { tool: toolName, error: true }
            }
        }
    }

    async route(
        query: string,
        availableTools: string[],
        context: ExecutionContext
    ): Promise<ToolRoutingResult> {
        // Análisis de intención para routing automático
        const intent = await this.analyzeIntent(query)

        // Selección de herramienta basada en ML
        const selectedTool = await this.selectTool(intent, availableTools, context)

        // Extracción de parámetros
        const params = this.extractParameters(query, selectedTool)

        return {
            tool: selectedTool.name,
            confidence: selectedTool.confidence,
            parameters: params,
            alternativeTools: selectedTool.alternatives
        }
    }

    // Helper methods to satisfy the code structure
    private async logExecution(_log: Record<string, unknown>) {
        console.log('Tool Execution Log:', _log);
    }

    private async analyzeIntent(_query: string) {
        return { type: 'info_retrieval' };
    }

    private async selectTool(_intent: Record<string, unknown>, _availableTools: string[], _context: ExecutionContext) {
        // Mock ML selection
        return { name: 'web_search', confidence: 0.95, alternatives: [] as string[] };
    }

    private extractParameters(_query: string, _tool: Record<string, unknown>) {
        return { query: _query };
    }
}
