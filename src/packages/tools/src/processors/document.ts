export interface ProcessedDocument {
    chunks: { content: string, metadata: Record<string, unknown> }[];
    metadata: Record<string, unknown>;
}

export class DocumentProcessor {
    async process(file: File): Promise<ProcessedDocument> {
        // Stub implementation
        return {
            chunks: [{ content: "Stub content", metadata: { filename: file.name } }],
            metadata: { processed: true }
        };
    }
}
