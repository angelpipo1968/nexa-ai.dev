'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Sparkles, MoreVertical, Pin } from '../icons';

interface Conv { id: string; title: string; pinned?: boolean; archived?: boolean; }

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    conversations: Conv[];
    activeConvId: string | null;
    search: string;
    onSearchChange: (q: string) => void;
    onSelectConv: (id: string) => void;
    onCreateConv: () => void;
    onOpenSettings: () => void;
    accent: string;
    theme: { surf: string; border: string; text: string; sec: string; muted: string };
}

export function Sidebar({ isOpen, onClose, conversations, activeConvId, search, onSearchChange, onSelectConv, onCreateConv, onOpenSettings, accent, theme: T }: SidebarProps) {
    const filtered = conversations.filter(c => c.title.toLowerCase().includes(search.toLowerCase()));
    const ibtn: React.CSSProperties = { background: 'none', border: 'none', color: T.muted, cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };

    return (
        <>
            <AnimatePresence>{isOpen && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} />}</AnimatePresence>
            <AnimatePresence>
                {isOpen && (
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
                                <button aria-label="Cerrar panel lateral" onClick={onClose} style={{ ...ibtn, fontSize: 20 }}>✕</button>
                            </div>
                            <button onClick={() => { onCreateConv(); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 12, background: `${accent}15`, border: `1px solid ${accent}30`, color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ NUEVO CHAT</button>
                        </div>
                        <div style={{ padding: '8px 12px' }}>
                            <input
                                type="text"
                                placeholder="Buscar chats..."
                                value={search}
                                onChange={e => onSearchChange(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', borderRadius: 10, border: `1px solid ${T.border}`, background: T.surf, color: T.text, fontSize: 12, outline: 'none' }}
                            />
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
                            {filtered.map(c => (
                                <div key={c.id} style={{ position: 'relative', marginBottom: 2 }}>
                                    <button onClick={() => { onSelectConv(c.id); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: 10, background: activeConvId === c.id ? `${accent}10` : 'transparent', border: 'none', color: activeConvId === c.id ? accent : T.sec, fontSize: 12, textAlign: 'left', cursor: 'pointer' }}>
                                        {c.pinned && <Pin size={10} style={{ transform: 'rotate(45deg)' }} />}
                                        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: '10px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <button onClick={() => { onOpenSettings(); onClose(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 10, borderRadius: 10, background: T.surf, border: `1px solid ${T.border}`, color: T.sec, fontSize: 12, cursor: 'pointer' }}>
                                <Sparkles size={14} />
                                Configuración
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </>
    );
}
