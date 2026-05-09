'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import { ArrowUp } from './icons';
import { SettingsPanel } from './SettingsPanel';
import { Sidebar } from './layout/Sidebar';
import { Header } from './layout/Header';
import { EmptyState } from './layout/EmptyState';
import { MessageBubble } from './chat/MessageBubble';
import { ChatInput } from './chat/ChatInput';
import type { UploadedFile } from './chat/FileUpload';

const COLORS = {
    cyan: '#00e5a0', purple: '#a855f7', orange: '#f97316',
    pink: '#ec4899', blue: '#3b82f6', red: '#ef4444',
};

const THEMES = {
    light: { bg: '#ffffff', surf: '#f4f4f5', border: '#e4e4e7', text: '#18181b', sec: '#71717a', muted: '#a1a1aa' },
    dark: { bg: '#09090b', surf: '#18181b', border: '#27272a', text: '#f4f4f5', sec: '#a1a1aa', muted: '#71717a' },
    ultra: { bg: '#000000', surf: '#0a0a0a', border: '#1a1a1a', text: '#e0e0e0', sec: '#808080', muted: '#404040' },
};

interface Msg { id: string; role: 'user' | 'assistant'; content: string; ts: number; streaming?: boolean; }
interface Conv { id: string; title: string; pinned?: boolean; archived?: boolean; }

