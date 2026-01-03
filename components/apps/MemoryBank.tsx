import React, { useState, useEffect } from 'react';
import { Shield, X, Trash2, Plus, Save, Brain, Zap } from 'lucide-react';
import { MemorySystem, MemoryItem } from '@/lib/memory';

interface MemoryBankProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert?: (content: string, mediaSrc?: string) => void;
  initialFile?: File | null;
}

export default function MemoryBank({ isOpen, onClose, onInsert, initialFile }: MemoryBankProps) {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [newMemory, setNewMemory] = useState('');
  const [activeTab, setActiveTab] = useState<'facts' | 'preferences'>('facts');

  useEffect(() => {
    if (isOpen) {
      setMemories(MemorySystem.getMemories());
    }
  }, [isOpen]);

  const handleAdd = () => {
    if (!newMemory.trim()) return;
    const type = activeTab === 'facts' ? 'fact' : 'preference';
    MemorySystem.addMemory(newMemory, type);
    setMemories(MemorySystem.getMemories());
    setNewMemory('');
  };

  const handleDelete = (id: string) => {
    MemorySystem.removeMemory(id);
    setMemories(MemorySystem.getMemories());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] border border-gray-200">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-indigo-50">
                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                    <Brain className="w-5 h-5 text-indigo-600" />
                    Memoria Neuronal
                </h3>
                <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded-full transition-colors">
                    <X className="w-5 h-5 text-indigo-400" />
                </button>
            </div>

            <div className="p-4 bg-indigo-50/50 border-b border-indigo-100">
                <p className="text-xs text-indigo-600 mb-3">
                    Aquí se almacena lo que NEXA ha aprendido sobre ti. Estos datos se usan para personalizar cada interacción.
                </p>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setActiveTab('facts')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'facts' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        Datos y Hechos
                    </button>
                    <button 
                        onClick={() => setActiveTab('preferences')}
                        className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${activeTab === 'preferences' ? 'bg-indigo-600 text-white shadow-sm' : 'bg-white text-indigo-600 hover:bg-indigo-50'}`}
                    >
                        Preferencias
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {memories.filter(m => (activeTab === 'facts' ? m.type === 'fact' : m.type === 'preference')).length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <Brain className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No hay memorias registradas aún.</p>
                    </div>
                ) : (
                    memories
                        .filter(m => (activeTab === 'facts' ? m.type === 'fact' : m.type === 'preference'))
                        .map(memory => (
                        <div key={memory.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex items-start justify-between group hover:border-indigo-200 transition-colors">
                            <div>
                                <p className="text-sm text-gray-800">{memory.content}</p>
                                <p className="text-[10px] text-gray-400 mt-1">{new Date(memory.timestamp).toLocaleDateString()}</p>
                            </div>
                            <button 
                                onClick={() => handleDelete(memory.id)}
                                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={newMemory}
                        onChange={(e) => setNewMemory(e.target.value)}
                        placeholder={activeTab === 'facts' ? "Ej: Me llamo Alejandro..." : "Ej: Prefiero respuestas cortas..."}
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                    />
                    <button 
                        onClick={handleAdd}
                        disabled={!newMemory.trim()}
                        className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    </div>
  );
}
