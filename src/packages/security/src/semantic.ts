export class SemanticAnalyzer {
    async analyze(_input: string, _context?: Record<string, unknown>) {
        return { scores: { injection: 0, jailbreak: 0, privilege: 0 } };
    }
}
