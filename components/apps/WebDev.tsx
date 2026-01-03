import React, { useState } from 'react';
import { Globe, Layout, Code, Zap, Monitor, Smartphone, Layers, Palette } from 'lucide-react';

interface WebDevProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string, type: string) => void;
}

export default function WebDev({ isOpen, onClose, onInsert }: WebDevProps) {
  const [step, setStep] = useState(1);
  const [projectType, setProjectType] = useState('');
  const [style, setStyle] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleGenerate = () => {
      const prompt = `Actúa como un Desarrollador Web experto. Crea un proyecto de tipo "${projectType}" con un estilo visual "${style}".
      
Descripción del proyecto: ${description}

Características requeridas:
${features.map(f => `- ${f}`).join('\n')}

Por favor, genera el código completo en un solo archivo HTML con CSS (Tailwind) y JS embebido si es necesario. El código debe ser moderno, responsivo y listo para usar.`;

      onInsert(prompt, 'web_dev_prompt');
      onClose();
  };

  const toggleFeature = (feature: string) => {
      if (features.includes(feature)) {
          setFeatures(features.filter(f => f !== feature));
      } else {
          setFeatures([...features, feature]);
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Web Dev Studio</h2>
              <p className="text-xs text-gray-500">Arquitecto de Software Inteligente</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
          >
            <span className="sr-only">Cerrar</span>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
            {step === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <h3 className="text-lg font-semibold text-gray-900">¿Qué quieres construir hoy?</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { id: 'landing', label: 'Landing Page', icon: Layout, desc: 'Página de aterrizaje para productos o servicios' },
                            { id: 'dashboard', label: 'Dashboard', icon: Monitor, desc: 'Panel de administración con estadísticas' },
                            { id: 'portfolio', label: 'Portafolio', icon: Layers, desc: 'Muestra de trabajos y proyectos personales' },
                            { id: 'app', label: 'Web App', icon: Smartphone, desc: 'Aplicación funcional con interactividad' }
                        ].map(type => (
                            <button
                                key={type.id}
                                onClick={() => { setProjectType(type.label); setStep(2); }}
                                className="flex flex-col items-start p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group"
                            >
                                <type.icon className="w-8 h-8 text-gray-400 group-hover:text-blue-600 mb-3 transition-colors" />
                                <span className="font-semibold text-gray-900">{type.label}</span>
                                <span className="text-xs text-gray-500 mt-1">{type.desc}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 cursor-pointer hover:text-blue-600" onClick={() => setStep(1)}>
                        ← Volver
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">Elige el estilo visual</h3>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            'Minimalista', 'Futurista', 'Corporativo', 
                            'Cyberpunk', 'Juguetón', 'Brutalismo'
                        ].map(s => (
                            <button
                                key={s}
                                onClick={() => { setStyle(s); setStep(3); }}
                                className="p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:bg-blue-50/50 transition-all font-medium text-gray-700 hover:text-blue-700"
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 cursor-pointer hover:text-blue-600" onClick={() => setStep(2)}>
                        ← Volver
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles y Características</h3>
                        
                        <label className="block text-sm font-medium text-gray-700 mb-2">Descripción del proyecto</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ej: Una página para una cafetería con menú y formulario de contacto..."
                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[100px] mb-6"
                        />

                        <label className="block text-sm font-medium text-gray-700 mb-3">Componentes necesarios</label>
                        <div className="flex flex-wrap gap-2">
                            {['Hero Section', 'Formulario de Contacto', 'Galería de Imágenes', 'Testimonios', 'Footer', 'Modo Oscuro', 'Animaciones', 'Tabla de Precios'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => toggleFeature(f)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${features.includes(f) ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-blue-300'}`}
                                >
                                    {features.includes(f) ? '✓ ' : '+ '} {f}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={!description.trim()}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:hover:scale-100"
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Zap className="w-5 h-5" />
                            Generar Código
                        </div>
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
