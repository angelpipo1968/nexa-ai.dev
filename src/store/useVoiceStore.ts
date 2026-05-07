import { create } from 'zustand';

interface VoiceState {
    isVoiceMode: boolean;
    isRecording: boolean;
    isProcessing: boolean;
    transcript: string;
    audioLevel: number;
    toggleVoiceMode: () => void;
    setRecording: (recording: boolean) => void;
    setProcessing: (processing: boolean) => void;
    setTranscript: (transcript: string) => void;
    setAudioLevel: (level: number) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
    isVoiceMode: false,
    isRecording: false,
    isProcessing: false,
    transcript: '',
    audioLevel: 0,
    toggleVoiceMode: () => set((s) => ({ isVoiceMode: !s.isVoiceMode })),
    setRecording: (isRecording) => set({ isRecording }),
    setProcessing: (isProcessing) => set({ isProcessing }),
    setTranscript: (transcript) => set({ transcript }),
    setAudioLevel: (audioLevel) => set({ audioLevel }),
}));
