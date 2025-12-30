'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Cpu, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';

interface HolographicViewerProps {
    isOpen: boolean;
    onClose: () => void;
    docName: string;
}

export default function HolographicViewer({ isOpen, onClose, docName }: HolographicViewerProps) {
    const [content, setContent] = useState<string>('Cargando datos encriptados...');

    useEffect(() => {
        if (isOpen && docName) {
            fetch(`/api/read-doc?doc=${docName}`)
                .then(res => res.json())
                .then(data => setContent(data.content || "Error: Datos corruptos o ilegibles."))
                .catch(err => setContent("Error de conexión con el núcleo de memoria."));
        }
    }, [isOpen, docName]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="relative w-full max-w-4xl h-[80vh] bg-[#0A0F1E]/90 border border-cyan-500/50 rounded-lg shadow-[0_0_50px_rgba(0,255,255,0.2)] overflow-hidden flex flex-col"
                    >
                        {/* Header Holográfico */}
                        <div className="flex items-center justify-between p-4 border-b border-cyan-500/30 bg-cyan-950/20">
                            <div className="flex items-center gap-3">
                                <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
                                <h2 className="text-xl font-mono text-cyan-300 tracking-widest uppercase">
                                    NEXA MEMORY BANK // <span className="text-white">{docName}</span>
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-cyan-500/20 rounded-full transition-colors group">
                                <X className="w-6 h-6 text-cyan-400 group-hover:text-white" />
                            </button>
                        </div>

                        {/* Contenido Scrollable */}
                        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-4 custom-scrollbar">
                            <div className="prose prose-invert prose-cyan max-w-none">
                                <pre className="whitespace-pre-wrap font-sans text-gray-300 leading-relaxed">
                                    {content}
                                </pre>
                            </div>
                        </div>

                        {/* Footer Status */}
                        <div className="p-3 border-t border-cyan-500/30 bg-black/40 flex justify-between text-xs text-cyan-600 font-mono">
                            <span className="flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4" /> SOVEREIGNTY: VALIDATED
                            </span>
                            <span className="animate-pulse">● ENCRYPTED CONNECTION</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
