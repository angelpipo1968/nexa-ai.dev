import React, { useState, useEffect } from 'react';
import { Video, X, Play, Download, CheckCircle2, Plus, Zap, Loader2, Clock, Sparkles } from 'lucide-react';

interface VideoGenProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string, videoSrc: string) => void;
  initialFile?: File | null;
}

export default function VideoGen({ isOpen, onClose, onInsert, initialFile }: VideoGenProps) {
  const [videoGenFile, setVideoGenFile] = useState<File | null>(initialFile || null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [optimizePrompt, setOptimizePrompt] = useState(true);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (initialFile) setVideoGenFile(initialFile);
  }, [initialFile]);

  useEffect(() => {
    if (videoGenFile) {
      const url = URL.createObjectURL(videoGenFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [videoGenFile]);

  const handleGenerateVideo = () => {
    setIsGeneratingVideo(true);
    // Simulate generation
    setTimeout(() => {
      setIsGeneratingVideo(false);
      setGeneratedVideo(true);
    }, 4000);
  };

  const handleInsert = () => {
    // Use uploaded video as result (simulated edit) or a default sample
    let videoSrc = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4"; 
    if (videoGenFile && videoGenFile.type.startsWith('video/')) {
        videoSrc = URL.createObjectURL(videoGenFile); // Note: In a real app, this should be the RESULT video
    }
    // Ideally we would return the GENERATED video, but for now we mimic the logic
    onInsert(videoPrompt, videoSrc);
    handleClose();
  };

  const handleClose = () => {
    setGeneratedVideo(false);
    setVideoGenFile(null);
    setVideoPrompt('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Video className="w-5 h-5 text-[#2563eb]" />
                    Generador de Video AI
                </h3>
                <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
                {generatedVideo ? (
                    <div className="flex flex-col items-center justify-center space-y-6">
                         <div className="w-full h-64 md:h-80 bg-black rounded-xl overflow-hidden relative group shadow-2xl ring-1 ring-gray-200 flex items-center justify-center">
                            {videoGenFile && videoGenFile.type.startsWith('image') && previewUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-60" />
                            ) : (
                                <div className="flex flex-col items-center justify-center text-white/50">
                                     <Video className="w-16 h-16 mb-2 opacity-50" />
                                     <p className="text-sm font-medium">Vista previa de video</p>
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center z-10">
                                 <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center cursor-pointer hover:scale-110 transition-transform group-hover:bg-white/30" onClick={() => alert("Reproduciendo video generado...")}>
                                     <Play className="w-10 h-10 text-white ml-1 fill-white" />
                                 </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20">
                                 <div className="flex items-center gap-3">
                                    <button className="text-white hover:text-red-400"><Play className="w-4 h-4 fill-white" /></button>
                                    <div className="h-1 bg-white/30 rounded-full overflow-hidden flex-1">
                                        <div className="h-full w-1/3 bg-red-500 rounded-full"></div>
                                    </div>
                                    <span className="text-xs text-white font-mono">00:07 / 00:22</span>
                                    <button className="text-white hover:text-red-400"><Download className="w-4 h-4" /></button>
                                 </div>
                            </div>
                         </div>

                         <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/20 text-green-400 rounded-full text-xs font-bold uppercase tracking-wider border border-green-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Completado
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">¡Tu video está listo!</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                Hemos generado una animación basada en tu prompt: <span className="italic text-gray-900">&quot;{videoPrompt}&quot;</span>
                            </p>
                         </div>
                         
                         <div className="flex gap-3 w-full max-w-md">
                             <button onClick={() => { setGeneratedVideo(false); setVideoGenFile(null); setVideoPrompt(''); }} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
                                 Descartar
                             </button>
                             <button onClick={handleInsert} className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5">
                                 Insertar en Chat
                             </button>
                         </div>
                    </div>
                ) : (
                    <>
                        <div className="space-y-2">
                           <label className="text-sm font-medium text-gray-500">1. Sube tu imagen o video de referencia</label>
                            <div 
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${videoGenFile ? 'border-red-500/50 bg-red-50' : 'border-gray-300 hover:border-red-400 hover:bg-gray-50'}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if(file) setVideoGenFile(file);
                                }}
                            >
                                {videoGenFile ? (
                                    <div className="text-center relative">
                                        {videoGenFile.type.startsWith('image') && previewUrl ? (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img src={previewUrl} alt="File preview" className="h-32 rounded-lg shadow-sm mb-2 object-cover" />
                                        ) : (
                                            <div className="h-32 w-32 bg-gray-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                                                <Video className="w-10 h-10 text-gray-400" />
                                            </div>
                                        )}
                                        <p className="text-sm font-medium text-gray-900">{videoGenFile.name}</p>
                                        <button onClick={() => setVideoGenFile(null)} className="text-xs text-red-400 hover:underline mt-1">Cambiar archivo</button>
                                    </div>
                                ) : (
                                    <div className="text-center cursor-pointer" onClick={() => document.getElementById('video-upload')?.click()}>
                                        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3 text-red-400">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium">Haz clic o arrastra un archivo aquí</p>
                                        <p className="text-xs text-gray-500 mt-1">Soporta JPG, PNG, MP4</p>
                                    </div>
                                )}
                                <input type="file" id="video-upload" className="hidden" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && setVideoGenFile(e.target.files[0])} />
                            </div>
                        </div>

                        {/* Prompt Section */}
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-medium text-gray-500">2. Describe cómo quieres recrearlo</label>
                                <button 
                                    onClick={() => setOptimizePrompt(!optimizePrompt)}
                                    className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${optimizePrompt ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                                >
                                    <Sparkles className="w-3 h-3" />
                                    {optimizePrompt ? 'VideoPrompt Activado' : 'Activar VideoPrompt'}
                                </button>
                            </div>
                            <textarea 
                                value={videoPrompt}
                                onChange={(e) => setVideoPrompt(e.target.value)}
                                placeholder="Ej: Haz que el paisaje se mueva suavemente, añade lluvia y una atmósfera melancólica..."
                                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-400 focus:ring-2 focus:ring-red-900/20 outline-none resize-none h-24 text-sm"
                            />
                            {optimizePrompt && videoPrompt.length > 5 && (
                                <p className="text-xs text-blue-600 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                    <Sparkles className="w-3 h-3" />
                                    Se mejorará automáticamente con detalles de planos e iluminación.
                                </p>
                            )}
                        </div>

                        {/* Settings */}
                        <div className="flex items-center gap-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>Duración: <strong className="text-gray-900">22 segundos</strong></span>
                            </div>
                            <div className="h-4 w-px bg-gray-200"></div>
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-gray-400" />
                                <span>Modelo: <strong className="text-gray-900">NEXA Video Gen 2.0</strong></span>
                            </div>
                        </div>

                        {/* Generate Button */}
                        <button 
                            onClick={handleGenerateVideo}
                            disabled={!videoGenFile || !videoPrompt || isGeneratingVideo}
                            className={`w-full py-3 rounded-xl font-medium text-white shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 ${
                                !videoGenFile || !videoPrompt || isGeneratingVideo
                                ? 'bg-gray-200 cursor-not-allowed text-gray-400' 
                                : 'bg-[#2563eb] hover:bg-blue-600 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            {isGeneratingVideo ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {optimizePrompt ? 'Optimizando prompt y generando...' : 'Generando Video...'}
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    Generar Video
                                </>
                            )}
                        </button>
                    </>
                )}
            </div>
        </div>
    </div>
  );
}
