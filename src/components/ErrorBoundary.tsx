'use client';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[NEXA ErrorBoundary]', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) return this.props.fallback;

            return (
                <div style={{
                    position: 'fixed', inset: 0, background: '#09090b', color: '#f4f4f5',
                    fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 24, padding: 32, textAlign: 'center',
                }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: 20,
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <AlertTriangle size={36} color="#ef4444" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.5 }}>
                            Algo salió mal
                        </h1>
                        <p style={{ fontSize: 15, color: '#a1a1aa', margin: 0, maxWidth: 400, lineHeight: 1.6 }}>
                            NEXA encontró un error inesperado. Puedes intentar recargar o volver al inicio.
                        </p>
                        {this.state.error && (
                            <details style={{ marginTop: 16, textAlign: 'left' }}>
                                <summary style={{ fontSize: 12, color: '#71717a', cursor: 'pointer' }}>Detalles técnicos</summary>
                                <pre style={{
                                    fontSize: 11, color: '#ef4444', background: 'rgba(239,68,68,0.05)',
                                    border: '1px solid rgba(239,68,68,0.1)', borderRadius: 8, padding: 12,
                                    marginTop: 8, overflow: 'auto', maxHeight: 120, wordBreak: 'break-word',
                                }}>{this.state.error.message}</pre>
                            </details>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={this.handleReset} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12,
                            background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)',
                            color: '#00e5a0', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        }}><RefreshCw size={16} />Reintentar</button>
                        <button onClick={this.handleReload} style={{
                            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 12,
                            background: '#18181b', border: '1px solid #27272a', color: '#a1a1aa',
                            fontSize: 14, fontWeight: 600, cursor: 'pointer',
                        }}><Home size={16} />Recargar</button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
