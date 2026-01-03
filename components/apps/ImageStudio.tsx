import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, X, Download, CheckCircle2, Plus, Zap, Loader2, Sliders, Wand2, Monitor, Smartphone, Maximize, Crop } from 'lucide-react';

interface ImageStudioProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string, imageSrc: string) => void;
  initialFile?: File | null;
}

export default function ImageStudio({ isOpen, onClose, onInsert, initialFile }: ImageStudioProps) {
  const [imageStudioFile, setImageStudioFile] = useState<File | null>(initialFile || null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<'generate' | 'edit'>('edit');

  useEffect(() => {
    if (initialFile) {
        setImageStudioFile(initialFile);
        setMode('edit');
    }
  }, [initialFile]);

  useEffect(() => {
    if (imageStudioFile) {
      const url = URL.createObjectURL(imageStudioFile);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [imageStudioFile]);

  const handleProcessImage = () => {
    setIsProcessingImage(true);
    // Simulate processing
    setTimeout(() => {
      setIsProcessingImage(false);
      // In a real app, this would be the result from the server. 
      // For now, we use the input image or a placeholder if generating from scratch.
      if (imageStudioFile) {
        setProcessedImage(previewUrl); 
      } else {
        // Placeholder for generation without input image
        setProcessedImage("https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=800&auto=format&fit=crop&q=60&ixlib=rb-4.0.3");
      }
    }, 3000);
  };

  const handleInsert = () => {
    if (processedImage) {
        onInsert(imagePrompt, processedImage);
        handleClose();
    }
  };

  const handleClose = () => {
    setProcessedImage(null);
    setImageStudioFile(null);
    setImagePrompt('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-purple-600" />
                    NEXA Image Studio
                </h3>
                <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-gray-500" />
                </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
                {processedImage ? (
                    <div className="flex flex-col items-center justify-center space-y-6">
                         <div className="w-full h-64 md:h-80 bg-black/5 rounded-xl overflow-hidden relative group shadow-lg ring-1 ring-gray-200 flex items-center justify-center">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={processedImage} alt="Result" className="w-full h-full object-contain" />
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent z-20 flex justify-end">
                                 <a href={processedImage} download="nexa_image.jpg" className="text-white hover:text-purple-400 bg-black/30 p-2 rounded-full backdrop-blur-sm"><Download className="w-5 h-5" /></a>
                            </div>
                         </div>

                         <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/20 text-purple-600 rounded-full text-xs font-bold uppercase tracking-wider border border-purple-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Procesado
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900">¡Imagen lista!</h3>
                            <p className="text-gray-500 max-w-md mx-auto">
                                He procesado tu imagen basándome en: <span className="italic text-gray-900">&quot;{imagePrompt || 'Mejora automática'}&quot;</span>
                            </p>
                         </div>
                         
                         <div className="flex gap-3 w-full max-w-md">
                             <button onClick={() => { setProcessedImage(null); }} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors border border-gray-200">
                                 Descartar
                             </button>
                             <button onClick={handleInsert} className="flex-1 py-3 bg-purple-600 text-white font-medium rounded-xl hover:bg-purple-700 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/40 transition-all transform hover:-translate-y-0.5">
                                 Insertar en Chat
                             </button>
                         </div>
                    </div>
                ) : (
                    <>
                        {/* Tabs/Mode Selection */}
                        <div className="flex bg-gray-100 p-1 rounded-xl mb-4">
                            <button 
                                onClick={() => setMode('edit')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'edit' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <Wand2 className="w-4 h-4" />
                                Edición Inteligente
                            </button>
                            <button 
                                onClick={() => setMode('generate')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'generate' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <ImageIcon className="w-4 h-4" />
                                Generar desde cero
                            </button>
                        </div>

                        <div className="space-y-2">
                           <label className="text-sm font-medium text-gray-500">
                                {mode === 'edit' ? '1. Sube tu imagen original' : '1. Configuración de lienzo (Opcional)'}
                           </label>
                            <div 
                                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${imageStudioFile ? 'border-purple-500/50 bg-purple-50' : 'border-gray-300 hover:border-purple-400 hover:bg-gray-50'}`}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if(file) setImageStudioFile(file);
                                }}
                            >
                                {imageStudioFile ? (
                                    <div className="text-center relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={previewUrl || ''} alt="File preview" className="h-40 rounded-lg shadow-sm mb-2 object-contain mx-auto" />
                                        <p className="text-sm font-medium text-gray-900">{imageStudioFile.name}</p>
                                        <button onClick={() => setImageStudioFile(null)} className="text-xs text-red-400 hover:underline mt-1">Cambiar archivo</button>
                                    </div>
                                ) : (
                                    <div className="text-center cursor-pointer" onClick={() => document.getElementById('image-upload')?.click()}>
                                        <div className="w-12 h-12 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-400">
                                            <Plus className="w-6 h-6" />
                                        </div>
                                        <p className="text-sm text-gray-900 font-medium">
                                            {mode === 'edit' ? 'Sube una imagen para editar' : 'Sube una referencia (opcional)'}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">JPG, PNG, WEBP</p>
                                    </div>
                                )}
                                <input type="file" id="image-upload" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && setImageStudioFile(e.target.files[0])} />
                            </div>
                        </div>

                        {/* Prompt Section */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-500">
                                {mode === 'edit' ? '2. ¿Qué cambios quieres hacer?' : '2. Describe la imagen que imaginas'}
                            </label>
                            <textarea 
                                value={imagePrompt}
                                onChange={(e) => setImagePrompt(e.target.value)}
                                placeholder={mode === 'edit' ? "Ej: Cambiar el fondo a una playa, mejorar la iluminación, eliminar objetos..." : "Ej: Un paisaje futurista cyberpunk con luces de neón..."}
                                className="w-full p-3 rounded-xl bg-gray-50 border border-gray-300 text-gray-900 placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-900/20 outline-none resize-none h-24 text-sm"
                            />
                        </div>

                        {/* Quick Settings */}
                        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                            {['Mejorar Calidad', 'Remover Fondo', 'Estilo Anime', 'Realista', 'Rostros Artificiales'].map(style => (
                                <button 
                                    key={style}
                                    onClick={() => setImagePrompt(prev => prev ? `${prev}, ${style}` : style)}
                                    className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 transition-colors whitespace-nowrap"
                                >
                                    + {style}
                                </button>
                            ))}
                        </div>

                        {/* Process Button */}
                        <button 
                            onClick={handleProcessImage}
                            disabled={(!imageStudioFile && mode === 'edit') || !imagePrompt || isProcessingImage}
                            className={`w-full py-3 rounded-xl font-medium text-white shadow-lg shadow-purple-500/20 transition-all flex items-center justify-center gap-2 ${
                                (!imageStudioFile && mode === 'edit') || !imagePrompt || isProcessingImage
                                ? 'bg-gray-200 cursor-not-allowed text-gray-400' 
                                : 'bg-purple-600 hover:bg-purple-700 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                        >
                            {isProcessingImage ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {mode === 'edit' ? 'Procesando Imagen...' : 'Generando Imagen...'}
                                </>
                            ) : (
                                <>
                                    <Zap className="w-5 h-5" />
                                    {mode === 'edit' ? 'Aplicar Cambios' : 'Generar Arte'}
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
