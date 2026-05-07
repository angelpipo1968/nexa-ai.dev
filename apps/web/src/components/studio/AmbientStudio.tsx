'use client';

import { useState } from 'react';
import { CloudRain, Flame, Music, Volume2, VolumeX, Play, Pause } from 'lucide-react';

export function AmbientStudio() {
    const [sounds, setSounds] = useState([
        { id: 'rain', name: 'Lluvia Ártica', icon: CloudRain, volume: 40, active: false },
        { id: 'fire', name: 'Fuego Central', icon: Flame, volume: 20, active: false },
        { id: 'lofi', name: 'Nexa Lo-Fi', icon: Music, volume: 60, active: false },
    ]);

    const toggleSound = (id: string) => {
        setSounds(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
    };

    const updateVolume = (id: string, vol: number) => {
        setSounds(prev => prev.map(s => s.id === id ? { ...s, volume: vol } : s));
    };

    return (
        <div className="nexa-card h-full flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-nexa-cyan/20 rounded-lg border border-nexa-cyan/40">
                        <Volume2 size={16} className="text-nexa-cyan" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Ambient Studio</h3>
                        <p className="text-[10px] text-nexa-text-dim uppercase tracking-widest font-black">Atmospheric Sync</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {sounds.map((sound) => (
                    <div key={sound.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-nexa-cyan/30 transition-all group">
                        <div className="flex items-center gap-4 mb-3">
                            <button 
                                onClick={() => toggleSound(sound.id)}
                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                    sound.active 
                                        ? 'bg-nexa-cyan text-black shadow-[0_0_15px_var(--nexa-cyan-glow)]' 
                                        : 'bg-white/5 text-nexa-text-dim group-hover:bg-white/10'
                                }`}
                            >
                                {sound.active ? <Pause size={18} /> : <Play size={18} />}
                            </button>
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-white">{sound.name}</span>
                                    <span className="text-[10px] font-mono text-nexa-cyan">{sound.volume}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={sound.volume}
                                    onChange={(e) => updateVolume(sound.id, parseInt(e.target.value))}
                                    className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-nexa-cyan"
                                />
                            </div>
                            <sound.icon size={20} className={sound.active ? 'text-nexa-cyan' : 'text-nexa-text-dim'} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-auto p-4 rounded-xl bg-nexa-cyan/5 border border-nexa-cyan/10">
                <p className="text-[10px] text-nexa-cyan font-bold uppercase tracking-widest text-center">
                    Sincronización Neural Activa
                </p>
            </div>
        </div>
    );
}
