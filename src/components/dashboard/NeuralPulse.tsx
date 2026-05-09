'use client';

import { useEffect, useState, useRef } from 'react';
import { Activity, Zap, Shield, Cpu } from 'lucide-react';

export function NeuralPulse() {
    const [points, setPoints] = useState<number[]>(Array(50).fill(20));
    const [neuralLoad, setNeuralLoad] = useState(42);

    useEffect(() => {
        const interval = setInterval(() => {
            setPoints(prev => {
                const next = [...prev.slice(1), 20 + Math.random() * 40];
                return next;
            });
            setNeuralLoad(prev => {
                const change = Math.random() * 4 - 2;
                return Math.max(10, Math.min(95, prev + change));
            });
        }, 150);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="nexa-card h-full flex flex-col gap-4">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-nexa-purple/20 rounded-lg border border-nexa-purple/40">
                        <Activity size={16} className="text-nexa-purple" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Carga Neural</h3>
                        <p className="text-[10px] text-nexa-text-dim uppercase tracking-widest font-black">Real-time Pulse</p>
                    </div>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-black text-white font-mono">{neuralLoad.toFixed(1)}%</span>
                </div>
            </div>

            {/* SVG Pulse Chart */}
            <div className="flex-1 min-h-[100px] relative overflow-hidden bg-black/40 rounded-xl border border-nexa-glass-border">
                <svg
                    viewBox="0 0 500 100"
                    preserveAspectRatio="none"
                    className="w-full h-full"
                >
                    <defs>
                        <linearGradient id="pulse-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="transparent" />
                            <stop offset="100%" stopColor="var(--nexa-purple)" />
                        </linearGradient>
                    </defs>
                    <path
                        d={`M 0 50 ${points.map((p, i) => `L ${i * 10.2} ${100 - p}`).join(' ')}`}
                        fill="none"
                        stroke="url(#pulse-gradient)"
                        strokeWidth="2"
                        className="transition-all duration-150"
                    />
                    {/* Glow effect */}
                    <path
                        d={`M 0 50 ${points.map((p, i) => `L ${i * 10.2} ${100 - p}`).join(' ')}`}
                        fill="none"
                        stroke="var(--nexa-purple)"
                        strokeWidth="4"
                        strokeOpacity="0.2"
                        className="blur-sm transition-all duration-150"
                    />
                </svg>
                
                {/* Overlay Grid */}
                <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none opacity-20">
                    {Array(24).fill(0).map((_, i) => (
                        <div key={i} className="border-[0.5px] border-nexa-purple/20" />
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
                <MetricBox icon={Zap} label="Latencia" value="12ms" color="cyan" />
                <MetricBox icon={Shield} label="Fénix" value="READY" color="purple" />
                <MetricBox icon={Cpu} label="Nodos" value="48/50" color="pink" />
            </div>
        </div>
    );
}

function MetricBox({ icon: Icon, label, value, color }: { icon: any, label: string, value: string, color: 'purple' | 'cyan' | 'pink' }) {
    const colors = {
        purple: 'text-nexa-purple border-nexa-purple/20 bg-nexa-purple/5',
        cyan: 'text-nexa-cyan border-nexa-cyan/20 bg-nexa-cyan/5',
        pink: 'text-pink-500 border-pink-500/20 bg-pink-500/5'
    };

    return (
        <div className={`p-2 rounded-xl border ${colors[color]} flex flex-col gap-1 items-center justify-center text-center`}>
            <Icon size={14} className="opacity-70" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-nexa-text-dim">{label}</span>
            <span className="text-[10px] font-black text-white font-mono">{value}</span>
        </div>
    );
}
