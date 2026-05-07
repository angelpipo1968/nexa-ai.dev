export interface ModelProvider {
  name: 'gemini' | 'claude' | 'openai' | 'groq' | 'deepseek' | 'ollama';
  priority: number;
  enabled: boolean;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class ModelOrchestrator {
  private providers: ModelProvider[] = [
    { name: 'groq', priority: 1, enabled: true },
    { name: 'claude', priority: 2, enabled: true },
    { name: 'gemini', priority: 3, enabled: true },
    { name: 'ollama', priority: 4, enabled: false }, // Local fallback
  ];

  constructor(customProviders?: ModelProvider[]) {
    if (customProviders) {
      this.providers = customProviders;
    }
  }

  getSortedProviders(): ModelProvider[] {
    return [...this.providers]
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);
  }

  // Note: Actual calling logic is in the API route for now to keep it simple with streaming
  // but this class manages the selection and configuration.
}
