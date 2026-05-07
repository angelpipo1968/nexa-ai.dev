'use client';

import React, { useState } from 'react';
import {
    Monitor,
    User,
    Layers,
    MessageSquare,
    Settings,
    ChevronLeft,
    Info,
    X,
    ChevronRight,
    Palette,
    Mic,
    Shield,
    Trash2,
    LogOut,
    KeyRound,
    Activity,
    ChevronDown,
    Globe,
    Zap
} from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'general' | 'interface' | 'models' | 'chats' | 'personalization' | 'account' | 'about';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('general');
    const [subTab, setSubTab] = useState<'main' | 'voice' | 'memory'>('main');
    const [selectedVoice, setSelectedVoice] = useState('Katerina');
    const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('dark');

    if (!isOpen) return null;

    const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
        { id: 'general', label: 'General', icon: <Settings size={18} /> },
        { id: 'interface', label: 'Interfaz', icon: <Monitor size={18} /> },
        { id: 'models', label: 'Modelos', icon: <Layers size={18} /> },
        { id: 'chats', label: 'Chats', icon: <MessageSquare size={18} /> },
        { id: 'personalization', label: 'Personalización', icon: <Palette size={18} /> },
        { id: 'account', label: 'Cuenta', icon: <User size={18} /> },
        { id: 'about', label: 'Sobre nosotros', icon: <Info size={18} /> },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="flex h-[85vh] w-[1000px] overflow-hidden rounded-2xl bg-white dark:bg-[#0f1117] text-gray-900 dark:text-gray-100 shadow-2xl border border-gray-200 dark:border-white/10">

                {/* Sidebar */}
                <div className="w-72 border-r border-gray-200 dark:border-white/5 bg-[#f9f9f9] dark:bg-[#0a0a0f] flex flex-col pt-6 pb-4">
                    <div className="flex items-center gap-3 px-6 mb-8 text-gray-900 dark:text-gray-100">
                        <button onClick={onClose} className="hover:bg-gray-200 dark:hover:bg-white/10 p-1.5 rounded-full text-gray-900 dark:text-white transition-colors">
                            <ChevronLeft size={20} />
                        </button>
                        <h2 className="text-xl font-bold tracking-tight">Configuración</h2>
                    </div>

                    <nav className="flex-1 space-y-0.5 px-3">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                    ? 'bg-white dark:bg-white/10 text-black dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-gray-100 dark:border-white/5'
                                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-gray-200'
                                    }`}
                            >
                                {tab.icon}
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col bg-white dark:bg-[#0f1117]">
                    <div className="flex items-center justify-end p-4">
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-12 pb-12">
                        <div className="mb-8 flex items-center gap-2">
                            <h3 className="text-2xl font-bold capitalize text-gray-900 dark:text-white">
                                {tabs.find(t => t.id === activeTab)?.label}
                            </h3>
                        </div>

                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="max-w-2xl space-y-8">
                                <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/5">
                                    <span className="text-base text-gray-700 dark:text-gray-300 font-medium">Tema</span>
                                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-full">
                                        {['system', 'light', 'dark'].map((opt) => (
                                            <button
                                                key={opt}
                                                onClick={() => setTheme(opt as any)}
                                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${theme === opt
                                                    ? 'bg-white dark:bg-white/10 shadow-sm text-black dark:text-white'
                                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                                    }`}
                                            >
                                                {opt === 'system' ? 'Sistema' : opt === 'light' ? 'Claro' : 'Oscuro'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* INTERFAZ TAB */}
                        {activeTab === 'interface' && (
                            <div className="max-w-3xl space-y-10">
                                <div>
                                    <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-6">Chat</h3>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-base text-gray-700 dark:text-gray-300 font-medium">Generación automática de títulos</span>
                                            <ToggleSwitch defaultChecked={true} />
                                        </div>
                                        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-base text-gray-700 dark:text-gray-300 font-medium">Copiar respuesta automáticamente al portapapeles</span>
                                            <ToggleSwitch defaultChecked={false} />
                                        </div>
                                        <div className="flex items-center justify-between py-4 border-b border-gray-100 dark:border-white/5">
                                            <span className="text-base text-gray-700 dark:text-gray-300 font-medium">Pegar texto largo como archivo</span>
                                            <ToggleSwitch defaultChecked={true} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MODELOS TAB */}
                        {activeTab === 'models' && (
                            <div className="max-w-3xl space-y-6">
                                {[
                                    { name: 'Nexas-3.6-Ultra', desc: 'El modelo más capaz y avanzado, optimizado para razonamiento complejo.', tokens: '1,000,000', gen: '65,536', mod: 'texto, imagen, vídeo' },
                                    { name: 'Nexas-3.6-Pro', desc: 'Equilibrio perfecto entre velocidad y capacidad.', tokens: '128,000', gen: '16,384', mod: 'texto, imagen' },
                                ].map((model, idx) => (
                                    <div key={idx} className="border border-gray-100 dark:border-white/5 rounded-2xl p-5 bg-gray-50/50 dark:bg-white/[0.02]">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="font-bold text-lg">{model.name}</span>
                                            <ChevronDown size={20} className="text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500 mb-4">{model.desc}</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                                <span className="block text-xs text-gray-400">Contexto</span>
                                                <span className="font-bold text-sm">{model.tokens} tokens</span>
                                            </div>
                                            <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                                <span className="block text-xs text-gray-400">Generación</span>
                                                <span className="font-bold text-sm">{model.gen} tokens</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* PERSONALIZACIÓN TAB */}
                        {activeTab === 'personalization' && (
                            <div className="max-w-3xl space-y-12">
                                <div>
                                    <h3 className="text-xl font-bold mb-8">Memoria</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between py-4 border-b border-gray-100 dark:border-white/5">
                                            <div>
                                                <p className="text-base text-gray-700 dark:text-gray-300 font-medium">Recuerdos guardados</p>
                                                <p className="text-xs text-gray-400 mt-1">Nexas guardará y hará referencia a los recuerdos al responder.</p>
                                            </div>
                                            <ToggleSwitch defaultChecked={true} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ACCOUNT TAB */}
                        {activeTab === 'account' && (
                            <div className="space-y-10 max-w-3xl">
                                <div className="flex items-center justify-between py-6">
                                    <div className="flex items-center gap-5">
                                        <div className="h-14 w-14 rounded-full bg-[#7c3aed] flex items-center justify-center text-2xl font-bold text-white uppercase shadow-sm">
                                            A
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-gray-900 dark:text-white">Ángel Góngora</h3>
                                            <p className="text-sm text-gray-500 mt-0.5">pipogon0361@gmail.com</p>
                                        </div>
                                    </div>
                                    <button className="px-5 py-2 rounded-full border border-gray-200 dark:border-white/10 text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                        Editar cuenta
                                    </button>
                                </div>

                                <div className="flex items-center justify-between py-6 border-t border-gray-100 dark:border-white/5">
                                    <span className="text-base text-gray-900 dark:text-gray-100 font-medium">Mi suscripción</span>
                                    <button className="px-5 py-2 rounded-full bg-[#7c3aed] text-white text-sm font-bold hover:bg-[#6d28d9] transition-colors shadow-lg shadow-purple-500/20">
                                        Subir a PRO
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* ABOUT TAB */}
                        {activeTab === 'about' && (
                            <div className="max-w-3xl space-y-12">
                                <div className="flex flex-col items-center text-center py-10">
                                    <div className="w-20 h-20 rounded-2xl bg-[#7c3aed] flex items-center justify-center text-white shadow-2xl shadow-purple-500/20 mb-6">
                                        <Zap size={40} fill="currentColor" />
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight mb-2">NEXAS</h2>
                                    <p className="text-gray-500 dark:text-gray-400 font-medium">Versión 3.6.2 (Stable Build)</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ToggleSwitch({ defaultChecked }: { defaultChecked?: boolean }) {
    const [checked, setChecked] = useState(defaultChecked || false);
    return (
        <button
            onClick={() => setChecked(!checked)}
            className={`w-11 h-6 rounded-full transition-colors relative ${checked ? 'bg-[#7c3aed]' : 'bg-gray-200 dark:bg-gray-700'}`}
        >
            <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
    );
}
