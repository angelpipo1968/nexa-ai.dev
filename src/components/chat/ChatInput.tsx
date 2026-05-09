'use client';
import React, { useRef, useEffect } from 'react';
import { Plus, Mic, StopCircle, ArrowUp, Loader2, Zap } from '../icons';
import { FileUpload } from './FileUpload';
import type { UploadedFile, FileType } from './FileUpload';

interface ChatInputProps {
    input: string;
    suggestion: string;
    recording: boolean;
    thinking: boolean;
    streaming: boolean;
    autoSend: boolean;
    showUpload: boolean;
    attachedFiles: UploadedFile[];
    accent: string;
    theme: { bg: string; border: string; muted: string };
    onInputChange: (val: string) => void;
    onSend: () => void;
    onToggleRec: () => void;
    onToggleUpload: () => void;
    onFilesSelected: (files: UploadedFile[]) => void;
    onRemoveFile: (id: string) => void;
    onAnalyzeImage?: (file: File) => Promise<void>;
}

export function ChatInput({
    input, suggestion, recording, thinking, streaming, autoSend, showUpload, attachedFiles,
    accent, theme: T, onInputChange, onSend, onToggleRec, onToggleUpload, onFilesSelected, onRemoveFile, onAnalyzeImage
}: ChatInputProps) {
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const el = inputRef.current;
        if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px'; }
    }, [input]);

    return (
        <div role="region" aria-label="Área de entrada de mensajes" style={{ borderTop: `1px solid ${T.border}`, background: `${T.bg}F2`, backdropFilter: 'blur(20px)', padding: '14px 14px 24px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, maxWidth: 600, margin: '0 auto', position: 'relative' }}>
                <FileUpload isOpen={showUpload} onClose={onToggleUpload} onFilesSelected={onFilesSelected} onAnalyzeImage={onAnalyzeImage} />

                <button aria-label="Adjuntar archivo" onClick={onToggleUpload} style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, border: `1px solid ${attachedFiles.length > 0 ? `${accent}40` : T.border}`, background: attachedFiles.length > 0 ? `${accent}10` : 'transparent', color: attachedFiles.length > 0 ? accent : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                    <Plus size={24} style={{ transform: showUpload ? 'rotate(45deg)' : 'none', transition: '0.3s' }} />
                    {attachedFiles.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: accent, color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{attachedFiles.length}</span>}
                </button>
                <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 18, top: 12, color: T.muted, opacity: 0.5, pointerEvents: 'none', fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontFamily: 'inherit' }}>
                        {input}<span style={{ visibility: 'hidden' }}>{input}</span>{suggestion}
                    </div>
                    <textarea ref={inputRef} id="nexa-chat-input" aria-label="Escribe un mensaje" value={input} onChange={e => onInputChange(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Tab' && suggestion) { e.preventDefault(); onInputChange(input + suggestion); }
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
                        }}
                        placeholder={recording ? 'Escuchando voz...' : 'Escribe un mensaje...'} rows={1}
                        style={{ width: '100%', resize: 'none', borderRadius: 24, padding: '12px 18px', fontSize: 15, background: 'transparent', border: `1px solid ${recording ? accent : T.border}`, color: 'inherit', outline: 'none', maxHeight: 150, lineHeight: 1.5, boxSizing: 'border-box', fontFamily: 'inherit', position: 'relative', zIndex: 2 }} />
                    <button aria-label={recording ? 'Detener grabación de voz' : 'Activar grabación de voz'} onClick={onToggleRec} style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: '50%', background: recording ? `${accent}20` : 'none', color: recording ? accent : T.muted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                        {recording ? <StopCircle size={20} /> : <Mic size={20} />}
                    </button>
                </div>
                <button aria-label="Enviar mensaje" onClick={onSend} disabled={(!input.trim() && attachedFiles.length === 0) || thinking || streaming}
                    style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, border: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? `1px solid ${T.border}` : 'none', background: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? (autoSend && recording ? accent : '#1a1a2e') : 'transparent', color: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? '#f0f0f0' : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', cursor: 'pointer' }}>
                    {thinking ? <Loader2 size={20} style={{ animation: 'nexa-spin 1s linear infinite' }} /> : (autoSend && recording ? <Zap size={20} style={{ animation: 'pulse 1s infinite' }} /> : <ArrowUp size={20} />)}
                </button>
            </div>
        </div>
    );
}
