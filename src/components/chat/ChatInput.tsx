'use client';
import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Send, Mic, X, Loader2, StopCircle, ArrowUp, Zap,
    FileText, Image as ImageIcon, Film, Music, Camera, File,
} from 'lucide-react';

const FILE_TYPES = {
    document: {
        icon: FileText,
        label: 'Subir documento',
        color: '#3b82f6',
        accept: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.csv,.js,.ts,.py,.html,.css,.json,.xml,.md',
        maxSize: 20 * 1024 * 1024,
        description: 'PDF, Word, Excel, PPT...',
    },
    image: {
        icon: ImageIcon,
        label: 'Subir imagen',
        color: '#a855f7',
        accept: 'image/*,.heic,.heic',
        maxSize: 10 * 1024 * 1024,
        description: 'JPG, PNG, GIF, WebP...',
    },
    video: {
        icon: Film,
        label: 'Subir video',
        color: '#ec4899',
        accept: 'video/mp4,video/webm,video/quicktime,video/x-msvideo,video/x-matroska,video/3gpp',
        maxSize: 100 * 1024 * 1024,
        description: 'MP4, WebM, MOV...',
    },
    audio: {
        icon: Music,
        label: 'Subir audio',
        color: '#f97316',
        accept: 'audio/mpeg,audio/wav,audio/ogg,audio/mp4,audio/aac,audio/flac,audio/webm',
        maxSize: 50 * 1024 * 1024,
        description: 'MP3, WAV, OGG...',
    },
    camera: {
        icon: Camera,
        label: 'Activar Cámara',
        color: '#3b82f6',
        accept: 'image/*,video/*',
        maxSize: 50 * 1024 * 1024,
        description: 'Foto o video directo',
    },
} as const;

type FileType = keyof typeof FILE_TYPES;

export interface UploadedFile {
    id: string;
    type: FileType;
    name: string;
    size: number;
    preview?: string;
    data: string;
    mimeType: string;
}

interface ChatInputProps {
    input: string;
    setInput: (val: string) => void;
    suggestion: string;
    setSuggestion: (val: string) => void;
    streaming: boolean;
    thinking: boolean;
    recording: boolean;
    accent: string;
    theme: { bg: string; surf: string; border: string; text: string; sec: string; muted: string };
    attachedFiles: UploadedFile[];
    setAttachedFiles: React.Dispatch<React.SetStateAction<UploadedFile[]>>;
    autoSend: boolean;
    onSend: () => void;
    onToggleRec: () => void;
    onAnalyzeImage?: (file: File) => Promise<void>;
}