export function NexaApp() {
    // UI States
    const [msgs, setMsgs] = useState<Msg[]>([]);
    const [convs, setConvs] = useState<Conv[]>([]);
    const [convId, setConvId] = useState<string | null>(null);
    const [input, setInput] = useState('');
    const [suggestion, setSuggestion] = useState('');
    const [thinking, setThinking] = useState(false);
    const [streaming, setStreaming] = useState(false);
    const [drawer, setDrawer] = useState(false);
    const [view, setView] = useState<'chat' | 'auth' | 'settings'>('chat');
    const [showUpload, setShowUpload] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<UploadedFile[]>([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);

    // Auth
    const [user, setUser] = useState<any>(null);

    // Settings States
    const [accent, setAccent] = useState(COLORS.cyan);
    const [themeName, setThemeName] = useState<'system' | 'light' | 'dark'>('dark');
    const [resolvedTheme, setResolvedTheme] = useState<keyof typeof THEMES>('dark');
    const [autoSpeak, setAutoSpeak] = useState(false);
    const [autoSend, setAutoSend] = useState(true);
    const [voiceGender, setVoiceGender] = useState<'male' | 'female'>('female');
    const [voiceIndex, setVoiceIndex] = useState(0);
    const [lang, setLang] = useState('es');

    // System States
    const [conn, setConn] = useState<'ok' | 'err' | 'check'>('check');
    const [search, setSearch] = useState('');
    const [recording, setRecording] = useState(false);
    const [speaking, setSpeaking] = useState(false);
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [welcomeDone, setWelcomeDone] = useState(false);
    const [dynamicGreeting, setDynamicGreeting] = useState('');

    const endRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const recRef = useRef<any>(null);
    const userScrolledRef = useRef(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const sb = getSupabase();
    const T = THEMES[resolvedTheme];

    // ─── Scroll Logic ───
    const scrollToBottom = useCallback(() => {
        const container = chatContainerRef.current;
        if (container) container.scrollTop = container.scrollHeight;
    }, []);

    const isNearBottom = useCallback(() => {
        const container = chatContainerRef.current;
        if (!container) return true;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    }, []);

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            if (!streaming) {
                userScrolledRef.current = !isNearBottom();
                setShowScrollBtn(!isNearBottom());
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [streaming, isNearBottom]);

    useEffect(() => { if (!userScrolledRef.current) scrollToBottom(); }, [msgs, scrollToBottom]);

    useEffect(() => {
        if (streaming) {
            const interval = setInterval(() => { if (!userScrolledRef.current) scrollToBottom(); }, 100);
            return () => clearInterval(interval);
        } else {
            userScrolledRef.current = false;
        }
    }, [streaming, scrollToBottom]);

    // ─── Theme Logic ───
    useEffect(() => {
        if (themeName === 'system') {
            const mql = window.matchMedia('(prefers-color-scheme: dark)');
            const update = () => setResolvedTheme(mql.matches ? 'dark' : 'light');
            update();
            mql.addEventListener('change', update);
            return () => mql.removeEventListener('change', update);
        } else { setResolvedTheme(themeName as keyof typeof THEMES); }
    }, [themeName]);

    const toggleTheme = useCallback(() => {
        const next = resolvedTheme === 'dark' ? 'light' : 'dark';
        setThemeName(next);
        localStorage.setItem('nexa_theme', next);
    }, [resolvedTheme]);

    // ─── Persistence ───
    useEffect(() => {
        const savedAccent = localStorage.getItem('nexa_accent');
        const savedTheme = localStorage.getItem('nexa_theme');
        const savedAuto = localStorage.getItem('nexa_autospeak');
        const savedAutoSend = localStorage.getItem('nexa_autosend');
        const savedGender = localStorage.getItem('nexa_gender');
        const savedVoiceIdx = localStorage.getItem('nexa_voice_idx');
        const savedLang = localStorage.getItem('nexa_lang');
        if (savedAccent) setAccent(savedAccent);
        if (savedTheme) setThemeName(savedTheme as any);
        if (savedAuto) setAutoSpeak(savedAuto === 'true');
        if (savedAutoSend) setAutoSend(savedAutoSend === 'true');
        if (savedGender) setVoiceGender(savedGender as any);
        if (savedVoiceIdx) setVoiceIndex(parseInt(savedVoiceIdx));
        if (savedLang) setLang(savedLang || 'es');

        const loadVoices = () => {
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                setAvailableVoices(window.speechSynthesis.getVoices());
            }
        };
        loadVoices();
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.onvoiceschanged = loadVoices;
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('nexa_accent', accent);
        localStorage.setItem('nexa_theme', themeName);
        localStorage.setItem('nexa_autospeak', autoSpeak.toString());
        localStorage.setItem('nexa_autosend', autoSend.toString());
        localStorage.setItem('nexa_gender', voiceGender);
        localStorage.setItem('nexa_voice_idx', voiceIndex.toString());
        localStorage.setItem('nexa_lang', lang);
    }, [accent, themeName, autoSpeak, autoSend, voiceGender, voiceIndex, lang]);

    // ─── Auth ───
    useEffect(() => {
        sb.auth.getUser().then(({ data }: any) => setUser(data.user));
        const { data: { subscription } } = sb.auth.onAuthStateChange((_: any, s: any) => setUser(s?.user ?? null));
        return () => subscription.unsubscribe();
    }, []);

    // ─── Welcome ───
    useEffect(() => {
        if (!welcomeDone && user) {
            const hour = new Date().getHours();
            let timeGreeting: string;
            if (hour >= 5 && hour < 12) timeGreeting = 'Buenos días';
            else if (hour >= 12 && hour < 19) timeGreeting = 'Buenas tardes';
            else timeGreeting = 'Buenas noches';
            const greet = `${timeGreeting}. Soy NEXA, ¿en qué te puedo ayudar?`;
            setDynamicGreeting(greet);
            setTimeout(() => { speak(greet); setWelcomeDone(true); }, 1500);
        }
    }, [user, welcomeDone]);

    // ─── Connection ───
    useEffect(() => { checkConn(); const i = setInterval(checkConn, 30000); return () => clearInterval(i); }, []);
    useEffect(() => { loadConvs(); }, []);

    const checkConn = async () => {
        setConn('check');
        try { const r = await fetch('/', { method: 'HEAD', signal: AbortSignal.timeout(8000) }); setConn(r.ok ? 'ok' : 'err'); }
        catch { setConn('err'); }
    };

    // ─── Conversations ───
    const loadConvs = async () => {
        try {
            const { data } = await sb.from('conversations').select('*').order('updated_at', { ascending: false });
            if (data) setConvs(data);
        } catch { }
    };

    const createConv = async (title = 'Nueva conversación') => {
        const local: Conv = { id: `c-${Date.now()}`, title };
        try {
            const { data } = await sb.from('conversations').insert({ title }).select().single();
            if (data) { local.id = data.id; local.title = data.title; }
        } catch { }
        setConvs(p => [local, ...p]);
        setConvId(local.id);
        setMsgs([]);
        return local.id;
    };

    const selConv = async (id: string) => {
        setConvId(id); setDrawer(false); setView('chat');
        try {
            const { data } = await sb.from('messages').select('*').eq('conversation_id', id).order('created_at');
            if (data) setMsgs(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content, ts: +new Date(m.created_at) })));
        } catch { }
    };

    // ─── Speech ───
    const cleanForSpeech = (text: string) => {
        return text.replace(/#{1,6}\s*/g, '').replace(/\*{1,3}(.+?)\*{1,3}/g, '$1').replace(/_{1,3}(.+?)_{1,3}/g, '$1').replace(/~~(.+?)~~/g, '$1').replace(/```[\s\S]*?```/g, 'código').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/^>\s*/gm, '').replace(/^[-*_]{3,}\s*$/gm, '').replace(/^[\s]*[-*+]\s+/gm, '').replace(/^[\s]*\d+\.\s+/gm, '').replace(/<[^>]+>/g, '').replace(/[|→←↑↓►◄★●○◆■□▲△▼▽]/g, '').replace(/\n{2,}/g, '. ').replace(/\n/g, '. ').replace(/\s{2,}/g, ' ').trim();
    };

    const speak = useCallback((text: string) => {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const cleaned = cleanForSpeech(text);
        if (!cleaned) return;
        const u = new SpeechSynthesisUtterance(cleaned);
        u.lang = lang === 'es' ? 'es-ES' : 'en-US';
        const filteredVoices = availableVoices.filter(v => v.lang.includes(lang.split('-')[0]) && (voiceGender === 'male' ? (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('guy') || v.name.toLowerCase().includes('man')) : (v.name.toLowerCase().includes('female') || v.name.toLowerCase().includes('woman') || v.name.toLowerCase().includes('girl'))));
        const v = filteredVoices[voiceIndex % filteredVoices.length] || filteredVoices[0];
        if (v) u.voice = v;
        u.onstart = () => setSpeaking(true);
        u.onend = () => { setSpeaking(false); if (autoSend) setTimeout(toggleRec, 500); };
        window.speechSynthesis.speak(u);
    }, [lang, availableVoices, voiceGender, voiceIndex, autoSend]);

    // ─── Voice Recording ───
    const toggleRec = useCallback(() => {
        if (recording) { recRef.current?.stop(); setRecording(false); return; }
        const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SR) { alert('Tu navegador no soporta reconocimiento de voz'); return; }
        const r = new SR(); r.lang = lang === 'es' ? 'es-ES' : 'en-US'; r.continuous = true; r.interimResults = true;
        r.onstart = () => setRecording(true);
        r.onresult = (e: any) => {
            let txt = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                txt += e.results[i][0].transcript;
                if (e.results[i].isFinal && autoSend) {
                    const finalTxt = txt.trim();
                    setTimeout(() => { if (finalTxt) { send(finalTxt); r.stop(); setRecording(false); } }, 500);
                }
            }
            setInput(txt);
        };
        r.onerror = () => setRecording(false); r.onend = () => setRecording(false);
        r.start(); recRef.current = r;
    }, [recording, lang, autoSend]);

    // ─── Send Message ───
    const send = async (overrideText?: string) => {
        const text = overrideText || input.trim();
        if ((!text && attachedFiles.length === 0) || streaming || thinking) return;

        let messageContent = text;
        if (attachedFiles.length > 0) {
            const fileInfo = attachedFiles.map(f => `[📎 ${f.name} (${f.type})]`).join(' ');
            messageContent = text ? `${text}\n\n${fileInfo}` : fileInfo;
        }

        setInput(''); setSuggestion(''); setAttachedFiles([]);
        let cid = convId ?? await createConv(messageContent.slice(0, 50));
        if (!convId) setConvId(cid);
        const um: Msg = { id: `u-${Date.now()}`, role: 'user', content: messageContent, ts: Date.now() };
        try { await sb.from('messages').insert({ conversation_id: cid, role: 'user', content: messageContent }); } catch { }
        setMsgs(p => [...p, um]);
        setThinking(true);
        const aid = `a-${Date.now()}`;
        setTimeout(() => { setMsgs(p => [...p, { id: aid, role: 'assistant', content: '', ts: Date.now(), streaming: true }]); setThinking(false); setStreaming(true); }, 200);
        try {
            const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...msgs, um].map(m => ({ role: m.role, content: m.content })) }), });
            if (!res.ok) {
                const e = await res.json().catch(() => ({}));
                if (res.status === 403) throw new Error(e.error || 'Mensaje bloqueado por seguridad NEXA.');
                throw new Error(e.error || `Error ${res.status}`);
            }
            const reader = res.body?.getReader(); const dec = new TextDecoder(); let full = '';
            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    for (const line of dec.decode(value, { stream: true }).split('\n\n')) {
                        if (!line.startsWith('data: ')) continue;
                        try {
                            const d = JSON.parse(line.slice(6));
                            if (d.text) { full += d.text; setMsgs(p => p.map(m => m.id === aid ? { ...m, content: full } : m)); }
                            if (d.done) {
                                const finalContent = full || d.fullResponse;
                                setMsgs(p => p.map(m => m.id === aid ? { ...m, content: finalContent, streaming: false } : m));
                                if (autoSpeak) speak(finalContent);
                            }
                        } catch { }
                    }
                }
            }
            if (full) try { await sb.from('messages').insert({ conversation_id: cid, role: 'assistant', content: full }); } catch { }
        } catch (e: any) { setMsgs(p => p.map(m => m.id === aid ? { ...m, content: `❌ Error: ${e.message}`, streaming: false } : m)); } finally { setStreaming(false); setThinking(false); }
    };

    // ─── Vision ───
    const analyzeImage = async (file: File, question?: string) => {
        setThinking(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((res, rej) => {
                reader.onload = () => { const r = reader.result as string; res(r.split(',')[1]); };
                reader.onerror = rej;
                reader.readAsDataURL(file);
            });
            const qMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: question || '🖼️ [Imagen enviada para análisis]', ts: Date.now() };
            setMsgs(p => [...p, qMsg]);
            const res = await fetch('/api/vision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image: base64, mimeType: file.type, question }) });
            if (res.ok) {
                const data = await res.json();
                setMsgs(p => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: data.response, ts: Date.now() }]);
                if (autoSpeak) speak(data.response);
            } else {
                const err = await res.json().catch(() => ({}));
                setMsgs(p => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: `❌ Error: ${err.error || 'Error desconocido'}`, ts: Date.now() }]);
            }
        } catch (e: any) {
            setMsgs(p => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: `❌ Error: ${e.message}`, ts: Date.now() }]);
        } finally { setThinking(false); }
    };

    // ─── Helpers ───
    const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

    // ─── Suggestion autocomplete ───
    useEffect(() => {
        const h = setTimeout(async () => {
            if (input.length > 5 && !streaming && !thinking && !recording) {
                try {
                    const res = await fetch('/api/chat', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ messages: [{ role: 'system', content: 'Suggest the next 3-5 words for the user input. ONLY return the words. NO punctuation at the start. If you cannot, return empty.' }, { role: 'user', content: input }], max_tokens: 10 }),
                    });
                    if (res.ok) { const d = await res.json(); setSuggestion(d.fullResponse?.trim() || ''); }
                } catch { }
            } else { setSuggestion(''); }
        }, 800);
        return () => clearTimeout(h);
    }, [input, streaming, thinking, recording]);

    return (
        <div role="application" aria-label="NEXA AI Chat Interface" style={{ position: 'fixed', inset: 0, background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.3s' }}>
            <a href="#nexa-chat-input" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }} onFocus={(e) => { e.currentTarget.style.left = '8px'; e.currentTarget.style.top = '8px'; e.currentTarget.style.width = 'auto'; e.currentTarget.style.height = 'auto'; e.currentTarget.style.zIndex = '9999'; e.currentTarget.style.background = accent; e.currentTarget.style.color = '#000'; e.currentTarget.style.padding = '8px 16px'; e.currentTarget.style.borderRadius = '8px'; e.currentTarget.style.fontSize = '14px'; e.currentTarget.style.fontWeight = '700'; }}>
                Saltar al chat
            </a>

            <Sidebar isOpen={drawer} onClose={() => setDrawer(false)} conversations={convs} activeConvId={convId} search={search} onSearchChange={setSearch} onSelectConv={selConv} onCreateConv={() => createConv()} onOpenSettings={() => setShowSettings(true)} accent={accent} theme={T} />

            {view === 'chat' && (
                <main role="main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
                    <Header accent={accent} theme={T} resolvedTheme={resolvedTheme} conn={conn} thinking={thinking} streaming={streaming} speaking={speaking} showHeaderMenu={showHeaderMenu} onToggleMenu={() => setShowHeaderMenu(!showHeaderMenu)} onOpenDrawer={() => setDrawer(true)} onOpenSettings={() => setShowSettings(true)} onCreateConv={() => createConv()} onToggleTheme={toggleTheme} onStopSpeaking={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} onSignOut={async () => { await sb?.auth.signOut(); }} />

                    <div ref={chatContainerRef} role="log" aria-label="Mensajes del chat" aria-live="polite" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', WebkitOverflowScrolling: 'touch' as any, overscrollBehaviorY: 'contain', minHeight: 0, scrollBehavior: 'smooth' }}>
                        {msgs.length === 0 ? (
                            <EmptyState greeting={dynamicGreeting} accent={accent} theme={T} />
                        ) : (
                            <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {msgs.map(m => (
                                    <MessageBubble key={m.id} message={m} accent={accent} theme={T} onCopy={copyToClipboard} onSpeak={speak} onRegenerate={send} onCreateBranch={async (content) => { await createConv(`Rama: ${content.slice(0, 30)}...`); }} onEdit={(content) => setInput(content)} />
                                ))}
                                <div ref={endRef} style={{ height: 20 }} />
                            </div>
                        )}
                    </div>

                    {showScrollBtn && msgs.length > 0 && (
                        <button aria-label="Ir al último mensaje" onClick={() => { userScrolledRef.current = false; setShowScrollBtn(false); scrollToBottom(); }}
                            style={{ position: 'absolute', bottom: 180, right: 20, zIndex: 50, width: 40, height: 40, borderRadius: '50%', background: accent, color: '#000', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 20px ${accent}50`, transition: 'opacity 0.3s' }}>
                            <ArrowUp size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    )}

                    <ChatInput input={input} suggestion={suggestion} recording={recording} thinking={thinking} streaming={streaming} autoSend={autoSend} showUpload={showUpload} attachedFiles={attachedFiles} accent={accent} theme={T} onInputChange={setInput} onSend={() => send()} onToggleRec={toggleRec} onToggleUpload={() => setShowUpload(!showUpload)} onFilesSelected={(files) => setAttachedFiles(p => [...p, ...files])} onRemoveFile={(id) => setAttachedFiles(p => p.filter(f => f.id !== id))} onAnalyzeImage={analyzeImage} />
                </main>
            )}

            <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} theme={themeName} onThemeChange={(t: any) => setThemeName(t)} locale={lang} onLocaleChange={(l: any) => setLang(l)} />

            <style>{`@keyframes nexa-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } } textarea::-webkit-scrollbar { width: 0px; }`}</style>
        </div>
    );
}
