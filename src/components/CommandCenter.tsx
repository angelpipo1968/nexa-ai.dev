'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Command, Loader2, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from 'ai/react';

export default function CommandCenter() {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<SpeechRecognition | null>(null);

    // Vercel AI SDK Hook
    const { messages, input, setInput, handleSubmit, isLoading } = useChat({
        api: '/api/chat',
    });

    // Setup Speech Recognition
    useEffect(() => {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'es-ES';

            recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                setInput(transcript);
            };

            recognition.onend = () => {
                setIsListening(false);
                // Opcional: Auto-enviar al terminar de hablar
                // handleSubmit(); 
            };

            recognitionRef.current = recognition;
        }
    }, [setInput]);

    const toggleVoice = () => {
        if (isListening) {
            recognitionRef.current?.stop();
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    return (
        <>
            {/* Mensajes Flotantes (Chat Overlay) */}
            <div className="fixed bottom-32 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 flex flex-col gap-3 pointer-events-none">
                <AnimatePresence>
                    {messages.slice(-3).map((m) => (
                        <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 20, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={cn(
                                "p-4 rounded-2xl backdrop-blur-md border max-w-[80%] shadow-lg",
                                m.role === 'user'
                                    ? "ml-auto bg-nexa-primary/10 border-nexa-primary/30 text-white rounded-br-none"
                                    : "mr-auto bg-black/60 border-white/10 text-gray-200 rounded-bl-none"
                            )}
                        >
                            <p className="text-sm">{m.content}</p>
                        </motion.div>
                    ))}
                </AnimatePresence>
                {isLoading && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mr-auto bg-black/60 border border-white/10 p-3 rounded-xl rounded-bl-none flex gap-2 items-center"
                    >
                        <Loader2 className="w-4 h-4 animate-spin text-nexa-primary" />
                        <span className="text-xs text-nexa-primary/70">NEXA procesando...</span>
                    </motion.div>
                )}
            </div>

            {/* Command Bar */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-50"
            >
                <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-2 flex items-center gap-2 relative overflow-hidden">

                    {/* Voice Mode Toggle */}
                    <button
                        type="button"
                        onClick={toggleVoice}
                        className={cn(
                            "p-4 rounded-xl transition-all duration-300 flex items-center justify-center relative z-10",
                            isListening
                                ? "bg-red-500/20 text-red-400 animate-pulse shadow-[0_0_20px_rgba(248,113,113,0.3)]"
                                : "hover:bg-white/5 text-white/70 hover:text-white"
                        )}
                    >
                        {isListening ? <Volume2 className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                    </button>

                    {/* Text Input */}
                    <div className="flex-1 relative z-10">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Escuchando..." : "Escribe un comando o pregunta..."}
                            className="w-full bg-transparent border-none outline-none text-white placeholder-white/30 px-4 py-2 font-light text-lg"
                        />
                    </div>

                    {/* Action Button */}
                    <button
                        type="submit"
                        disabled={isLoading || !input}
                        className="p-4 rounded-xl hover:bg-white/5 text-nexa-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (input.length > 0 ? <Send className="w-5 h-5" /> : <Command className="w-5 h-5" />)}
                    </button>

                    {/* Background Gradient Animation when Active */}
                    {isLoading && (
                        <motion.div
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-nexa-primary/10 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        />
                    )}

                </form>
            </motion.div>
        </>
    );
}
