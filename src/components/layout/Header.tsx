'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Settings, Plus, MoreVertical, Volume2, VolumeX, Sun, Moon, LogOut } from '../icons';

interface HeaderProps {
    accent: string;
    theme: { bg: string; border: string; text: string; muted: string };
    resolvedTheme: 'light' | 'dark' | 'ultra';
    conn: 'ok' | 'err' | 'check';
    thinking: boolean;
    streaming: boolean;
    speaking: boolean;
    showHeaderMenu: boolean;
    onToggleMenu: () => void;
    onOpenDrawer: () => void;
    onOpenSettings: () => void;
    onCreateConv: () => void;
    onToggleTheme: () => void;
    onStopSpeaking: () => void;
    onSignOut: () => void;
}

export function Header({ accent, theme: T, resolvedTheme, conn, thinking, streaming, speaking, showHeaderMenu, onToggleMenu, onOpenDrawer, onOpenSettings, onCreateConv, onToggleTheme, onStopSpeaking, onSignOut }: HeaderProps) {
    const ibtn: React.CSSProperties = { background: 'none', border: 'none', color: accent, cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
    const menuBtn: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 12, fontSize: 14, fontWeight: 500, width: '100%', transition: 'background 0.15s', fontFamily: 'inherit' };

    return (
        <>
            <header role="banner" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', background: `${T.bg}CC`, backdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${T.border}`, flexShrink: 0, zIndex: 30
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button aria-label="Abrir historial de chats" onClick={onOpenDrawer} style={{ ...ibtn, background: `${accent}10`, padding: 10 }}>
                        <Menu size={22} />
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative' }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accent}15`, border: `1px solid ${accent}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
                            <div style={{ position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: '50%', background: conn === 'ok' ? accent : '#ef4444', border: `2px solid ${T.bg}` }} />
                        </div>
                        <div>
                            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 1.2 }}>NEXA CORE</div>
                            <div style={{ fontSize: 9, color: thinking || streaming ? accent : T.muted, letterSpacing: 1, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 4 }}>
                                {thinking ? '🧠 Pensando y razonando...' : streaming ? 'Transmitiendo...' : conn === 'ok' ? 'En línea' : 'Desconectado'}
                                <span style={{ color: accent, opacity: 0.7 }}>• Protected</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                    {speaking && <button aria-label="Detener voz" onClick={onStopSpeaking} style={{ ...ibtn, background: `${accent}10` }} title="Detener voz"><VolumeX size={18} /></button>}
                    <button aria-label="Menú de opciones" onClick={onToggleMenu} style={{ ...ibtn, background: `${accent}10` }} title="Menú"><MoreVertical size={20} /></button>
                    <button aria-label="Abrir configuración" onClick={onOpenSettings} style={{ ...ibtn, background: `${accent}10` }} title="Ajustes"><Settings size={20} /></button>
                    <button aria-label="Crear nuevo chat" onClick={onCreateConv} style={{ ...ibtn, background: `${accent}10` }} title="Nuevo chat"><Plus size={20} /></button>
                </div>
            </header>

            <AnimatePresence>
                {showHeaderMenu && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onToggleMenu} style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.4)' }} />
                        <motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} transition={{ duration: 0.15 }}
                            style={{ position: 'fixed', top: 60, right: 12, zIndex: 50, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 16, padding: 6, minWidth: 220, boxShadow: '0 16px 48px rgba(0,0,0,0.4)' }}>
                            <button onClick={() => { onOpenDrawer(); onToggleMenu(); }} style={{ ...menuBtn, color: T.text }}><Menu size={18} /><span>Historial de chats</span></button>
                            <button onClick={onToggleMenu} style={{ ...menuBtn, color: T.text }}><Volume2 size={18} /><span>Seleccionar voz</span></button>
                            <button onClick={() => { onToggleMenu(); onToggleTheme(); }} style={{ ...menuBtn, color: T.text }}>
                                {resolvedTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
                                <span>{resolvedTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
                            </button>
                            <button onClick={() => { onOpenSettings(); onToggleMenu(); }} style={{ ...menuBtn, color: T.text }}><Settings size={18} /><span>Configuración</span></button>
                            <div style={{ height: 1, background: T.border, margin: '4px 8px' }} />
                            <button onClick={() => { onToggleMenu(); onSignOut(); }} style={{ ...menuBtn, color: '#ef4444' }}><LogOut size={18} /><span>Cerrar sesión</span></button>
                            <div style={{ height: 1, background: T.border, margin: '4px 8px' }} />
                            <button onClick={onToggleMenu} style={{ ...menuBtn, color: T.muted, justifyContent: 'center' }}><span>Cancelar</span></button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
