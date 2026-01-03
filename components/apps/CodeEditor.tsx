import React, { useState } from 'react';
import { Code, Terminal, Play, Save, FileCode, Layers } from 'lucide-react';

interface CodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (content: string, type?: 'text' | 'image' | 'video' | 'code' | 'system') => void;
}

export default function CodeEditor({ isOpen, onClose, onInsert }: CodeEditorProps) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [task, setTask] = useState<'write' | 'review' | 'refactor' | 'explain'>('write');
  
  if (!isOpen) return null;

  const handleAction = () => {
    if (!code.trim() && task !== 'write') return; // Write task might have empty code if requesting generation

    let prompt = '';
    switch (task) {
      case 'write':
        prompt = `Escribe un código en ${language} que haga lo siguiente:\n\n${code}`; // Here 'code' state acts as description
        break;
      case 'review':
        prompt = `Revisa el siguiente código en ${language}, busca errores, vulnerabilidades y sugiere mejoras:\n\n\`\`\`${language}\n${code}\n\`\`\``;
        break;
      case 'refactor':
        prompt = `Refactoriza el siguiente código en ${language} para que sea más limpio, eficiente y moderno:\n\n\`\`\`${language}\n${code}\n\`\`\``;
        break;
      case 'explain':
        prompt = `Explica paso a paso qué hace este código en ${language}:\n\n\`\`\`${language}\n${code}\n\`\`\``;
        break;
    }

    onInsert(prompt, 'system');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-slate-50">
          <div className="flex items-center gap-2 text-slate-700">
            <Code className="w-5 h-5" />
            <h2 className="font-semibold">NEXA Code Studio</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <span className="sr-only">Cerrar</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 p-2 border-b border-gray-100 bg-white">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1 outline-none focus:border-blue-500"
          >
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
            <option value="bash">Bash</option>
          </select>
          
          <div className="h-4 w-px bg-gray-300 mx-1" />

          {[
            { id: 'write', label: 'Generar', icon: FileCode },
            { id: 'review', label: 'Revisar', icon: CheckCircle2 },
            { id: 'refactor', label: 'Refactorizar', icon: Layers },
            { id: 'explain', label: 'Explicar', icon: Terminal }
          ].map((t) => (
             // @ts-ignore
            <button
              key={t.id}
              onClick={() => setTask(t.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${task === t.id ? 'bg-slate-100 text-slate-800' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Editor Area */}
        <div className="flex-1 p-0 relative">
          <textarea 
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={task === 'write' ? "// Describe el código que quieres generar..." : "// Pega tu código aquí..."}
            className="w-full h-full resize-none p-4 font-mono text-sm outline-none bg-[#1e1e1e] text-gray-200 leading-relaxed"
            spellCheck={false}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <button 
            onClick={handleAction}
            disabled={!code.trim()}
            className="flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {task === 'write' ? 'Generar Código' : 'Procesar'}
          </button>
        </div>

      </div>
    </div>
  );
}

// Helper icon import (duplicated to avoid import errors if CheckCircle2 wasn't imported)
import { CheckCircle2 } from 'lucide-react';
