import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Store definition

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
}

interface ChatState {
    messages: Message[];
    isThinking: boolean;
    isSearching: boolean;
    isStreaming: boolean;
    currentInput: string;
    userName: string;
    hasGreeted: boolean;
    voiceEnabled: boolean;
    isRecording: boolean;
    isVoiceMode: boolean;
    isVideoMode: boolean;

    activeModule: 'chat' | 'studio' | 'hologram' | 'vision';
    isSpeaking: boolean;
    currentAudio: HTMLAudioElement | null;
    attachment: string | null; // Base64 image

    // Actions
    setMessages: (messages: Message[]) => void;
    addMessage: (message: Message) => void;
    updateMessage: (id: string, updates: Partial<Message>) => void;
    toggleThinking: () => void;
    toggleSearching: () => void;
    setStreaming: (isStreaming: boolean) => void;
    setInput: (input: string) => void;
    setAttachment: (attachment: string | null) => void;
    clearMessages: () => void;
    toggleVoice: () => void;
    setHasGreeted: (hasGreeted: boolean) => void;
    setRecording: (isRecording: boolean) => void;
    toggleVoiceMode: () => void;
    toggleVideoMode: () => void;
    speak: (text: string) => void;
    uploadFile: (type: 'video' | 'pdf' | 'image' | 'audio') => Promise<void>;

    deleteMessage: (id: string) => void;
    stopSpeaking: () => void;

