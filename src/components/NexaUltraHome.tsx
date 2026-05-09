'use client';

import { useRouter } from 'next/navigation';
import { NeuralPulse } from './dashboard/NeuralPulse';
import { AmbientStudio } from './studio/AmbientStudio';
import { MessageSquare, Wand2, Terminal, Shield, Zap, Activity } from 'lucide-react';

export default function NexaUltraHome() {
    const router = useRouter();

    const quickActions = [
        { icon: MessageSquare, label: 'Nexa Chat', sub: 'Pensamiento Cognitivo', href: '/chat', color: 'purple' },
        { icon: Terminal, label: 'Dev Studio', sub: 'IDE & Agentes', href: '/dev', color: 'cyan' },
        { icon: Wand2, label: 'Generador', sub: 'Artefactos Visuales', href: '/generator', color: 'pink' },
    ];

    return (
        <div className="w-full h-full flex flex-col p-8 overflow-y-auto custom-scrollbar">
            
            {/* Header Section */}
            <div className="flex justify-between items-end mb-12">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-nexa-purple">
                        <Shield size={14} />
                        <span className="text-[10px] font-black uppercase tracking-[4px]">System Integrity: Optimal</span>
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-white">
                        Buenos días, <span className="text-transparent bg-clip-text bg-gradient-to-r from-nexa-purple to-nexa-cyan">NEXA-ULTRA</span>
                    </h1>
                    <p className="text-nexa-text-dim font-medium max-w-md">
                        Tu sistema autónomo está procesando ciclos cognitivos en segundo plano. ¿Cuál es nuestro siguiente objetivo?
                    </p>
                </div>
                
                <div className="flex gap-4">
                    <div className="nexa-card flex items-center gap-3 py-2 px-4 border-nexa-purple/20 bg-nexa-purple/5">
                        <div className="w-2 h-2 rounded-full bg-nexa-purple nexa-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Core Status: Active</span>
                    </div>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6 flex-1">
                
                {/* Left: Neural Monitoring */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <NeuralPulse />
                        <AmbientStudio />
                    </div>

                    {/* Quick Actions Grid */}
                    <div className="grid grid-cols-3 gap-6">
                        {quickActions.map((action, idx) => (
                            <button
                                key={idx}
                                onClick={() => router.push(action.href)}
                                className="nexa-card group text-left flex flex-col gap-4"
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                                    action.color === 'purple' ? 'bg-nexa-purple/20 text-nexa-purple group-hover:bg-nexa-purple' :
                                    action.color === 'cyan' ? 'bg-nexa-cyan/20 text-nexa-cyan group-hover:bg-nexa-cyan' :
                                    'bg-pink-500/20 text-pink-500 group-hover:bg-pink-500'
                                } group-hover:text-black group-hover:scale-110 group-hover:rotate-3`}>
                                    <action.icon size={24} />
                                </div>
                                <div>
                                    <h4 className="text-lg font-bold text-white">{action.label}</h4>
                                    <p className="text-xs text-nexa-text-dim">{action.sub}</p>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-nexa-text-dim group-hover:text-white transition-colors">
                                    <span>INICIAR SISTEMA</span>
                                    <Zap size={10} className="text-nexa-purple" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Activity & News */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="nexa-card h-full bg-gradient-to-br from-nexa-purple/10 to-transparent border-nexa-purple/20">
                        <div className="flex items-center gap-2 mb-6">
                            <Activity size={18} className="text-nexa-purple" />
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider text-center">Registro de Actividad</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <ActivityItem 
                                time="10:05" 
                                title="Backup Phoenix Protocol" 
                                desc="Vault sincronizado con Railway Volume." 
                                status="success" 
                            />
                            <ActivityItem 
                                time="09:42" 
                                title="Ciclo de Reflexión" 
                                desc="Consolidando 12 nuevas memorias semánticas." 
                                status="info" 
                            />
                            <ActivityItem 
                                time="08:15" 
                                title="Update de Seguridad" 
                                desc="GPG Signature verificado en servidor cloud." 
                                status="success" 
                            />
                        </div>

                        <div className="mt-12 p-6 rounded-2xl bg-white/5 border border-white/5 flex flex-col items-center justify-center text-center gap-4">
                            <div className="w-16 h-16 rounded-full border-2 border-nexa-purple border-t-transparent animate-spin" />
                            <div>
                                <p className="text-xs font-bold text-white uppercase tracking-widest">Analizando Entorno</p>
                                <p className="text-[10px] text-nexa-text-dim">Nexa está optimizando tu flujo de trabajo...</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-6 border-t border-nexa-glass-border flex justify-between items-center opacity-50">
                <span className="text-[10px] font-mono">NEXA OS v5.0.0-ULTRA</span>
                <span className="text-[10px] font-mono tracking-widest uppercase">Encryption Mode: AES-256-GCM / GPG</span>
            </div>
        </div>
    );
}

function ActivityItem({ time, title, desc, status }: { time: string, title: string, desc: string, status: 'success' | 'info' | 'error' }) {
    const statusColors = {
        success: 'bg-green-500',
        info: 'bg-nexa-purple',
        error: 'bg-red-500'
    };

    return (
        <div className="flex gap-4 relative">
            <div className="flex flex-col items-center">
                <div className={`w-2 h-2 rounded-full ${statusColors[status]} mt-1.5`} />
                <div className="w-[1px] h-full bg-white/10 mt-2" />
            </div>
            <div>
                <span className="text-[9px] font-mono text-nexa-text-dim">{time}</span>
                <h5 className="text-xs font-bold text-white">{title}</h5>
                <p className="text-[10px] text-nexa-text-dim leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
