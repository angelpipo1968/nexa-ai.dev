export class NeuralHash {
    async analyze(_input: string) {
        return { scores: { injection: 0, jailbreak: 0, privilege: 0 } };
    }
}
