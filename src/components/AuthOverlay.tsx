'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { motion } from 'framer-motion';
import { Lock, Mail, Key, UserPlus, LogIn, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthOverlayProps {
    onAuthSuccess: (user: any) => void;
}

export default function AuthOverlay({ onAuthSuccess }: AuthOverlayProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isLogin) {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user) onAuthSuccess(data.user);
            } else {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                });
                if (error) throw error;
                if (data.user) onAuthSuccess(data.user);
                else setError("Revisa tu email para confirmar la cuenta (si aplica).");
            }
        } catch (err: any) {
            setError(err.message || "Error de autenticación");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-black/60 border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden"
            >
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full" />

                <div className="flex flex-col items-center mb-8 relative z-10">
                    <div className="p-4 bg-cyan-500/10 rounded-full mb-4 border border-cyan-500/20">
                        <Lock className="w-8 h-8 text-cyan-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white tracking-wider">NEXA <span className="text-cyan-400">ACCESS</span></h2>
                    <p className="text-gray-400 text-sm mt-2">Identificación de Usuario Requerida</p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4 relative z-10">
                    <div className="space-y-2">
                        <label className="text-xs text-cyan-300/70 uppercase tracking-widest pl-1">Credencial de Red (Email)</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                placeholder="usuario@nexa-os.net"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs text-cyan-300/70 uppercase tracking-widest pl-1">Código de Acceso (Pass)</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                            <AlertTriangle className="w-4 h-4" />
                            <span>{error}</span>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-900/20"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                        {isLogin ? 'INICIAR SESIÓN' : 'REGISTRARSE'}
                    </button>
                </form>

                <div className="mt-6 text-center relative z-10">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-gray-400 hover:text-cyan-400 text-sm transition-colors"
                    >
                        {isLogin ? '¿No tienes cuenta? Crear ID' : '¿Ya tienes cuenta? Acceder'}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
