import { analyticsService } from '@/lib/analytics/AnalyticsService';
import { logger } from '@/lib/logging/StructuredLogger';

export interface ModelProvider {
  name: string;
  id: string;
  priority: number;
  enabled: boolean;
  type: 'local' | 'cloud';
}

/**
 * ModelOrchestrator
 * Maneja el fallback automático entre proveedores de IA.
 * Si el proveedor principal falla, intenta secuencialmente con los secundarios.
 */
export class ModelOrchestrator {
  private providers: ModelProvider[] = [
    { name: 'Gemini 2.0 Flash', id: 'gemini', priority: 1, enabled: true, type: 'cloud' },
    { name: 'Nexas (Local)', id: 'ollama', priority: 2, enabled: true, type: 'local' },
    { name: 'DeepSeek V3', id: 'deepseek', priority: 3, enabled: true, type: 'cloud' },
    { name: 'Claude 3.5 Sonnet', id: 'anthropic', priority: 4, enabled: false, type: 'cloud' },
  ];

  constructor(customProviders?: ModelProvider[]) {
    if (customProviders) {
      this.providers = customProviders;
    }
  }

  /**
   * Ejecuta una petición de chat con sistema de reintentos y fallback
   */
  async chat(
    payload: any,
    userId?: string,
    conversationId?: string
  ): Promise<{ response: any; provider: string; latency: number }> {
    const sortedProviders = [...this.providers]
      .filter(p => p.enabled)
      .sort((a, b) => a.priority - b.priority);

    let lastError: any = null;

    for (const provider of sortedProviders) {
      const startTime = Date.now();
      try {
        logger.info(`[Orchestrator] Attempting chat with provider: ${provider.name}`);
        
        const response = await this.callProvider(provider, payload, userId, conversationId);
        const latency = Date.now() - startTime;

        // Registrar éxito en analytics
        await analyticsService.recordInference({
          model: provider.id,
          action: 'chat',
          tokens_used: 0, // Placeholder
          latency_ms: latency,
          cost_usd: 0, // Placeholder
          success: true,
          user_id: userId,
          conversation_id: conversationId,
        });

        return { response, provider: provider.id, latency };
      } catch (error: any) {
        const latency = Date.now() - startTime;
        lastError = error;
        
        logger.warn(`[Orchestrator] Provider ${provider.name} failed: ${error.message}`);
        
        // Registrar fallo en analytics
        await analyticsService.recordInference({
          model: provider.id,
          action: 'chat',
          tokens_used: 0,
          latency_ms: latency,
          cost_usd: 0,
          success: false,
          error_message: error.message,
          user_id: userId,
          conversation_id: conversationId,
        });

        // Continuar al siguiente proveedor
        continue;
      }
    }

    throw new Error(`Todos los proveedores fallaron. Último error: ${lastError?.message}`);
  }

  /**
   * Wrapper para llamar a los diferentes clientes de modelos
   */
  private async callProvider(
    provider: ModelProvider,
    payload: any,
    userId?: string,
    conversationId?: string
  ): Promise<any> {
    switch (provider.id) {
      case 'gemini':
        const { geminiClient } = await import('@/lib/gemini');
        return await geminiClient.chat(payload, userId, conversationId);
      
      case 'ollama':
        // Llamada a Ollama local (modelo nexas)
        const ollamaResponse = await fetch('http://localhost:11434/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'nexas',
            messages: payload.context || [{ role: 'user', content: payload.message }],
            stream: false
          })
        });
        if (!ollamaResponse.ok) throw new Error(`Ollama error: ${ollamaResponse.statusText}`);
        return await ollamaResponse.json();

      case 'deepseek':
        // DeepSeek via OpenAI compatible interface
        const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.VITE_DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
              model: 'deepseek-chat',
              messages: payload.context || [{ role: 'user', content: payload.message }]
            })
          });
          if (!deepseekResponse.ok) throw new Error(`DeepSeek error: ${deepseekResponse.statusText}`);
          return await deepseekResponse.json();

      default:
        throw new Error(`Proveedor ${provider.id} no implementado en Orchestrator`);
    }
  }
}

export const modelOrchestrator = new ModelOrchestrator();
