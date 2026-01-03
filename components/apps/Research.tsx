import React, { useState } from 'react';
import { Search, Globe, FileText, Database, ArrowRight, Loader2 } from 'lucide-react';

interface ResearchProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string, type?: 'text' | 'image' | 'video' | 'code' | 'system') => void;
}

export default function Research({ isOpen, onClose, onInsert }: ResearchProps) {
  const [query, setQuery] = useState('');
  const [depth, setDepth] = useState<'quick' | 'deep' | 'academic'>('deep');
  const [sources, setSources] = useState<'all' | 'academic' | 'news'>('all');
  
  if (!isOpen) return null;

  const handleSearch = () => {
    if (!query.trim()) return;

    let prompt = '';
    const sourceText = sources === 'academic' ? 'fuentes académicas y papers' : sources === 'news' ? 'noticias recientes y fuentes periodísticas' : 'fuentes variadas y confiables';
    
    switch (depth) {
      case 'quick':
        prompt = `Realiza una investigación rápida sobre "${query}". Proporciona un resumen ejecutivo con los puntos clave, datos importantes y una conclusión breve. Usa ${sourceText}.`;
        break;
      case 'deep':
        prompt = `Realiza una investigación exhaustiva y profunda sobre "${query}". Analiza diferentes perspectivas, antecedentes históricos, estado actual y proyecciones futuras. Incluye citas (simuladas o reales si tienes acceso) y estructura el informe con secciones claras. Usa ${sourceText}.`;
        break;
      case 'academic':
        prompt = `Actúa como un investigador académico. Elabora un informe técnico sobre "${query}" con rigor científico. Incluye metodología teórica, análisis de datos (basado en conocimientos generales), discusión y referencias bibliográficas sugeridas. Enfócate en ${sourceText}.`;
        break;
    }

    onInsert(prompt, 'system');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-amber-50">
          <div className="flex items-center gap-2 text-amber-700">
            <Search className="w-5 h-5" />
            <h2 className="font-semibold">NEXA Research</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Cerrar</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Tema de investigación</label>
            <div className="relative">
              <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej. Impacto de la IA en la medicina..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Profundidad</label>
              <div className="space-y-1">
                {[
                  { id: 'quick', label: 'Resumen Rápido' },
                  { id: 'deep', label: 'Análisis Profundo' },
                  { id: 'academic', label: 'Paper Académico' }
                ].map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setDepth(d.id as any)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${depth === d.id ? 'bg-amber-100 text-amber-800 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Fuentes</label>
              <div className="space-y-1">
                {[
                  { id: 'all', label: 'General (Web)' },
                  { id: 'news', label: 'Noticias / Actualidad' },
                  { id: 'academic', label: 'Científico / Académico' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSources(s.id as any)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${sources === s.id ? 'bg-amber-100 text-amber-800 font-medium' : 'hover:bg-gray-50 text-gray-600'}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={handleSearch}
            disabled={!query.trim()}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Investigar</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
