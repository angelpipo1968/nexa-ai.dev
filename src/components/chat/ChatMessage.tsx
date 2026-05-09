'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy, ThumbsUp, ThumbsDown, RotateCcw, Edit,
    FolderInput, MoreVertical, Volume2,
} from 'lucide-react';

export interface Msg {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ts: number;
    streaming?: boolean;
}

interface ChatMessageProps {
    msg: Msg;
    accent: string;
    theme: { bg: string; surf: string; border: string; text: string; sec: string; muted: string };
    activeMsgMenu: string | null;
    setActiveMsgMenu: (id: string | null) => void;
    onCopy: (text: string) => void;
    onSpeak: (text: string) => void;
    onEdit: (text: string) => void;
    onRegenerate: (text: string) => void;
    onBranch: (text: string) => void;
}

export function renderMessageContent(content: string) {
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
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>;
    });
}

export function ChatMessage({
    msg,
    accent,
    theme: T,
    activeMsgMenu,
    setActiveMsgMenu,
    onCopy,
    onSpeak,
    onEdit,
    onRegenerate,
    onBranch,
}: ChatMessageProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
                position: 'relative',
                maxWidth: '90%',
                padding: '14px 18px',
                borderRadius: msg.role === 'user' ? '22px 22px 4px 22px' : '22px 22px 22px 4px',
                background: msg.role === 'user' ? `${accent}12` : T.surf,
                border: `1px solid ${msg.role === 'user' ? `${accent}25` : T.border}`,
                fontSize: 15,
                lineHeight: 1.65,
                color: T.text,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow: msg.role === 'assistant' ? '0 4px 20px rgba(0,0,0,0.2)' : 'none'
            }}>
                {renderMessageContent(msg.content)}
            </div>
            {msg.role === 'assistant' && !msg.streaming && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10, paddingLeft: 6, position: 'relative' }}>
                    <button aria-label="Copiar respuesta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => onCopy(msg.content)} title="Copiar"><Copy size={16} /></button>
                    <button aria-label="Me gusta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} title="Me gusta"><ThumbsUp size={16} /></button>
                    <button aria-label="No me gusta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} title="No me gusta"><ThumbsDown size={16} /></button>
                    <button aria-label="Regenerar respuesta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => onRegenerate(msg.content)} title="Regenerar"><RotateCcw size={16} /></button>
                    <div style={{ position: 'relative' }}>
                        <button style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => setActiveMsgMenu(activeMsgMenu === msg.id ? null : msg.id)}><MoreVertical size={16} /></button>
                        <AnimatePresence>
                            {activeMsgMenu === msg.id && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setActiveMsgMenu(null)} />
                                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 10, zIndex: 101, width: 220, background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', border: `1px solid ${T.border}`, borderRadius: 16, padding: 6, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                        <button onClick={() => { onSpeak(msg.content); setActiveMsgMenu(null); }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                            <Volume2 size={16} /> Leer en voz alta
                                        </button>
                                        <button onClick={() => { onEdit(msg.content); setActiveMsgMenu(null); }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}
                                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                            onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                            <Edit size={16} /> Editar
                                        </button>
                                        <button onClick={() => { onBranch(msg.content); setActiveMsgMenu(null); }}
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
    );
}
