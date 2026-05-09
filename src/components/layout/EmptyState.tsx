'use client';
import React from 'react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
    greeting: string;
    accent: string;
    theme: { text: string; muted: string };
}

export function EmptyState({ greeting, accent, theme: T }: EmptyStateProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 32, textAlign: 'center', padding: 20 }}>
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}>
                <div style={{ fontSize: 80, marginBottom: 20, filter: `drop-shadow(0 0 20px ${accent}40)` }}>🧬</div>
                <h1 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 16px', letterSpacing: -0.5, color: T.text, lineHeight: 1.2 }}>
                    {greeting || 'SISTEMA NEXA V3'}
                </h1>
                <p style={{ fontSize: 16, color: T.muted, margin: 0, maxWidth: 300, lineHeight: 1.6 }}>
                    Operativo y listo para procesar cualquier solicitud.
                </p>
            </motion.div>
        </div>
    );
}
