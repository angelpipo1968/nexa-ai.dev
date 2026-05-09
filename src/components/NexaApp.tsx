'use client';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSupabase } from '@/lib/supabase';
import { 
    FileText, Image as ImageIcon, Film, Music, Camera, 
    Plus, Send, Mic, MicOff, Menu, X, Settings, 
    User, LogOut, ChevronLeft, Volume2, VolumeX,
    Zap, Search, RefreshCw, Loader2, StopCircle, ArrowUp,
    MoreVertical, Download, Trash2, Moon, Sun, Monitor,
    Copy, ThumbsUp, ThumbsDown, Share, RotateCcw, Edit,
    Pin, Archive, FolderInput, CopyPlus, Upload, File, AlertCircle,
    Sparkles
} from 'lucide-react';

import { SettingsPanel } from './SettingsPanel';

const COLORS = {
    cyan: '#00e5a0',
    purple: '#a855f7',
    orange: '#f97316',
    pink: '#ec4899',
    blue: '#3b82f6',
    red: '#ef4444',
};

const THEMES = {
    light: { bg: '#ffffff', surf: '#f4f4f5', border: '#e4e4e7', text: '#18181b', sec: '#71717a', muted: '#a1a1aa' },
    dark: { bg: '#09090b', surf: '#18181b', border: '#27272a', text: '#f4f4f5', sec: '#a1a1aa', muted: '#71717a' },
    ultra: { bg: '#000000', surf: '#0a0a0a', border: '#1a1a1a', text: '#e0e0e0', sec: '#808080', muted: '#404040' },
};

// ═══════════════════════════════════════════
//  CONFIGURACIÓN DE FORMATOS
// ═══════════════════════════════════════════

const FILE_TYPES = {
    document: {
        icon: FileText,
        label: 'Subir documento',
        color: '#3b82f6',
        accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.js,.ts,.py,.html,.css,.json,.xml,.md',
        maxSize: 20 * 1024 * 1024,
        description: 'PDF, Word, Excel, PPT...',
    },
    image: {
        icon: ImageIcon,
        label: 'Subir imagen',
        color: '#a855f7',
        accept: 'image/*,.heic,.heic',
        maxSize: 10 * 1024 * 1024,
        description: 'JPG, PNG, GIF, WebP...',
    },
    video: {
        icon: Film,
        label: 'Subir video',
        color: '#ec4899',
        accept: 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/3gpp',
        maxSize: 100 * 1024 * 1024,
        description: 'MP4, WebM, MOV...',
    },
    audio: {
        icon: Music,
        label: 'Subir audio',
        color: '#f97316',
        accept: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/flac,audio/webm',
        maxSize: 50 * 1024 * 1024,
        description: 'MP3, WAV, OGG...',
    },
    camera: {
        icon: Camera,
        label: 'Activar Cámara',
        color: '#3b82f6',
        accept: 'image/*,video/*',
        maxSize: 50 * 1024 * 1024,
        description: 'Foto o video directo',
    },
} as const;

type FileType = keyof typeof FILE_TYPES;

interface UploadedFile {
    id: string;
    type: FileType;
    name: string;
    size: number;
    preview?: string;
    data: string; // base64
    mimeType: string;
}

interface Msg { id: string; role: 'user' | 'assistant'; content: string; ts: number; streaming?: boolean; }
interface Conv { id: string; title: string; pinned?: boolean; archived?: boolean; }

