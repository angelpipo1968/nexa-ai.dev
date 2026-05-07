import { Sandbox, SandboxExecutionOptions, SandboxExecutionResult } from './types';

export class DockerSandbox implements Sandbox {
    type = 'docker';
    private image: string;
    private options: Record<string, unknown>;

    constructor(image: string, options: Record<string, unknown>) {
        this.image = image;
        this.options = options;
    }

    async execute(_options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
        // Stub implementation
        return {
            success: true,
            output: `[Docker: ${this.image}] Executed code in ${_options.language}`,
            executionTime: 100,
            memoryUsed: 50
        };
    }
}

export class DatabaseSandbox implements Sandbox {
    type = 'database';
    private dialect: string;
    private options: Record<string, unknown>;

    constructor(dialect: string, options: Record<string, unknown>) {
        this.dialect = dialect;
        this.options = options;
    }

    async execute(_options: SandboxExecutionOptions): Promise<SandboxExecutionResult> {
        // Stub implementation
        return {
            success: true,
            output: `[Database: ${this.dialect}] Executed SQL query`,
            executionTime: 50,
            memoryUsed: 20
        };
    }
}
