'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, ThumbsUp, ThumbsDown, RotateCcw, Edit, FolderInput, Volume2, MoreVertical } from '../icons';

interface Msg {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ts: number;
    streaming?: boolean;
}

interface MessageBubbleProps {
    message: Msg;
    accent: string;
    theme: { surf: string; border: string; text: string; muted: string };
    onCopy: (text: string) => void;
    onSpeak: (text: string) => void;
    onRegenerate: (text: string) => void;
    onCreateBranch: (content: string) => void;
    onEdit: (content: string) => void;
}

function renderMessageContent(content: string) {
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

export function MessageBubble({ message: m, accent, theme: T, onCopy, onSpeak, onRegenerate, onCreateBranch, onEdit }: MessageBubbleProps) {
    const [activeMsgMenu, setActiveMsgMenu] = useState<string | null>(null);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
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
                    <button aria-label="Copiar respuesta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => onCopy(m.content)} title="Copiar"><Copy size={16} /></button>
                    <button aria-label="Me gusta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} title="Me gusta"><ThumbsUp size={16} /></button>
                    <button aria-label="No me gusta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} title="No me gusta"><ThumbsDown size={16} /></button>
                    <button aria-label="Regenerar respuesta" style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => onRegenerate(m.content)} title="Regenerar"><RotateCcw size={16} /></button>
                    <div style={{ position: 'relative' }}>
                        <button style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 4 }} onClick={() => setActiveMsgMenu(activeMsgMenu === m.id ? null : m.id)}><MoreVertical size={16} /></button>
                        <AnimatePresence>
                            {activeMsgMenu === m.id && (
                                <>
                                    <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setActiveMsgMenu(null)} />
                                    <motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                        style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 10, zIndex: 101, width: 220, background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(10px)', border: `1px solid ${T.border}`, borderRadius: 16, padding: 6, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                                        <button onClick={() => { onSpeak(m.content); setActiveMsgMenu(null); }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}>
                                            <Volume2 size={16} /> Leer en voz alta
                                        </button>
                                        <button onClick={() => { onEdit(m.content); setActiveMsgMenu(null); }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}>
                                            <Edit size={16} /> Editar
                                        </button>
                                        <button onClick={() => { onCreateBranch(m.content); setActiveMsgMenu(null); }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'none', border: 'none', color: T.text, fontSize: 13, cursor: 'pointer', borderRadius: 10, textAlign: 'left' }}>
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
