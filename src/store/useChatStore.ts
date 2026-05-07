import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { useLocaleStore } from './useLocaleStore';

export interface Message {
    id: string;
    conversation_id?: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    isStreaming?: boolean;
    attachments?: Array<{ type: string; data: string; name: string }>;
}

export interface Conversation {
    id: string;
    title: string;
    created_at: string;
    updated_at: string;
}

interface ChatState {
    activeConversationId: string | null;
    conversations: Conversation[];
    messages: Message[];
    personality: string;
    ultraFastMode: boolean;
    isThinking: boolean;
    isSearching: boolean;
    isStreaming: boolean;

    loadConversations: () => Promise<void>;
    createConversation: (title?: string) => Promise<string>;
    setActiveConversation: (id: string) => Promise<void>;
    deleteConversation: (id: string) => Promise<void>;
    addMessage: (message: Message) => void;
    sendMessage: (content: string, onResponse?: (msg: Message) => void, attachments?: any[]) => Promise<void>;
    deleteMessage: (id: string) => void;
    forkChat: (messageIndex: number) => Promise<void>;
    regenerateResponse: () => Promise<void>;
    setIsThinking: (v: boolean) => void;
    setIsSearching: (v: boolean) => void;
    setIsStreaming: (v: boolean) => void;
    clearMessages: () => void;
}

function safeStringify(obj: any): string {
    if (typeof obj === 'string') return obj;
    try { return JSON.stringify(obj); } catch { return String(obj); }
}

const LOCAL_API = 'http://localhost:3001';

async function persistMessageToSupabase(conversationId: string, role: string, content: string) {
    try {
        await supabase.from('messages').insert({ conversation_id: conversationId, role, content });
    } catch (e) { console.warn('[Supabase] Error:', e); }
    try {
        await fetch(`${LOCAL_API}/api/local/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ conversation_id: conversationId, role, content }),
        });
    } catch {}
}

async function persistConversationTitle(conversationId: string, title: string) {
    try {
        await supabase.from('conversations').update({ title }).eq('id', conversationId);
    } catch (e) { console.warn('[Supabase] Error:', e); }
    try {
        await fetch(`${LOCAL_API}/api/local/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: conversationId, title }),
        });
    } catch {}
}

