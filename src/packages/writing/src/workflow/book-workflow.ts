import { WorkflowOrchestrator } from './orchestrator';

/**
 * Book-specific writing workflow.
 * Extends WorkflowOrchestrator with a simplified interface
 * focused on book creation (no research or quality analysis steps).
 */
export class BookWritingWorkflow extends WorkflowOrchestrator {
    /**
     * Execute a simplified book writing workflow.
     * Skips research and quality analysis for faster iteration.
     */
    async executeWorkflow(seedIdea: string) {
        // Reuse the parent's full flow but extract only what we need
        const result = await this.executeCompleteFlow(seedIdea);

        return {
            book: { ...result.concept, content: result.manuscript },
            package: result.exportPackage,
        };
    }
}