// ═══════════════════════════════════════════
//  COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════

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
    const [activeConvMenu, setActiveConvMenu] = useState<string | null>(null);
    const [activeMsgMenu, setActiveMsgMenu] = useState<string | null>(null);
    const [showSettings, setShowSettings] = useState(false);
    const [showHeaderMenu, setShowHeaderMenu] = useState(false);
    const [reasoning, setReasoning] = useState<string[]>([]);
    const [showReasoning, setShowReasoning] = useState(false);
    const [analyzingImage, setAnalyzingImage] = useState(false);
    
    // Auth
    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [pass, setPass] = useState('');
    const [authErr, setAuthErr] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // Settings States (Persisted)
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

    const scrollToBottom = () => {
        const container = chatContainerRef.current;
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    };

    // Detectar si el usuario está cerca del fondo (dentro de 150px)
    const isNearBottom = () => {
        const container = chatContainerRef.current;
        if (!container) return true;
        return container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    };

    // Auto-scroll solo si el usuario ya estaba abajo
    const userScrolledRef = useRef(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        const handleScroll = () => {
            const nearBottom = isNearBottom();
            if (!streaming) {
                userScrolledRef.current = !nearBottom;
                setShowScrollBtn(!nearBottom);
            }
        };
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [streaming]);

    useEffect(() => {
        // Solo auto-scroll si el usuario NO ha subido a leer
        if (!userScrolledRef.current) {
            scrollToBottom();
        }
    }, [msgs]);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const recRef = useRef<any>(null);
    const sb = getSupabase();

    // Theme logic
    useEffect(() => {
        if (themeName === 'system') {
            const mql = window.matchMedia('(prefers-color-scheme: dark)');
            const update = () => setResolvedTheme(mql.matches ? 'dark' : 'light');
            update();
            mql.addEventListener('change', update);
            return () => mql.removeEventListener('change', update);
        } else { setResolvedTheme(themeName as keyof typeof THEMES); }
    }, [themeName]);

    const T = THEMES[resolvedTheme];

    const toggleTheme = () => {
        const next = resolvedTheme === 'dark' ? 'light' : 'dark';
        setThemeName(next);
        localStorage.setItem('nexa_theme', next);
    };

    // Persistence & Initialization
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
                const voices = window.speechSynthesis.getVoices();
                setAvailableVoices(voices);
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

    useEffect(() => { if (!userScrolledRef.current) scrollToBottom(); endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

    // Auto-scroll durante streaming — solo si el usuario está abajo
    useEffect(() => {
        if (streaming) {
            const interval = setInterval(() => {
                if (!userScrolledRef.current) scrollToBottom();
            }, 100);
            return () => clearInterval(interval);
        } else {
            // Al terminar el streaming, resetear el flag
            userScrolledRef.current = false;
        }
    }, [streaming]);
    
    useEffect(() => {
        const el = inputRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
        
        const h = setTimeout(async () => {
            if (input.length > 5 && !streaming && !thinking && !recording) {
                try {
                    const res = await fetch('/api/chat', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            messages: [{ role: 'system', content: 'Suggest the next 3-5 words for the user input. ONLY return the words. NO punctuation at the start. If you cannot, return empty.' }, { role: 'user', content: input }],
                            max_tokens: 10
                        }),
                    });
                    if (res.ok) {
                        const d = await res.json();
                        setSuggestion(d.fullResponse?.trim() || '');
                    }
                } catch { }
            } else { setSuggestion(''); }
        }, 800);
        return () => clearTimeout(h);
    }, [input, streaming, thinking, recording]);

    useEffect(() => {
        sb.auth.getUser().then(({ data }: any) => setUser(data.user));
        const { data: { subscription } } = sb.auth.onAuthStateChange((_: any, s: any) => setUser(s?.user ?? null));
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        if (!welcomeDone && user) {
            const hour = new Date().getHours();

            let timeGreeting: string;
            if (hour >= 5 && hour < 12) timeGreeting = 'Buenos días';
            else if (hour >= 12 && hour < 19) timeGreeting = 'Buenas tardes';
            else timeGreeting = 'Buenas noches';

            const greet = `${timeGreeting}. Soy NEXA, ¿en qué te puedo ayudar?`;
            
            setDynamicGreeting(greet);
            
            setTimeout(() => { 
                speak(greet); 
                setWelcomeDone(true); 
            }, 1500);
        }
    }, [user, welcomeDone]);

    useEffect(() => { checkConn(); const i = setInterval(checkConn, 30000); return () => clearInterval(i); }, []);
    useEffect(() => { loadConvs(); }, []);

    const checkConn = async () => {
        setConn('check');
        try { const r = await fetch('/', { method: 'HEAD', signal: AbortSignal.timeout(8000) }); setConn(r.ok ? 'ok' : 'err'); }
        catch { setConn('err'); }
    };

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

    const delConv = async (id: string) => {
        try { await sb.from('messages').delete().eq('conversation_id', id); await sb.from('conversations').delete().eq('id', id); } catch { }
        setConvs(p => p.filter(c => c.id !== id));
        if (convId === id) { setConvId(null); setMsgs([]); }
    };

    const selConv = async (id: string) => {
        setConvId(id); setDrawer(false); setView('chat');
        try {
            const { data } = await sb.from('messages').select('*').eq('conversation_id', id).order('created_at');
            if (data) setMsgs(data.map((m: any) => ({ id: m.id, role: m.role, content: m.content, ts: +new Date(m.created_at) })));
        } catch { }
    };

    const exportConv = (id: string, format: 'json' | 'txt') => {
        const c = convs.find(cv => cv.id === id);
        const content = format === 'json' ? JSON.stringify({ title: c?.title, messages: msgs }, null, 2) : msgs.map(m => `${m.role.toUpperCase()}: ${renderMessageContent(m.content)}`).join('\n\n');
        const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${c?.title || 'nexa-chat'}.${format}`; a.click();
        URL.revokeObjectURL(url);
    };

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
                if (res.status === 403) {
                    throw new Error(e.error || 'Mensaje bloqueado por seguridad NEXA.');
                }
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

    const toggleRec = () => {
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
    };

    const cleanForSpeech = (text: string) => {
        return text
            .replace(/#{1,6}\s*/g, '')
            .replace(/\*{1,3}(.+?)\*{1,3}/g, '$1')
            .replace(/_{1,3}(.+?)_{1,3}/g, '$1')
            .replace(/~~(.+?)~~/g, '$1')
            .replace(/```[\s\S]*?```/g, 'código')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/$$([^$$]+)\]$$[^)]+$$/g, '$1')
            .replace(/!$$([^$$]*)\]$$[^)]+$$/g, '$1')
            .replace(/^>\s*/gm, '')
            .replace(/^[-*_]{3,}\s*$/gm, '')
            .replace(/^[\s]*[-*+]\s+/gm, '')
            .replace(/^[\s]*\d+\.\s+/gm, '')
            .replace(/<[^>]+>/g, '')
            .replace(/[|→←↑↓►◄★☆●○◆◇■□▲△▼▽]/g, '')
            .replace(/\n{2,}/g, '. ')
            .replace(/\n/g, '. ')
            .replace(/\s{2,}/g, ' ')
            .trim();
    };

    const speak = (text: string) => {
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
    };

    // ─── Visión: Analizar imagen ───
    const analyzeImage = async (file: File, question?: string) => {
        setAnalyzingImage(true);
        try {
            const reader = new FileReader();
            const base64 = await new Promise<string>((res, rej) => {
                reader.onload = () => {
                    const r = reader.result as string;
                    res(r.split(',')[1]);
                };
                reader.onerror = rej;
                reader.readAsDataURL(file);
            });

            const qMsg: Msg = { id: `u-${Date.now()}`, role: 'user', content: question || '🖼️ [Imagen enviada para análisis]', ts: Date.now() };
            setMsgs(p => [...p, qMsg]);
            setThinking(true);

            const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64, mimeType: file.type, question }),
            });

            if (res.ok) {
                const data = await res.json();
                const aMsg: Msg = { id: `a-${Date.now()}`, role: 'assistant', content: data.response, ts: Date.now() };
                setMsgs(p => [...p, aMsg]);
                if (autoSpeak) speak(data.response);
            } else {
                const err = await res.json().catch(() => ({}));
                setMsgs(p => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: `❌ Error al analizar imagen: ${err.error || 'Error desconocido'}`, ts: Date.now() }]);
            }
        } catch (e: any) {
            setMsgs(p => [...p, { id: `a-${Date.now()}`, role: 'assistant', content: `❌ Error: ${e.message}`, ts: Date.now() }]);
        } finally {
            setAnalyzingImage(false);
            setThinking(false);
        }
    };

    // ─── Renderizado de código en mensajes ───
    const renderMessageContent = (content: string) => {
        // Split by code blocks
        const parts = content.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```')) {
                const match = part.match(/```(\w+)?\n?([\s\S]*?)```/);
                if (match) {
                    const lang = match[1] || 'code';
                    const code = match[2].trim();
                    return (
                        <div key={i} style={{ margin: '12px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid #27272a' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', background: '#1a1a1a', borderBottom: '1px solid #27272a' }}>
                                <span style={{ fontSize: 12, color: '#00e5a0', fontWeight: 600, textTransform: 'uppercase' }}>{lang}</span>
                                <button onClick={() => navigator.clipboard.writeText(code)} style={{ background: 'none', border: 'none', color: '#71717a', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    📋 Copiar
                                </button>
                            </div>
                            <pre style={{ padding: '14px', background: '#0a0a0a', overflow: 'auto', maxHeight: 400, margin: 0, WebkitOverflowScrolling: 'touch' as any }}>
                                <code style={{ fontSize: 13, lineHeight: 1.6, fontFamily: "'JetBrains Mono', 'Fira Code', monospace", color: '#e0e0e0' }}>{code}</code>
                            </pre>
                        </div>
                    );
                }
            }
            // Regular text with markdown-like formatting
            return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
        });
    };

    const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

    const filtered = convs.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
    const ibtn: React.CSSProperties = { background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
    const menuBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500, width: '100%', transition: 'background 0.15s', fontFamily: 'inherit' };

    return (
        <div role="application" aria-label="NEXA AI Chat Interface" style={{ position: 'fixed', inset: 0, background: T.bg, color: T.text, fontFamily: "'Inter',sans-serif", display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'background 0.3s' }}>
            <a href="#nexa-chat-input" style={{ position: 'absolute', left: -9999, top: 'auto', width: 1, height: 1, overflow: 'hidden' }} onFocus={(e) => { e.currentTarget.style.left = '8px'; e.currentTarget.style.top = '8px'; e.currentTarget.style.width = 'auto'; e.currentTarget.style.height = 'auto'; e.currentTarget.style.zIndex = '9999'; e.currentTarget.style.background = accent; e.currentTarget.style.color = '#000'; e.currentTarget.style.padding = '8px 16px'; e.currentTarget.style.borderRadius = '8px'; e.currentTarget.style.fontSize = '14px'; e.currentTarget.style.fontWeight = '700'; }}>
                Saltar al chat
            </a>
            <AnimatePresence>{drawer && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />}</AnimatePresence>

            <AnimatePresence>
                {drawer && (
                    <motion.aside role="navigation" aria-label="Historial de conversaciones" initial={{ x: -290 }} animate={{ x: 0 }} exit={{ x: -290 }} transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                        style={{ position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50, width: 280, background: T.surf, borderRight: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '18px 14px 14px', borderBottom: `1px solid ${T.border}` }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2 }}>NEXA</div>
                                        <div style={{ fontSize: 8, color: accent, letterSpacing: 2, textTransform: 'uppercase' }}>V3 CLEAN CORE</div>
                                    </div>
                                </div>
                                <button aria-label="Cerrar panel lateral" onClick={() => setDrawer(false)} style={{ ...ibtn, fontSize: 20 }}>✕</button>
                            </div>
                            <button onClick={async () => { await createConv(); setDrawer(false); setView('chat'); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}30`, color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ NUEVO CHAT</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
                            {filtered.map(c => (
                                <div key={c.id} style={{ position: 'relative', marginBottom: 2 }}>
                                    <button onClick={() => selConv(c.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: 10, background: convId === c.id ? `${accent}10` : 'transparent', border: 'none', color: convId === c.id ? accent : T.sec, fontSize: 12, textAlign: 'left', cursor: 'pointer' }}>
                                        {c.pinned && <Pin size={10} style={{ transform: 'rotate(45deg)' }} />}
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                                    </button>
                                    <button onClick={() => setActiveConvMenu(activeConvMenu === c.id ? null : c.id)} style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', padding: 6, background: 'none', border: 'none', color: T.muted, cursor: 'pointer' }}><MoreVertical size={14} /></button>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button onClick={() => { setShowSettings(true); setDrawer(false); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 10, background: T.surf, border: `1px solid ${T.border}`, color: T.sec, fontSize: 12, cursor: 'pointer' }}>
                                <Sparkles size={14} />
                                Configuración
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* CHAT VIEW */}
            {view === 'chat' && (
                <main role="main" style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', zIndex: 10 }}>
                    <header role="banner" style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '12px 16px', 
                        background: `${T.bg}CC`, 
                        backdropFilter: 'blur(20px)', 
                        borderBottom: `1px solid ${T.border}`, 
                        flexShrink: 0,
                        zIndex: 30
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <button aria-label="Abrir historial de chats" onClick={() => setDrawer(true)} style={{ ...ibtn, color: accent, background: `${accent}10`, padding: 10 }}>
                                <Menu size={22} />
                            </button>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ position: 'relative' }}>
                                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
                                    <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: conn === 'ok' ? accent : '#ef4444', border: `2px solid ${T.bg}` }} />
                                </div>
                                <div style={{ cursor: 'pointer' }} onClick={checkConn}>
                                    <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.2 }}>NEXA CORE</div>
                                    <div style={{ fontSize: 9, color: thinking || streaming ? accent : T.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                        {thinking ? '🧠 Pensando y razonando...' : streaming ? 'Transmitiendo...' : conn === 'ok' ? 'En línea' : 'Desconectado'}
                                        <span style={{ color: accent, opacity: 0.7 }}>• Protected</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            {speaking && <button aria-label="Detener voz" onClick={() => { window.speechSynthesis.cancel(); setSpeaking(false); }} style={{ ...ibtn, color: accent, background: `${accent}10` }} title="Detener voz"><VolumeX size={18} /></button>}
                            <button aria-label="Menú de opciones" onClick={() => setShowHeaderMenu(!showHeaderMenu)} style={{ ...ibtn, color: accent, background: `${accent}10` }} title="Menú"><MoreVertical size={20} /></button>
                            <button aria-label="Abrir configuración" onClick={() => setShowSettings(true)} style={{ ...ibtn, color: accent, background: `${accent}10` }} title="Ajustes"><Settings size={20} /></button>
                            <button aria-label="Crear nuevo chat" onClick={() => createConv()} style={{ ...ibtn, color: accent, background: `${accent}10` }} title="Nuevo chat"><Plus size={20} /></button>
                        </div>
                    </header>
                    
                    {/* ═══ Header Dropdown Menu ═══ */}
                    <AnimatePresence>
                        {showHeaderMenu && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setShowHeaderMenu(false)}
                                    style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.4)' }}
                                />
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    transition={{ duration: 0.15 }}
                                    style={{
                                        position: 'fixed',
                                        top: 60,
                                        right: 12,
                                        zIndex: 50,
                                        background: T.surf,
                                        border: `1px solid ${T.border}`,
                                        borderRadius: 16,
                                        padding: 6,
                                        minWidth: 220,
                                        boxShadow: `0 16px 48px rgba(0,0,0,0.4)`,
                                    }}
                                >
                                    <button onClick={() => { setDrawer(true); setShowHeaderMenu(false); }} style={{ ...menuBtn, color: T.text }}>
                                        <Menu size={18} />
                                        <span>Historial de chats</span>
                                    </button>
                                    <button onClick={() => { setShowHeaderMenu(false); }} style={{ ...menuBtn, color: T.text }}>
                                        <Volume2 size={18} />
                                        <span>Seleccionar voz</span>
                                    </button>
                                    <button onClick={() => { setShowHeaderMenu(false); toggleTheme(); }} style={{ ...menuBtn, color: T.text }}>
                                        {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                        <span>{resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
                                    </button>
                                    <button onClick={() => { setShowSettings(true); setShowHeaderMenu(false); }} style={{ ...menuBtn, color: T.text }}>
                                        <Settings size={18} />
                                        <span>Configuración</span>
                                    </button>
                                    <div style={{ height: 1, background: T.border, margin: '4px 8px' }} />
                                    <button onClick={async () => { setShowHeaderMenu(false); await sb?.auth.signOut(); }} style={{ ...menuBtn, color: '#ef4444' }}>
                                        <LogOut size={18} />
                                        <span>Cerrar sesión</span>
                                    </button>
                                    <div style={{ height: 1, background: T.border, margin: '4px 8px' }} />
                                    <button onClick={() => setShowHeaderMenu(false)} style={{ ...menuBtn, color: T.muted, justifyContent: 'center' }}>
                                        <span>Cancelar</span>
                                    </button>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                    
                    <div ref={chatContainerRef} role="log" aria-label="Mensajes del chat" aria-live="polite" style={{ 
                        flex: 1, 
                        overflowY: 'auto', 
                        padding: '20px 16px', 
                        WebkitOverflowScrolling: 'touch' as any,
                        overscrollBehaviorY: 'contain',
                        minHeight: 0,
                        scrollBehavior: 'smooth'
                    }}>
                        {msgs.length === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 32, textAlign: 'center', padding: 20 }}>
                                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                                    <div style={{ fontSize: 80, marginBottom: 20, filter: `drop-shadow(0 0 20px ${accent}40)` }}>🧬</div>
                                    <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 16px', letterSpacing: -0.5, color: T.text, lineHeight: 1.2 }}>
                                        {dynamicGreeting || 'SISTEMA NEXA V3'}
                                    </h1>
                                    <p style={{ fontSize: 16, color: T.muted, margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
                                        Operativo y listo para procesar cualquier solicitud.
                                    </p>
                                </motion.div>
                            </div>
                        ) : (
                            <div style={{ maxWidth: 700, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
                                {msgs.map(m => (
                                    <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                                        <div style={{ 
                                            position: 'relative', 
                                            maxWidth: '90%', 
                                            padding: '14px 18px', 
                                            borderRadius: m.role === 'user' ? '22px 22px 4px 22px' : '22px 22px 22px 4px', 
                                            background: m.role === 'user' ? `${accent}12` : T.surf, 
                                            border: `1px solid ${m.role === 'user' ? `${accent}25` : T.border}`, 
                                            fontSize: 15, 
                                            lineHeight: 1.65, 
                                            color: T.text, 
                                            whiteSpace: 'pre-wrap', 
                                            wordBreak: 'break-word',
                                            boxShadow: m.role === 'assistant' ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
                                        }}>
                                            {renderMessageContent(m.content)}
                                        </div>
                                        {m.role === 'assistant' && !m.streaming && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, paddingLeft: 6, position: 'relative' }}>
                                                <button aria-label="Copiar respuesta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => copyToClipboard(m.content)} title="Copiar"><Copy size={16} /></button>
                                                <button aria-label="Me gusta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} title="Me gusta"><ThumbsUp size={16} /></button>
                                                <button aria-label="No me gusta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} title="No me gusta"><ThumbsDown size={16} /></button>
                                                <button aria-label="Regenerar respuesta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => send(m.content)} title="Regenerar"><RotateCcw size={16} /></button>
                                                <div style={{ position: 'relative' }}>
                                                    <button style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => setActiveMsgMenu(activeMsgMenu === m.id ? null : m.id)}><MoreVertical size={16} /></button>
                                                    <AnimatePresence>
                                                        {activeMsgMenu === m.id && (
                                                            <>
                                                                <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setActiveMsgMenu(null)} />
                                                                <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                                                    style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 10, zIndex: 101, width: 220, background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', border: `1px solid ${T.border}`, borderRadius: 16, padding: 6, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                                                    <button onClick={() => { speak(m.content); setActiveMsgMenu(null); }} 
                                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                                                        <Volume2 size={16} /> Leer en voz alta
                                                                    </button>
                                                                    <button onClick={() => { setInput(m.content); setActiveMsgMenu(null); }} 
                                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                                                        <Edit size={16} /> Editar
                                                                    </button>
                                                                    <button onClick={async () => { const nid = await createConv(`Rama: ${m.content.slice(0, 30)}...`); setActiveMsgMenu(null); }} 
                                                                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}
                                                                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                                                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                                                        <FolderInput size={16} /> Rama en nuevo chat
                                                                    </button>
                                                                </motion.div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <div ref={endRef} style={{ height: 20 }} />
                            </div>
                        )}
                    </div>

                    {/* Botón "Ir al final" — aparece cuando el usuario subió a leer */}
                    {showScrollBtn && msgs.length > 0 && (
                        <button
                            aria-label="Ir al último mensaje"
                            onClick={() => { userScrolledRef.current = false; setShowScrollBtn(false); scrollToBottom(); }}
                            style={{
                                position: 'absolute', bottom: 180, right: 20, zIndex: 50,
                                width: 40, height: 40, borderRadius: '50%',
                                background: accent, color: '#000', border: 'none',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 4px 20px ${accent}50`,
                                transition: 'opacity 0.3s',
                            }}
                        >
                            <ArrowUp size={18} style={{ transform: 'rotate(180deg)' }} />
                        </button>
                    )}

                    <FilePreview files={attachedFiles} onRemove={(id) => setAttachedFiles(p => p.filter(f => f.id !== id))} />
                    
                    <div role="region" aria-label="Área de entrada de mensajes" style={{ borderTop: `1px solid ${T.border}`, background: `${T.bg}F2`, backdropFilter: 'blur(20px)', padding: '14px 14px 24px', flexShrink: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, maxWidth: 600, margin: '0 auto', position: 'relative' }}>
                            <FileUpload isOpen={showUpload} onClose={() => setShowUpload(false)} onFilesSelected={(files) => setAttachedFiles(p => [...p, ...files])} />
                            
                            <button aria-label="Adjuntar archivo" onClick={() => setShowUpload(!showUpload)} style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, border: `1px solid ${attachedFiles.length > 0 ? `${accent}40` : T.border}`, background: attachedFiles.length > 0 ? `${accent}10` : T.surf, color: attachedFiles.length > 0 ? accent : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                                <Plus size={24} style={{ transform: showUpload ? 'rotate(45deg)' : 'none', transition: '0.3s' }} />
                                {attachedFiles.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: accent, color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{attachedFiles.length}</span>}
                            </button>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <div style={{ position: 'absolute', left: 18, top: 12, color: T.muted, opacity: 0.5, pointerEvents: 'none', fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontFamily: 'inherit' }}>
                                    {input}<span style={{ visibility: 'hidden' }}>{input}</span>{suggestion}
                                </div>
                                <textarea ref={inputRef} id="nexa-chat-input" aria-label="Escribe un mensaje" value={input} onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => { 
                                        if (e.key === 'Tab' && suggestion) { e.preventDefault(); setInput(input + suggestion); setSuggestion(''); }
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } 
                                    }}
                                    placeholder={recording ? 'Escuchando voz...' : 'Escribe un mensaje...'} rows={1}
                                    style={{ width: '100%', resize: 'none', borderRadius: 24, padding: '12px 18px', fontSize: 15, background: 'transparent', border: `1px solid ${recording ? accent : T.border}`, color: T.text, outline: 'none', maxHeight: 150, lineHeight: 1.5, boxSizing: 'border-box', fontFamily: 'inherit', position: 'relative', zIndex: 2 }} />
                                <button aria-label={recording ? 'Detener grabación de voz' : 'Activar grabación de voz'} onClick={toggleRec} style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: '50%', background: recording ? `${accent}20` : 'none', color: recording ? accent : T.muted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                                    {recording ? <StopCircle size={20} /> : <Mic size={20} />}
                                </button>
                            </div>
                            <button aria-label="Enviar mensaje" onClick={() => send()} disabled={(!input.trim() && attachedFiles.length === 0) || thinking || streaming}
                                style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, border: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? `1px solid ${T.border}` : 'none', background: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? (autoSend && recording ? accent : '#1a1a2e') : T.surf, color: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? '#f0f0f0' : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', cursor: 'pointer' }}>
                                {thinking ? <Loader2 size={20} style={{ animation: 'nexa-spin 1s linear infinite' }} /> : (autoSend && recording ? <Zap size={20} style={{ animation: 'pulse 1s infinite' }} /> : <ArrowUp size={20} />)}
                            </button>
                        </div>
                    </div>
                </main>
            )}

            <SettingsPanel 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
                theme={themeName} 
                onThemeChange={(t: any) => setThemeName(t)} 
                locale={lang} 
                onLocaleChange={(l: any) => setLang(l)} 
            />

            <style>{`@keyframes nexa-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} } @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } } textarea::-webkit-scrollbar { width: 0px; }`}</style>
        </div>
    );
}