export const useChatStore = create<ChatState>()(
    persist(
        (set, get) => ({
            activeConversationId: null,
            conversations: [],
            messages: [],
            personality: 'nexa',
            ultraFastMode: false,
            isThinking: false,
            isSearching: false,
            isStreaming: false,

            loadConversations: async () => {
                try {
                    const { data, error } = await supabase
                        .from('conversations')
                        .select('*')
                        .order('updated_at', { ascending: false });
                    if (!error && data) set({ conversations: data });
                } catch (e) { console.warn('[Supabase] Error loading:', e); }
            },

            createConversation: async (title?: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                try {
                    const { data, error } = await supabase
                        .from('conversations')
                        .insert({ title: title || 'Nueva conversación', user_id: user?.id || null })
                        .select()
                        .single();
                    if (!error && data) {
                        set((state) => ({
                            conversations: [data, ...state.conversations],
                            activeConversationId: data.id,
                            messages: [],
                        }));
                        return data.id;
                    }
                } catch (e) { console.warn('[Supabase] Error creating:', e); }

                const localId = `local-${Date.now()}`;
                const localConv: Conversation = {
                    id: localId,
                    title: title || 'Nueva conversación',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                };
                set((state) => ({
                    conversations: [localConv, ...state.conversations],
                    activeConversationId: localId,
                    messages: [],
                }));
                return localId;
            },

            setActiveConversation: async (id: string) => {
                try {
                    const { data, error } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('conversation_id', id)
                        .order('created_at', { ascending: true });
                    if (!error && data) {
                        const messages: Message[] = data.map((m: any) => ({
                            id: m.id,
                            conversation_id: m.conversation_id,
                            role: m.role,
                            content: m.content,
                            timestamp: new Date(m.created_at).getTime(),
                        }));
                        set({ activeConversationId: id, messages });
                        return;
                    }
                } catch (e) { console.warn('[Supabase] Error loading messages:', e); }
                set({ activeConversationId: id, messages: [] });
            },

            deleteConversation: async (id: string) => {
                try {
                    await supabase.from('messages').delete().eq('conversation_id', id);
                    await supabase.from('conversations').delete().eq('id', id);
                } catch (e) { console.warn('[Supabase] Error deleting:', e); }
                set((state) => ({
                    conversations: state.conversations.filter((c) => c.id !== id),
                    activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
                    messages: state.activeConversationId === id ? [] : state.messages,
                }));
            },

            addMessage: (message: Message) => {
                const sanitizedMessage = {
                    ...message,
                    content: typeof message.content === 'string' ? message.content : safeStringify(message.content),
                };
                set((state) => ({ messages: [...state.messages, sanitizedMessage] }));

                const { activeConversationId } = get();
                if (activeConversationId && !activeConversationId.startsWith('local-')) {
                    persistMessageToSupabase(activeConversationId, sanitizedMessage.role, sanitizedMessage.content);
                }
            },

            sendMessage: async (content: string, onResponse?: (msg: Message) => void, attachments?: any[]) => {
                let { activeConversationId } = get();

                if (!activeConversationId) {
                    const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
                    activeConversationId = await get().createConversation(title);
                }

                const userMessage: Message = {
                    id: `user-${Date.now()}`,
                    conversation_id: activeConversationId!,
                    role: 'user',
                    content,
                    timestamp: Date.now(),
                    attachments: (attachments?.length ?? 0) > 0 ? attachments : undefined,
                };

                persistMessageToSupabase(activeConversationId!, 'user', content);

                set((state) => ({
                    messages: [...state.messages, userMessage],
                    isThinking: true,
                }));

                const { conversations } = get();
                const conv = conversations.find((c) => c.id === activeConversationId);
                if (conv && conv.title === 'Nueva conversación') {
                    const newTitle = content.slice(0, 50) + (content.length > 50 ? '...' : '');
                    set((state) => ({
                        conversations: state.conversations.map((c) =>
                            c.id === activeConversationId ? { ...c, title: newTitle } : c
                        ),
                    }));
                    persistConversationTitle(activeConversationId!, newTitle);
                }

                const assistantMessageId = `assistant-${Date.now()}`;
                const assistantPlaceholder: Message = {
                    id: assistantMessageId,
                    conversation_id: activeConversationId!,
                    role: 'assistant',
                    content: '',
                    timestamp: Date.now(),
                    isStreaming: true,
                };

                set((state) => ({
                    messages: [...state.messages, assistantPlaceholder],
                    isThinking: false,
                    isStreaming: true,
                }));

                try {
                    const allMessages = get().messages.filter((m) => !m.isStreaming);
                    const apiMessages = allMessages.map((m) => ({ role: m.role, content: m.content }));

                    const locale = useLocaleStore.getState().locale;

                    const res = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            messages: apiMessages,
                            conversation_id: activeConversationId,
                            attachments,
                            locale,
                        }),
                    });

                    if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.error || 'Error en la respuesta');
                    }

                    const reader = res.body?.getReader();
                    const decoder = new TextDecoder();
                    let fullResponse = '';

                    if (reader) {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            const lines = chunk.split('\n\n');

                            for (const line of lines) {
                                if (!line.startsWith('data: ')) continue;

                                try {
                                    const data = JSON.parse(line.slice(6));
                                    if (data.error) throw new Error(data.error);

                                    if (data.text) {
                                        fullResponse += data.text;
                                        set((state) => ({
                                            messages: state.messages.map((m) =>
                                                m.id === assistantMessageId ? { ...m, content: fullResponse } : m
                                            ),
                                        }));
                                    }

                                    if (data.done) {
                                        set((state) => ({
                                            messages: state.messages.map((m) =>
                                                m.id === assistantMessageId
                                                    ? { ...m, content: fullResponse || data.fullResponse, isStreaming: false }
                                                    : m
                                            ),
                                            isStreaming: false,
                                        }));
                                        if (onResponse) {
                                            onResponse({
                                                id: assistantMessageId,
                                                role: 'assistant',
                                                content: fullResponse || data.fullResponse,
                                                timestamp: Date.now(),
                                            });
                                        }
                                    }
                                } catch {}
                            }
                        }
                    }
                } catch (error: any) {
                    console.error('[Chat] Error:', error.message);
                    const errorMessage = `Error: ${error.message}. Verifica tu API key.`;
                    set((state) => ({
                        messages: state.messages.map((m) =>
                            m.id === assistantMessageId ? { ...m, content: errorMessage, isStreaming: false } : m
                        ),
                        isStreaming: false,
                        isThinking: false,
                    }));
                }
            },

            deleteMessage: (id: string) => {
                set((state) => ({ messages: state.messages.filter((m) => m.id !== id) }));
            },

            forkChat: async (messageIndex: number) => {
                const { messages } = get();
                const forkedMessages = messages.slice(0, messageIndex + 1);
                const title = `Fork: ${forkedMessages[0]?.content.slice(0, 30)}...`;
                const conversationId = await get().createConversation(title);
                for (const msg of forkedMessages) {
                    get().addMessage({ ...msg, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, conversation_id: conversationId });
                }
            },

            regenerateResponse: async () => {
                const { messages } = get();
                if (messages.length === 0) return;
                const lastMessage = messages[messages.length - 1];
                if (lastMessage.role !== 'assistant') return;
                set((state) => ({ messages: state.messages.slice(0, -1) }));
            },

            setIsThinking: (v: boolean) => set({ isThinking: v }),
            setIsSearching: (v: boolean) => set({ isSearching: v }),
            setIsStreaming: (v: boolean) => set({ isStreaming: v }),
            clearMessages: () => set({ messages: [], activeConversationId: null }),
        }),
        {
            name: 'nexa-chat-storage',
            partialize: (state) => ({
                messages: state.messages,
                activeConversationId: state.activeConversationId,
                personality: state.personality,
                ultraFastMode: state.ultraFastMode,
            }),
        }
    )
);
