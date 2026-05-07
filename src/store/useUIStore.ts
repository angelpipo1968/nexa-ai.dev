import { create } from 'zustand';

interface UIState {
    activeModule: string;
    isVideoMode: boolean;
    isArtifactPanelOpen: boolean;
    isSidebarOpen: boolean;
    toggleVideoMode: () => void;
    toggleArtifactPanel: () => void;
    toggleSidebar: () => void;
    setActiveModule: (module: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
    activeModule: 'chat',
    isVideoMode: false,
    isArtifactPanelOpen: false,
    isSidebarOpen: false,
    toggleVideoMode: () => set((s) => ({ isVideoMode: !s.isVideoMode })),
    toggleArtifactPanel: () => set((s) => ({ isArtifactPanelOpen: !s.isArtifactPanelOpen })),
    toggleSidebar: () => set((s) => ({ isSidebarOpen: !s.isSidebarOpen })),
    setActiveModule: (module) => set({ activeModule: module }),
}));
