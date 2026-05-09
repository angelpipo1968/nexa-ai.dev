import { AxiosInstance } from 'axios'
import { NexaConfig } from './types'

export class ChatClient {
    constructor(private axios: AxiosInstance, private config: NexaConfig) { }
    async send(params: { messages: Array<{ role: string; content: string }>; modelId?: string }): Promise<{ message: { role: string; content: string } }> { return { message: { role: 'assistant', content: 'Stub response' } }; }
}

export class ToolsClient {
    constructor(private axios: AxiosInstance, private config: NexaConfig) { }
    async execute(name: string, params: Record<string, unknown>, options?: Record<string, unknown>): Promise<{ success: boolean; data: Record<string, unknown> }> { return { success: true, data: {} }; }
}

export class MemoryClient {
    constructor(private axios: AxiosInstance, private config: NexaConfig) { }
}
