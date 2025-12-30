'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, Send, Command, Loader2, Volume2, Globe, Cpu } from 'lucide-react';
import { cn } from '@/lib/utils';
import HolographicViewer from './HolographicViewer';

export default function CommandCenter() {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const [useSearch, setUseSearch] = useState(false);

    // --- Manual Chat State ---
    const [messages, setMessages] = useState<{ id: number; role: 'user' | 'assistant'; content: string }[]>([
        { id: 1, role: 'assistant', content: "Sistemas iniciados. Enlace híbrido activo." }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // New State for Holographic Viewer
    const [showDoc, setShowDoc] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom effect
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Speech Recognition Setup ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.lang = 'es-ES';
                recognition.interimResults = false;

                recognition.onstart = () => setIsListening(true);
                recognition.onend = () => setIsListening(false);
                recognition.onresult = (event: any) => {
                    const transcript = event.results[0][0].transcript;
                    setInput(transcript);
                    handleSendMessage(undefined, transcript);
                };
                recognitionRef.current = recognition;
            }
        }
    }, []);

    const toggleListening = () => {
        if (isListening) recognitionRef.current?.stop();
        else recognitionRef.current?.start();
    };

    // --- Text to Speech ---
    const speakText = (text: string) => {
        if (typeof window !== 'undefined') {
            window.speechSynthesis.cancel();

            // Limpiar Markdown para lectura fluida
            const cleanText = text
                .replace(/\*+/g, '')       // Eliminar asteriscos
                .replace(/#+/g, '')        // Eliminar hashtags
                .replace(/`/g, '')         // Eliminar backticks
                .replace(/\[.*?\]/g, '')   // Eliminar referencias [NEXA: ...]
                .replace(/\|/g, '')        // Eliminar barras de tabla
                .replace(/-{3,}/g, '')     // Eliminar separadores de tabla
                .replace(/\$/g, '')        // Eliminar símbolos LaTeX
                .replace(/->/g, ' a ')     // Traducir flechas
                .trim();

            const utterance = new SpeechSynthesisUtterance(cleanText);
            utterance.lang = 'es-ES';
            utterance.pitch = 1.0;
            utterance.rate = 1.1;
            window.speechSynthesis.speak(utterance);
        }
    };

    // --- MAIN LOGIC: HYBRID ROUTER ---
    const handleSendMessage = async (e?: React.FormEvent, overrideContent?: string) => {
        if (e) e.preventDefault();

        const content = overrideContent || input;
        if (!content.trim()) return;

        const newUserMsg = { role: 'user' as const, content };
        setMessages(prev => [...prev, { id: Date.now(), ...newUserMsg }]);
        setInput('');
        setIsLoading(true);

        try {
            const lowerContent = content.toLowerCase();

            // 1. ROUTER LOCAL (Prioridad Absoluta - Sin Latencia)
            // ---------------------------------------------------
            if (lowerContent.includes("sovereign") || lowerContent.includes("memoria") || lowerContent.includes("wikipedia") || lowerContent.includes("kb")) {
                const response = "Accediendo a Biblioteca Local... He localizado el plan 'Sovereign-KB'. Abriendo visor holográfico seguro.";
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: response }]);
                speakText("Accediendo a memoria soberana.");
                setTimeout(() => setShowDoc('deploy_report_sovereign_kb.md'), 1000);
                setIsLoading(false);
                return;
            }

            if (lowerContent.includes("hora")) {
                const response = `Son las ${new Date().toLocaleTimeString()}. Sistemas sincronizados.`;
                setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: response }]);
                speakText(response);
                setIsLoading(false);
                return;
            }

            // 2. CONEXIÓN NUBE (Google Gemini)
            // ---------------------------------------------------
            console.log("Comando complejo. Iniciando enlace satelital con Google Gemini...");

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, newUserMsg],
                    model: useSearch ? 'gemini' : 'nexa'
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Error de servidor " + response.status);
            }

            if (!response.body) throw new Error("No body");

            // Stream Reader
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let aiContent = '';

            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: '' }]);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = decoder.decode(value, { stream: true });
                aiContent += text;
                setMessages(prev => {
                    const newMsgs = [...prev];
                    const lastMsg = newMsgs[newMsgs.length - 1];
                    if (lastMsg) lastMsg.content = aiContent;
                    return newMsgs;
                });
            }
            speakText(aiContent);

        } catch (error: any) {
            // 3. FALLBACK OFFLINE (Si falla la nube)
            // ---------------------------------------------------
            console.warn("Fallo en enlace nube:", error);
            await new Promise(resolve => setTimeout(resolve, 500));

            const lowerContent = content.toLowerCase();
            let simResponse = "⚠️ ";

            // Si el error es específico, lo decimos
            if (error.message && error.message.includes("Error:")) {
                simResponse += error.message;
            } else {
                simResponse += "Enlace inestable. Activando respaldo local. ";
                if (lowerContent.includes("hola")) simResponse += "¡Hola! Estoy en modo offline operativo.";
                else if (lowerContent.includes("computación cuántica")) simResponse += "Computación Cuántica: Procesamiento paralelo mediante superposición y entrelazamiento cuántico. (Dato Offline).";
            }

            setMessages(prev => [...prev, { id: Date.now() + 1, role: 'assistant', content: simResponse }]);
            speakText(simResponse);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <HolographicViewer
                isOpen={!!showDoc}
                onClose={() => setShowDoc(null)}
                docName={showDoc || ''}
            />

            <div className="flex flex-col h-full relative z-10 w-full max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 font-mono">
                {/* Chat Display */}
                <div className="flex-1 overflow-y-auto mb-4 space-y-4 custom-scrollbar pr-2">
                    {messages.map((msg) => (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={cn(
                                "max-w-[80%] p-4 rounded-2xl backdrop-blur-md shadow-lg border",
                                msg.role === 'user'
                                    ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-50 rounded-tr-sm"
                                    : "bg-black/40 border-white/10 text-gray-200 rounded-tl-sm relative overflow-hidden"
                            )}>
                                {/* Tech Decoration for AI messages */}
                                {msg.role !== 'user' && (
                                    <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500/50" />
                                )}
                                <div className="leading-relaxed relative z-10 whitespace-pre-wrap">
                                    {msg.content.split(/(\*\*.*?\*\*)/).map((part, index) =>
                                        part.startsWith('**') && part.endsWith('**')
                                            ? <strong key={index} className="text-cyan-400 font-bold">{part.slice(2, -2)}</strong>
                                            : part.replace(/^\s*\*\s+/gm, '• ').replace(/->/g, '→').replace(/\$/g, '')
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-black/40 border border-white/10 p-4 rounded-2xl rounded-tl-sm flex items-center gap-3">
                                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                                <span className="text-xs text-cyan-400/70 animate-pulse tracking-widest">
                                    ESTABLECIENDO ENLACE...
                                </span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl opacity-20 group-hover:opacity-40 transition duration-500 blur-md"></div>
                    <form
                        onSubmit={(e) => handleSendMessage(e)}
                        className="relative flex items-center gap-2 bg-black/60 p-2 rounded-xl border border-white/10 backdrop-blur-xl"
                    >
                        <button
                            type="button"
                            onClick={() => setUseSearch(!useSearch)}
                            className={cn(
                                "p-3 rounded-lg transition-all duration-300",
                                useSearch ? "bg-amber-500/20 text-amber-400" : "hover:bg-white/5 text-gray-400"
                            )}
                            title={useSearch ? "Búsqueda Web Activa" : "Modo Conversación"}
                        >
                            <Globe className="w-5 h-5" />
                        </button>

                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={isListening ? "Escuchando..." : "Enviar comando a NEXA..."}
                            className="flex-1 bg-transparent border-none outline-none text-white placeholder-gray-500 px-2 font-mono"
                        />

                        <button
                            type="button"
                            onClick={toggleListening}
                            className={cn(
                                "p-3 rounded-lg transition-all duration-300",
                                isListening ? "bg-red-500/20 text-red-500 animate-pulse" : "hover:bg-white/5 text-gray-400"
                            )}
                        >
                            <Mic className="w-5 h-5" />
                        </button>

                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-3 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            </div>
        </>
    );
}