    // Logic
    setActiveModule: (module: 'chat' | 'studio' | 'hologram' | 'vision') => void;
    sendMessage: (content: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            messages: [],
            isThinking: false,
            isSearching: false,
            isStreaming: false,
            currentInput: '',
            userName: 'Ángel',
            hasGreeted: false,
            voiceEnabled: false,
            isRecording: false,
            isVoiceMode: false,
            isVideoMode: false,

            activeModule: 'chat',
            isSpeaking: false,

            currentAudio: null,
            attachment: null,

            setMessages: (messages) => set({ messages }),

            addMessage: (message) => set((state) => ({
                messages: [...state.messages, message]
            })),

            updateMessage: (id, updates) => set((state) => ({
                messages: state.messages.map((msg) =>
                    msg.id === id ? { ...msg, ...updates } : msg
                ),
            })),

            toggleThinking: () => set((state) => ({ isThinking: !state.isThinking })),

            toggleSearching: () => set((state) => ({ isSearching: !state.isSearching })),

            setStreaming: (isStreaming) => set({ isStreaming }),

            setInput: (input) => set({ currentInput: input }),

            setAttachment: (attachment) => set({ attachment }),

            clearMessages: () => set({ messages: [] }),

            toggleVoice: () => set((state) => ({ voiceEnabled: !state.voiceEnabled })),

            setHasGreeted: (hasGreeted) => set({ hasGreeted }),

            setRecording: (isRecording: boolean) => set({ isRecording }),

            toggleVoiceMode: () => set((state) => ({ isVoiceMode: !state.isVoiceMode, isVideoMode: false })),

            toggleVideoMode: () => set((state) => ({ isVideoMode: !state.isVideoMode, isVoiceMode: false })),

            uploadFile: async (type) => {
                const input = document.createElement('input');
                input.type = 'file';
                let accept = '';
                switch (type) {
                    case 'video': accept = 'video/*'; break;
                    case 'pdf': accept = '.pdf,.doc,.docx,.txt'; break;
                    case 'image': accept = 'image/*'; break;
                    case 'audio': accept = 'audio/*'; break;
                }
                input.accept = accept;
                input.onchange = (e: any) => {
                    const file = e.target.files[0];
                    if (file) {
                        alert(`File selected: ${file.name}. (Upload logic would go here)`);
                    }
                };
                input.click();
            },

            downloadContent: () => {
                const messages = get().messages;
                if (messages.length === 0) return;
                const text = messages.map(m => `[${m.role.toUpperCase()}] ${m.content}`).join('\n\n');
                const blob = new Blob([text], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nexa-chat-${Date.now()}.txt`;
                a.click();
                URL.revokeObjectURL(url);
            },

            deleteMessage: (id) => set((state) => ({
                messages: state.messages.filter((msg) => msg.id !== id)
            })),

            stopSpeaking: () => {
                const { currentAudio } = get();
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                    set({ currentAudio: null });
                }
                if (typeof window !== 'undefined' && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                }
                set({ isSpeaking: false });
            },

            speak: async (text: string) => {
                if (typeof window === 'undefined' || !window.speechSynthesis) return;

                const getVoicesLoaded = (): Promise<SpeechSynthesisVoice[]> => {
                    return new Promise((resolve) => {
                        const voices = window.speechSynthesis.getVoices();
                        if (voices.length > 0) {
                            resolve(voices);
                            return;
                        }
                        window.speechSynthesis.onvoiceschanged = () => {
                            resolve(window.speechSynthesis.getVoices());
                        };
                        setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1000);
                    });
                };

                const voices = await getVoicesLoaded();
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.rate = 1.0;
                utterance.volume = 1.0;

                const femaleVoice = voices.find(v => v.lang.startsWith('es') && (v.name.toLowerCase().includes('google') || v.name.includes('Español'))) ||
                    voices.find(v => v.lang.startsWith('es') && v.name.includes('Helena')) ||
                    voices.find(v => v.lang.startsWith('es') && v.name.includes('Sabina')) ||
                    voices.find(v => v.lang.startsWith('es') && v.name.includes('Paulina')) ||
                    voices.find(v => v.lang.startsWith('es') && v.name.includes('Laura')) ||
                    voices.find(v => v.lang.startsWith('es') && v.name.toLowerCase().includes('female')) ||
                    voices.find(v => v.lang.includes('es'));

                if (femaleVoice) {
                    utterance.voice = femaleVoice;
                    utterance.pitch = (femaleVoice.name.includes('Male') || femaleVoice.name.includes('Raul') || femaleVoice.name.includes('Pablo')) ? 1.4 : 1.1;
                } else {
                    utterance.pitch = 1.3;
                }

                utterance.onstart = () => set({ isSpeaking: true });
                utterance.onend = () => set({ isSpeaking: false });
                utterance.onerror = () => set({ isSpeaking: false });

                window.speechSynthesis.cancel();
                window.speechSynthesis.speak(utterance);
            },

            setActiveModule: (module) => set({ activeModule: module }),

            sendMessage: async (content) => {
                if (!content.trim()) return;

                const userMessage: Message = {
                    id: Date.now().toString(),
                    role: 'user',
                    content,
                    timestamp: Date.now(),
                };

                set((state) => ({
                    messages: [...state.messages, userMessage],
                    isThinking: true,
                    isStreaming: true
                }));

                const assistantMsgId = (Date.now() + 1).toString();

                set((state) => ({
                    messages: [...state.messages, {
                        id: assistantMsgId,
                        role: 'assistant',
                        content: '',
                        timestamp: Date.now(),
                        isStreaming: true
                    }]
                }));

                try {
                    const response = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message: content,
                            context: get().messages.map(m => ({ role: m.role, content: m.content })),
                        }),
                    });

                    if (!response.ok) throw new Error(`API error: ${response.status}`);

                    const data = await response.json();
                    const finalResponse = data.content || data.message || 'No response received.';

                    get().updateMessage(assistantMsgId, { content: finalResponse, isStreaming: false });
                    if (get().voiceEnabled) get().speak(finalResponse);
                } catch (error: any) {
                    console.error('sendMessage error:', error);
                    const errorResponse = '⚠️ AI service is not available. Please configure your API provider.';
                    get().updateMessage(assistantMsgId, { content: errorResponse, isStreaming: false });
                } finally {
                    set({ isThinking: false, isStreaming: false, attachment: null });
                    get().updateMessage(assistantMsgId, { isStreaming: false });
                }
            },
        }),
        {
            name: 'nexa-chat-storage',
            partialize: (state) => ({
                messages: state.messages,
                voiceEnabled: state.voiceEnabled // Persist voice preference
            }),
        }
    )
);
