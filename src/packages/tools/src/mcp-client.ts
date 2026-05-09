import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';

export interface MCPConfig {
    command?: string;
    args?: string[];
    env?: Record<string, string>;
    url?: string;
    serverUrl?: string; // Compatibility
    headers?: Record<string, unknown>;
    disabled?: boolean;
}

export class MCPClient {
    private processes: Map<string, ChildProcess> = new Map();

    async callTool(serverName: string, config: MCPConfig, method: string, params: Record<string, unknown>) {
        if (config.url || config.serverUrl) {
            return this.callHttpServer(config, method, params);
        } else if (config.command) {
            return this.callStdioServer(serverName, config, method, params);
        }
        throw new Error(`Invalid MCP configuration for ${serverName}`);
    }

    private async callHttpServer(config: MCPConfig, method: string, params: Record<string, unknown>) {
        const url = config.url || config.serverUrl;
        const response = await axios.post(url!, {
            jsonrpc: '2.0',
            id: Date.now(),
            method: method,
            params: params
        }, {
            headers: config.headers as Record<string, string>
        });
        return response.data;
    }

    private async callStdioServer(_serverName: string, config: MCPConfig, method: string, params: Record<string, unknown>) {
        // Simple stdio implementation for individual calls
        // In a real scenario, we would maintain a persistent process
        return new Promise((resolve, reject) => {
            const child = spawn(config.command!, config.args || [], {
                env: { ...process.env, ...config.env },
                stdio: ['pipe', 'pipe', 'pipe']
            });

            child.on('error', (err) => {
                reject(err);
            });

            let output = '';
            child.stdout?.on('data', (data) => {
                output += data.toString();
            });

            const request = JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: method,
                params: params
            }) + '\n';

            child.stdin?.write(request);

            setTimeout(() => {
                child.kill();
                try {
                    const response = JSON.parse(output.trim().split('\n').pop() || '{}');
                    resolve(response);
                } catch (_e) {
                    reject(new Error(`Failed to parse MCP response: ${output}`));
                }
            }, 5000); // 5s timeout
        });
    }
}
