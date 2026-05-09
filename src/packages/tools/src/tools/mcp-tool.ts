import { Tool } from '../base-tool';
import { ExecutionContext, ToolResult } from '../types';
import { MCPClient, MCPConfig } from '../mcp-client';

export class GenericMCPTool extends Tool {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    private mcpClient: MCPClient;
    private config: MCPConfig;
    private toolNameInServer: string;

    constructor(
        serverName: string,
        toolName: string,
        description: string,
        params: Record<string, unknown>,
        config: MCPConfig,
        client: MCPClient
    ) {
        super();
        this.name = `${serverName}_${toolName}`;
        this.toolNameInServer = toolName;
        this.description = description;
        this.parameters = params;
        this.config = config;
        this.mcpClient = client;
    }

    async execute(params: Record<string, unknown>, _context: ExecutionContext): Promise<ToolResult> {
        try {
            // MCP tool call
            const response = await this.mcpClient.callTool(
                this.name.split('_')[0],
                this.config,
                'tools/call',
                {
                    name: this.toolNameInServer,
                    arguments: params
                }
            ) as { error?: { message: string }, result?: { content: unknown } };

            if (response.error) {
                return {
                    success: false,
                    error: response.error.message || 'Unknown MCP error',
                    data: null
                };
            }

            return {
                success: true,
                data: response.result?.content || response.result,
                metadata: { source: 'mcp', server: this.name.split('_')[0] }
            };
        } catch (error) {
            return {
                success: false,
                error: `MCP Execution failed: ${error instanceof Error ? error.message : String(error)}`,
                data: null
            };
        }
    }
}
