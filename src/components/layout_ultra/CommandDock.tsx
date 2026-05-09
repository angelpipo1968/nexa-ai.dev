'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    MessageSquare,
    Terminal,
    PenTool,
    Wand2,
    LayoutDashboard,
    Mail,
    Settings,
    User,
    Zap,
    Cpu
} from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

export function CommandDock() {
    const router = useRouter();
    const pathname = usePathname();
    const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);

    const dockItems = [
        { icon: MessageSquare, label: 'Chat', href: '/chat' },
        { icon: Terminal, label: 'Dev', href: '/dev' },
        { icon: PenTool, label: 'Studio', href: '/studio' },
        { icon: Wand2, label: 'Generator', href: '/generator' },
        { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
        { icon: Mail, label: 'Mail', href: '/mail' },
    ];

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-1.5 p-2 px-3 rounded-[24px] bg-black/40 backdrop-blur-3xl border border-nexa-glass-border shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
                
                {/* System Orb */}
                <div className="w-10 h-10 rounded-full bg-nexa-purple/20 flex items-center justify-center border border-nexa-purple/40 mr-2 group cursor-pointer hover:bg-nexa-purple transition-all duration-500">
                    <Zap size={18} className="text-nexa-purple group-hover:text-black" fill="currentColor" />
                </div>

                <div className="h-6 w-[1px] bg-white/10 mx-1" />

                {/* Nav Items */}
                {dockItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <button
                            key={item.href}
                            onClick={() => router.push(item.href)}
                            className={cn(
                                "relative w-12 h-12 flex items-center justify-center rounded-2xl transition-all duration-300 group",
                                isActive 
                                    ? "bg-nexa-purple/20 text-white border border-nexa-purple/30" 
                                    : "text-nexa-text-dim hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon size={22} className={cn("transition-transform duration-300 group-hover:scale-110", isActive && "text-nexa-purple")} />
                            
                            {/* Tooltip */}
                            <span className="absolute -top-12 px-3 py-1 rounded-lg bg-black/80 text-[10px] font-bold text-white uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-white/10 whitespace-nowrap">
                                {item.label}
                            </span>

                            {/* Active Indicator */}
                            {isActive && (
                                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-nexa-purple shadow-[0_0_8px_var(--nexa-purple)]" />
                            )}
                        </button>
                    );
                })}

                <div className="h-6 w-[1px] bg-white/10 mx-1" />

                {/* Settings & Profile */}
                <button
                    onClick={() => setSettingsOpen(true)}
                    className="w-12 h-12 flex items-center justify-center rounded-2xl text-nexa-text-dim hover:bg-white/5 hover:text-white transition-all group"
                >
                    <Settings size={22} className="group-hover:rotate-45 transition-transform duration-500" />
                </button>

                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/10 hover:border-nexa-purple/50 transition-all cursor-pointer overflow-hidden">
                    <User size={20} className="opacity-50" />
                </div>
            </div>
        </div>
    );
}
