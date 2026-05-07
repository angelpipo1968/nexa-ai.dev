'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    MessageSquare,
    ChevronLeft,
    ChevronRight,
    Settings,
    User,
    LogOut,
    Archive,
    Zap,
    LayoutDashboard,
    Terminal,
    PenTool,
    Wand2,
    Mail,
    Activity
} from 'lucide-react';
import { useUIStore } from '@/store/useUIStore';

export function Sidebar() {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const pathname = usePathname();
    const setSettingsOpen = useUIStore((state) => state.setSettingsOpen);

    const navSections = [
        {
            label: 'Sistema',
            items: [
                { icon: MessageSquare, label: 'Nexa Chat', href: '/chat' },
                { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
            ]
        },
        {
            label: 'Laboratorio',
            items: [
                { icon: PenTool, label: 'Studio', href: '/studio' },
                { icon: Terminal, label: 'Dev Studio', href: '/dev' },
                { icon: Wand2, label: 'Generador', href: '/generator' },
            ]
        },
        {
            label: 'Integraciones',
            items: [
                { icon: Mail, label: 'Gmail Hub', href: '/mail' },
            ]
        }
    ];

    return (
        <aside
            className={cn(
                "nexa-sidebar relative flex flex-col transition-all duration-500",
                isCollapsed ? "w-[84px]" : "w-[280px]"
            )}
        >
            {/* Neural Pulse Header */}
            <div className="p-6 border-b border-nexa-glass-border">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-nexa-purple/20 flex items-center justify-center border border-nexa-purple/40 nexa-pulse">
                        <Zap size={20} className="text-nexa-purple" fill="currentColor" />
                    </div>
                    {!isCollapsed && (
                        <div className="flex flex-col">
                            <span className="text-xl font-black tracking-tighter text-white">NEXA OS</span>
                            <span className="text-[9px] text-nexa-purple uppercase font-bold tracking-[2px]">System 5.0</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
                {navSections.map((section, idx) => (
                    <div key={idx} className="space-y-1">
                        {!isCollapsed && (
                            <h3 className="px-4 text-[10px] font-bold text-nexa-text-dim uppercase tracking-[3px] mb-2">
                                {section.label}
                            </h3>
                        )}
                        {section.items.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        "group flex items-center px-4 py-2.5 rounded-xl transition-all duration-300 relative overflow-hidden",
                                        isActive 
                                            ? "bg-nexa-purple/10 text-white border border-nexa-purple/30" 
                                            : "text-nexa-text-dim hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    {isActive && (
                                        <div className="absolute left-0 top-0 w-1 h-full bg-nexa-purple shadow-[0_0_15px_var(--nexa-purple)]" />
                                    )}
                                    <item.icon size={20} className={cn("shrink-0", isActive ? "text-nexa-purple" : "group-hover:text-nexa-purple")} />
                                    {!isCollapsed && <span className="ml-3 font-semibold text-sm">{item.label}</span>}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-nexa-glass-border space-y-2">
                {/* Neural Load Indicator */}
                {!isCollapsed && (
                    <div className="px-4 py-2 mb-2 bg-white/[0.02] rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] font-bold text-nexa-text-dim uppercase tracking-wider">Carga Neural</span>
                            <span className="text-[9px] font-mono text-nexa-purple">42%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-nexa-purple w-[42%] nexa-glow-purple" />
                        </div>
                    </div>
                )}

                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex justify-center p-2.5 rounded-xl text-nexa-text-dim hover:bg-white/5 transition-all border border-transparent hover:border-white/10"
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>

                {/* User Profile */}
                <div className="relative">
                    <div
                        onClick={() => !isCollapsed && setShowUserMenu(!showUserMenu)}
                        className={cn(
                            "cursor-pointer flex items-center gap-3 p-2.5 rounded-2xl transition-all border border-nexa-glass-border/30",
                            showUserMenu ? "bg-nexa-purple/20 border-nexa-purple/50" : "bg-nexa-glass hover:bg-white/5",
                            isCollapsed && "justify-center"
                        )}
                    >
                        <div className="w-8 h-8 rounded-lg bg-nexa-purple/30 flex items-center justify-center text-nexa-purple shrink-0 border border-nexa-purple/40">
                            <User size={16} />
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-white truncate">NEXA-ULTRA</p>
                                <p className="text-[9px] text-nexa-purple font-black tracking-widest">ACTIVE</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
