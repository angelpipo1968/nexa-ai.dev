import { create } from 'zustand';

export interface Note {
    id: string;
    title: string;
    content: string;
    type: 'text' | 'image' | 'file';
    createdAt: number;
}

interface NotebookState {
    isNotebookMode: boolean;
    notes: Note[];
    activeNoteId: string | null;
    isLoading: boolean;
    
    toggleNotebookMode: () => void;
    addNote: (note: Note) => void;
    deleteNote: (id: string) => void;
    setActiveNote: (id: string | null) => void;
    clearNotes: () => void;
}

export const useNotebookStore = create<NotebookState>((set) => ({
    isNotebookMode: false,
    notes: [],
    activeNoteId: null,
    isLoading: false,
    
    toggleNotebookMode: () => set((s) => ({ isNotebookMode: !s.isNotebookMode })),
    addNote: (note) => set((s) => ({ notes: [note, ...s.notes], activeNoteId: note.id })),
    deleteNote: (id) => set((s) => ({ notes: s.notes.filter(n => n.id !== id) })),
    setActiveNote: (id) => set({ activeNoteId: id }),
    clearNotes: () => set({ notes: [], activeNoteId: null }),
}));
