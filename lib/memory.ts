
export interface MemoryItem {
  id: string;
  content: string;
  type: 'preference' | 'fact' | 'instruction';
  timestamp: number;
}

const STORAGE_KEY = 'nexa_neural_memory';

export const MemorySystem = {
  getMemories: (): MemoryItem[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Error reading memory:', e);
      return [];
    }
  },

  addMemory: (content: string, type: 'preference' | 'fact' | 'instruction' = 'fact') => {
    if (typeof window === 'undefined') return;
    const memories = MemorySystem.getMemories();
    const newMemory: MemoryItem = {
      id: Date.now().toString(36),
      content,
      type,
      timestamp: Date.now()
    };
    memories.push(newMemory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
    return newMemory;
  },

  removeMemory: (id: string) => {
    if (typeof window === 'undefined') return;
    const memories = MemorySystem.getMemories().filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  },

  getSystemContext: (): string => {
    const memories = MemorySystem.getMemories();
    if (memories.length === 0) return '';
    
    return `\n\n[MEMORIA A LARGO PLAZO DEL USUARIO]:\n${memories.map(m => `- ${m.content}`).join('\n')}\nUtiliza esta información para personalizar tus respuestas.`;
  }
};
