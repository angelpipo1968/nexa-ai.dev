import { ExecutionContext, ToolResult, ToolValidationResult } from './types';

export abstract class Tool {
    abstract name: string;
    abstract description: string;
    abstract parameters: Record<string, unknown>;
    requiresSandbox: boolean = false;

    validate(params: Record<string, unknown>): ToolValidationResult {
        // Basic validation implementation
        const errors: string[] = [];
        // Simplified validation logic for MVP
        if (!params && this.parameters) {
            // errors.push('Parameters required'); 
        }
        return { valid: errors.length === 0, errors };
    }

    abstract execute(params: Record<string, unknown>, context: ExecutionContext): Promise<ToolResult>;

    // Optional methods that might be used by specific tools or orchestrator
    protected calculateConfidence(_verifications: unknown[]): number {
        return 1.0;
    }
}
