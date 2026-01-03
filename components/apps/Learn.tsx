import React, { useState } from 'react';
import { Book, GraduationCap, ChevronRight, CheckCircle2, Play, Brain, Zap } from 'lucide-react';

interface LearnProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string, type?: 'text' | 'image' | 'video' | 'code' | 'system') => void;
}

export default function Learn({ isOpen, onClose, onInsert }: LearnProps) {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState<'beginner' | 'intermediate' | 'advanced'>('beginner');
  const [mode, setMode] = useState<'plan' | 'quiz' | 'explain'>('explain');
  
  if (!isOpen) return null;

  const handleStart = () => {
    if (!topic.trim()) return;

    let prompt = '';
    switch (mode) {
      case 'plan':
        prompt = `Actúa como un tutor experto. Crea un plan de estudio detallado para aprender sobre "${topic}" en nivel ${level}. Divide el plan en módulos paso a paso con recursos recomendados y ejercicios prácticos.`;
        break;
      case 'quiz':
        prompt = `Genera un quiz interactivo de 5 preguntas sobre "${topic}" para un nivel ${level}. Presenta una pregunta a la vez y espera mi respuesta antes de dar feedback.`;
        break;
      case 'explain':
        prompt = `Explícame el concepto de "${topic}" como si tuviera un nivel de conocimiento ${level}. Usa analogías claras, ejemplos prácticos y desglosa los puntos complejos.`;
        break;
    }

    onInsert(prompt, 'system'); // Send as system/user prompt to chat
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-green-50">
          <div className="flex items-center gap-2 text-green-700">
            <GraduationCap className="w-5 h-5" />
            <h2 className="font-semibold">NEXA Learn</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Cerrar</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">¿Qué quieres aprender hoy?</label>
            <div className="relative">
              <Book className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ej. Física Cuántica, React, Historia de Roma..."
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Nivel de profundidad</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'beginner', label: 'Básico', icon: CheckCircle2 },
                { id: 'intermediate', label: 'Medio', icon: Brain },
                { id: 'advanced', label: 'Experto', icon:  Zap}
              ].map((lvl) => (
                <button
                  key={lvl.id}
                  onClick={() => setLevel(lvl.id as any)}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${level === lvl.id ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  <lvl.icon className="w-5 h-5 mb-1" />
                  <span className="text-xs font-medium">{lvl.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Modo de aprendizaje</label>
            <div className="space-y-2">
              {[
                { id: 'explain', label: 'Explicación detallada', desc: 'Conceptos clave y analogías' },
                { id: 'plan', label: 'Plan de estudios', desc: 'Ruta de aprendizaje paso a paso' },
                { id: 'quiz', label: 'Modo Quiz', desc: 'Evalúa tus conocimientos' }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMode(m.id as any)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${mode === m.id ? 'bg-green-50 border-green-500 ring-1 ring-green-500' : 'bg-white border-gray-200 hover:border-green-300'}`}
                >
                  <div>
                    <div className={`font-medium ${mode === m.id ? 'text-green-800' : 'text-gray-800'}`}>{m.label}</div>
                    <div className="text-xs text-gray-500">{m.desc}</div>
                  </div>
                  {mode === m.id && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={handleStart}
            disabled={!topic.trim()}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            Comenzar
          </button>
        </div>

      </div>
    </div>
  );
}
