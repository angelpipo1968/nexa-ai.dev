import { create } from 'zustand';

export interface Artifact {
    id: string;
    type: 'code' | 'markdown' | 'html' | 'svg' | 'diagram' | 'data';
    title: string;
    content: string;
    language?: string;
}

interface ArtifactState {
    artifacts: Artifact[];
    activeArtifactId: string | null;
    
    // Acciones
    addArtifact: (artifact: Artifact) => void;
    setActiveArtifact: (id: string | null) => void;
    updateArtifact: (id: string, updates: Partial<Artifact>) => void;
    clearArtifacts: () => void;
    
    // Getters
    getActiveArtifact: () => Artifact | null;
}

export const useArtifactStore = create<ArtifactState>((set, get) => ({
    artifacts: [],
    activeArtifactId: null,

    addArtifact: (artifact) => {
        set((state) => {
            // Si ya existe uno con el mismo ID, lo actualizamos, si no, lo añadimos
            const exists = state.artifacts.find((a) => a.id === artifact.id);
            if (exists) {
                return {
                    artifacts: state.artifacts.map((a) => (a.id === artifact.id ? artifact : a)),
                    activeArtifactId: artifact.id,
                };
            }
            return {
                artifacts: [...state.artifacts, artifact],
                activeArtifactId: artifact.id,
            };
        });
    },

    setActiveArtifact: (id) => set({ activeArtifactId: id }),

    updateArtifact: (id, updates) => {
        set((state) => ({
            artifacts: state.artifacts.map((a) => (a.id === id ? { ...a, ...updates } : a)),
        }));
    },

    clearArtifacts: () => set({ artifacts: [], activeArtifactId: null }),

    getActiveArtifact: () => {
        const { artifacts, activeArtifactId } = get();
        return artifacts.find((a) => a.id === activeArtifactId) || null;
    },
}));