// ═══════════════════════════════════════════
//  SUB-COMPONENTES DE ARCHIVOS
// ═══════════════════════════════════════════

function FileUpload({ isOpen, onClose, onFilesSelected }: { isOpen: boolean; onClose: () => void; onFilesSelected: (files: UploadedFile[]) => void }) {
    const fileRef = useRef<HTMLInputElement>(null);
    const camRef = useRef<HTMLInputElement>(null);
    const vidRef = useRef<HTMLInputElement>(null);
    const [activeType, setActiveType] = useState<FileType | null>(null);

    const processFiles = async (files: FileList, type: FileType) => {
        const config = FILE_TYPES[type];
        const processed: UploadedFile[] = [];
        for (const file of Array.from(files)) {
            if (file.size > config.maxSize) continue;
            try {
                const result = await new Promise<{ data: string; preview?: string }>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const r = reader.result as string;
                        const base64 = r.split(',')[1];
                        if (type === 'image' || type === 'camera') res({ data: base64, preview: r });
                        else res({ data: base64 });
                    };
                    reader.onerror = rej;
                    reader.readAsDataURL(file);
                });
                processed.push({ id: `f-${Date.now()}-${Math.random()}`, type, name: file.name, size: file.size, preview: result.preview, data: result.data, mimeType: file.type || 'application/octet-stream' });
            } catch { }
        }
        if (processed.length > 0) { 
            // Auto-analyze images with vision
            if ((type === 'image' || type === 'camera') && processed.length > 0) {
                onClose();
                for (const f of processed) {
                    const byteString = atob(f.data);
                    const ab = new ArrayBuffer(byteString.length);
                    const ia = new Uint8Array(ab);
                    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                    const blob = new Blob([ab], { type: f.mimeType });
                    const file = new File([blob], f.name, { type: f.mimeType });
                    await analyzeImage(file);
                }
                return;
            }
            onFilesSelected(processed); 
            onClose(); 
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'absolute', bottom: 60, left: 0, zIndex: 70, width: 240 }}>
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} 
                        style={{ position: 'relative', width: '100%', background: 'rgba(18, 18, 18, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid #222', borderRadius: 24, padding: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                        {(Object.entries(FILE_TYPES) as [FileType, any][]).map(([key, config]) => (
                            <button key={key} onClick={() => { setActiveType(key); if (key === 'camera') camRef.current?.click(); else if (key === 'video') vidRef.current?.click(); else { if (fileRef.current) { fileRef.current.accept = config.accept; fileRef.current.click(); } } }} 
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 16, transition: '0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0a0a0a', border: `1px solid ${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${config.color}15` }}>
                                    {<config.icon size={18} color={config.color} />}
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#eee' }}>{config.label}</span>
                            </button>
                        ))}
                    </motion.div>
                    <input ref={fileRef} type="file" multiple hidden onChange={(e) => { if (e.target.files && activeType) processFiles(e.target.files, activeType); }} />
                    <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { if (e.target.files) processFiles(e.target.files, 'camera'); }} />
                    <input ref={vidRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { if (e.target.files) processFiles(e.target.files, 'video'); }} />
                </div>
            )}
        </AnimatePresence>
    );
}

function FilePreview({ files, onRemove }: { files: UploadedFile[]; onRemove: (id: string) => void }) {
    if (files.length === 0) return null;
    return (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid #141428' }}>
            {files.map(f => (
                <div key={f.id} style={{ position: 'relative', width: 70, height: 70, borderRadius: 14, overflow: 'hidden', border: '1px solid #141428', background: '#0a0a14', flexShrink: 0 }}>
                    {f.preview ? <img src={f.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><File size={24} color="#4a4a68" /></div>}
                    <button onClick={() => onRemove(f.id)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
                </div>
            ))}
        </div>
    );
}
