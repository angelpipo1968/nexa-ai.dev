import { AxiosInstance } from 'axios'

export class FileProcessor {
    constructor(private axios: AxiosInstance) { }
    async scanDirectory(path: string, options: { extensions?: string[]; recursive?: boolean }): Promise<string[]> { return []; }
    async read(file: string): Promise<string> { return ""; }
    async write(file: string, content: string): Promise<void> { }
}

export class BatchProcessor {
    constructor(private axios: AxiosInstance) { }
    async process(items: string[], handler: (item: string) => Promise<unknown>, options: { concurrency?: number; batchSize?: number }): Promise<{ successful: unknown[]; failed: unknown[] }> { return { successful: [], failed: [] }; }
}