export function ChatInput({
    input,
    setInput,
    suggestion,
    setSuggestion,
    streaming,
    thinking,
    recording,
    accent,
    theme: T,
    attachedFiles,
    setAttachedFiles,
    autoSend,
    onSend,
    onToggleRec,
    onAnalyzeImage,
}: ChatInputProps) {
    const [showUpload, setShowUpload] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    return (
        <div role="region" aria-label="Área de entrada de mensajes" style={{ borderTop: `1px solid ${T.border}`, background: `${T.bg}F2`, backdropFilter: 'blur(20px)', padding: '14px 14px 24px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, maxWidth: 600, margin: '0 auto', position: 'relative' }}>
                <FileUpload
                    isOpen={showUpload}
                    onClose={() => setShowUpload(false)}
                    onFilesSelected={(files) => {
                        // Auto-analyze images with vision
                        if (onAnalyzeImage) {
                            for (const f of files) {
                                if (f.type === 'image' || f.type === 'camera') {
                                    const byteString = atob(f.data);
                                    const ab = new ArrayBuffer(byteString.length);
                                    const ia = new Uint8Array(ab);
                                    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
                                    const blob = new Blob([ab], { type: f.mimeType });
                                    const fileObj = new File([blob], f.name, { type: f.mimeType });
                                    onAnalyzeImage(fileObj);
                                }
                            }
                            const nonImageFiles = files.filter(f => f.type !== 'image' && f.type !== 'camera');
                            if (nonImageFiles.length > 0) setAttachedFiles(p => [...p, ...nonImageFiles]);
                        } else {
                            setAttachedFiles(p => [...p, ...files]);
                        }
                    }}
                    onAnalyzeImage={onAnalyzeImage}
                />

                <button aria-label="Adjuntar archivo" onClick={() => setShowUpload(!showUpload)} style={{ width: 46, height: 46, borderRadius: 14, flexShrink: 0, border: `1px solid ${attachedFiles.length > 0 ? `${accent}40` : T.border}`, background: attachedFiles.length > 0 ? `${accent}10` : T.surf, color: attachedFiles.length > 0 ? accent : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                    <Plus size={24} style={{ transform: showUpload ? 'rotate(45deg)' : 'none', transition: '0.3s' }} />
                    {attachedFiles.length > 0 && <span style={{ position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: '50%', background: accent, color: '#000', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{attachedFiles.length}</span>}
                </button>
                <div style={{ flex: 1, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 18, top: 12, color: T.muted, opacity: 0.5, pointerEvents: 'none', fontSize: 15, whiteSpace: 'pre-wrap', lineHeight: 1.5, fontFamily: 'inherit' }}>
                        {input}<span style={{ visibility: 'hidden' }}>{input}</span>{suggestion}
                    </div>
                    <textarea ref={inputRef} id="nexa-chat-input" aria-label="Escribe un mensaje" value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Tab' && suggestion) { e.preventDefault(); setInput(input + suggestion); setSuggestion(''); }
                            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
                        }}
                        placeholder={recording ? 'Escuchando voz...' : 'Escribe un mensaje...'} rows={1}
                        style={{ width: '100%', resize: 'none', borderRadius: 24, padding: '12px 18px', fontSize: 15, background: 'transparent', border: `1px solid ${recording ? accent : T.border}`, color: T.text, outline: 'none', maxHeight: 150, lineHeight: 1.5, boxSizing: 'border-box', fontFamily: 'inherit', position: 'relative', zIndex: 2 }} />
                    <button aria-label={recording ? 'Detener grabación de voz' : 'Activar grabación de voz'} onClick={onToggleRec} style={{ position: 'absolute', right: 8, bottom: 8, width: 32, height: 32, borderRadius: '50%', background: recording ? `${accent}20` : 'none', color: recording ? accent : T.muted, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
                        {recording ? <StopCircle size={20} /> : <Mic size={20} />}
                    </button>
                </div>
                <button aria-label="Enviar mensaje" onClick={onSend} disabled={(!input.trim() && attachedFiles.length === 0) || thinking || streaming}
                    style={{ width: 48, height: 48, borderRadius: '50%', flexShrink: 0, border: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? `1px solid ${T.border}` : 'none', background: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? (autoSend && recording ? accent : '#1a1a2e') : T.surf, color: (input.trim() || attachedFiles.length > 0) && !thinking && !streaming ? '#f0f0f0' : T.muted, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s', cursor: 'pointer' }}>
                    {thinking ? <Loader2 size={20} style={{ animation: 'nexa-spin 1s linear infinite' }} /> : (autoSend && recording ? <Zap size={20} style={{ animation: 'pulse 1s infinite' }} /> : <ArrowUp size={20} />)}
                </button>
            </div>
            <FilePreview files={attachedFiles} onRemove={(id) => setAttachedFiles(p => p.filter(f => f.id !== id))} />
        </div>
    );
}

// ─── File Upload Component ───

function FileUpload({ isOpen, onClose, onFilesSelected, onAnalyzeImage }: {
    isOpen: boolean;
    onClose: () => void;
    onFilesSelected: (files: UploadedFile[]) => void;
    onAnalyzeImage?: (file: File) => Promise<void>;
}) {
    const fileRef = useRef<HTMLInputElement>(null);
    const camRef = useRef<HTMLInputElement>(null);
    const vidRef = useRef<HTMLInputElement>(null);
    const [activeType, setActiveType] = useState<FileType | null>(null);

    const processFiles = async (files: FileList, type: FileType) => {
        const config = FILE_TYPES[type];
        const processed: UploadedFile[] = [];
        for (const file of Array.from(files)) {
            if (file.size > config.maxSize) continue;
            try {
                const result = await new Promise<{ data: string; preview?: string }>((res, rej) => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const r = reader.result as string;
                        const base64 = r.split(',')[1];
                        if (type === 'image' || type === 'camera') res({ data: base64, preview: r });
                        else res({ data: base64 });
                    };
                    reader.onerror = rej;
                    reader.readAsDataURL(file);
                });
                processed.push({ id: `f-${Date.now()}-${Math.random()}`, type, name: file.name, size: file.size, preview: result.preview, data: result.data, mimeType: file.type || 'application/octet-stream' });
            } catch { }
        }
        if (processed.length > 0) {
            onFilesSelected(processed);
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div style={{ position: 'absolute', bottom: 60, left: 0, zIndex: 70, width: 240 }}>
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        style={{ position: 'relative', width: '100%', background: 'rgba(18, 18, 18, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid #222', borderRadius: 24, padding: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden' }}>
                        {(Object.entries(FILE_TYPES) as [FileType, any][]).map(([key, config]) => (
                            <button key={key} onClick={() => { setActiveType(key); if (key === 'camera') camRef.current?.click(); else if (key === 'video') vidRef.current?.click(); else { if (fileRef.current) { fileRef.current.accept = config.accept; fileRef.current.click(); } } }}
                                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 16, transition: '0.2s' }}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}>
                                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#0a0a0a', border: `1px solid ${config.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 10px ${config.color}15` }}>
                                    {<config.icon size={18} color={config.color} />}
                                </div>
                                <span style={{ fontSize: 14, fontWeight: 500, color: '#eee' }}>{config.label}</span>
                            </button>
                        ))}
                    </motion.div>
                    <input ref={fileRef} type="file" multiple hidden onChange={(e) => { if (e.target.files && activeType) processFiles(e.target.files, activeType); }} />
                    <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { if (e.target.files) processFiles(e.target.files, 'camera'); }} />
                    <input ref={vidRef} type="file" accept="video/*" capture="environment" hidden onChange={(e) => { if (e.target.files) processFiles(e.target.files, 'video'); }} />
                </div>
            )}
        </AnimatePresence>
    );
}

// ─── File Preview Component ───

function FilePreview({ files, onRemove }: { files: UploadedFile[]; onRemove: (id: string) => void }) {
    if (files.length === 0) return null;
    return (
        <div style={{ display: 'flex', gap: 10, padding: '12px 16px', overflowX: 'auto', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid #141428' }}>
            {files.map(f => (
                <div key={f.id} style={{ position: 'relative', width: 70, height: 70, borderRadius: 14, overflow: 'hidden', border: '1px solid #141428', background: '#0a0a14', flexShrink: 0 }}>
                    {f.preview ? <img src={f.preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><File size={24} color="#4a4a68" /></div>}
                    <button onClick={() => onRemove(f.id)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}><X size={14} /></button>
                </div>
            ))}
        </div>
    );
}
