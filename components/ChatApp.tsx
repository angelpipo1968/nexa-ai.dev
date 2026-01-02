'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Menu, X, Plus, MessageSquare, AlertCircle, Square, Settings, Globe, HelpCircle, ArrowUp, Gift, Download, Info, LogOut, User, ChevronLeft, ChevronRight, FolderPlus, Code } from 'lucide-react';

export default function ChatApp() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('Invitado');
  const [menuExpanded, setMenuExpanded] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cargar nombre del usuario
  useEffect(() => {
    const stored = localStorage.getItem('nexa_user_name');
    if (stored) {
      setUserName(stored);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  // Configurar reconocimiento de voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = navigator.language || 'es-ES';

        recognitionRef.current.onstart = () => setIsListening(true);
        recognitionRef.current.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsListening(false);
        };
        recognitionRef.current.onerror = (event: any) => {
          setIsListening(false);
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
          switch(event.error) {
            case 'no-speech':
              setError('No se detectó voz.');
              break;
            case 'not-allowed':
              setError(isIOS ? 
                'Permite el micrófono en Configuración > Safari.' : 
                'Permite el acceso al micrófono.');
              break;
            default:
              setError('Error de reconocimiento de voz.');
          }
        };
        recognitionRef.current.onend = () => setIsListening(false);
      }
    }
  }, []);

  const toggleVoiceRecognition = async () => {
    if (!recognitionRef.current) {
      setError('Reconocimiento de voz no disponible.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setError(null);
        recognitionRef.current.start();
      } catch (err: any) {
        setError(err.name === 'NotAllowedError' ? 
          'Permiso de micrófono denegado.' : 
          'Error al acceder al micrófono.');
      }
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-ES';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
      stopSpeaking();
      setMessages(prev => [...prev, {
        role: 'system',
        content: '⏹️ Generación cancelada'
      }]);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    abortControllerRef.current = new AbortController();

    try {
      const conversationHistory = messages
        .filter(m => m.role !== 'system')
        .map(msg => ({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...conversationHistory, {
            role: 'user',
            content: userMessage.content
          }]
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.content?.[0]?.text) {
        throw new Error('Respuesta inválida del servidor');
      }

      const assistantMessage = {
        role: 'assistant',
        content: data.content[0].text
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (voiceEnabled) {
        speakText(data.content[0].text);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Error:', error);
      setError(error.message || 'Error al procesar tu mensaje');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.'
      }]);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
    }
  };

  const handleNameChange = () => {
    const newName = prompt('¿Cómo te llamas?', userName);
    if (newName && newName.trim()) {
      setUserName(newName.trim());
      localStorage.setItem('nexa_user_name', newName.trim());
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 overflow-hidden">
      {/* Sidebar */}
      <div 
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } transition-all duration-300 ease-in-out bg-white/90 backdrop-blur-xl border-r border-blue-100 flex flex-col shadow-sm relative`}
      >
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-6 z-50 w-6 h-6 bg-white border border-blue-200 rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center text-slate-600 hover:text-blue-600"
        >
          {sidebarOpen ? <ChevronLeft className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>

        <div className="p-3 space-y-2">
          <button 
            onClick={() => {
              setMessages([]);
              setInput('');
              setError(null);
            }}
            className="w-full p-3 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-3 group"
          >
            <Plus className="w-5 h-5 text-slate-600 group-hover:text-blue-600 shrink-0" />
            {sidebarOpen && <span className="text-sm text-slate-700 font-medium">Nueva conversación</span>}
          </button>
        </div>

        <div className="h-px bg-blue-100 mx-3"></div>

        <div className="p-3 space-y-1">
          <button className="w-full p-3 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-3 group">
            <MessageSquare className="w-5 h-5 text-slate-600 group-hover:text-blue-600 shrink-0" />
            {sidebarOpen && <span className="text-sm text-slate-700">Conversaciones</span>}
          </button>
          <button className="w-full p-3 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-3 group">
            <FolderPlus className="w-5 h-5 text-slate-600 group-hover:text-blue-600 shrink-0" />
            {sidebarOpen && <span className="text-sm text-slate-700">Proyectos</span>}
          </button>
          <button className="w-full p-3 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-3 group">
            <Code className="w-5 h-5 text-slate-600 group-hover:text-blue-600 shrink-0" />
            {sidebarOpen && <span className="text-sm text-slate-700">Código</span>}
          </button>
        </div>

        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {messages.length > 0 && (
              <button className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all text-left">
                <MessageSquare className="w-4 h-4 text-blue-500 shrink-0" />
                <span className="text-sm text-slate-700 truncate">
                  {messages[0]?.content?.substring(0, 25) || 'Conversación'}...
                </span>
              </button>
            )}
          </div>
        )}

        <div className="border-t border-blue-100 mt-auto">
          <button
            onClick={() => setMenuExpanded(!menuExpanded)}
            className="w-full p-3 flex items-center justify-between hover:bg-blue-50 transition-all"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              {sidebarOpen && <span className="text-sm text-slate-600 font-medium truncate">{userName}</span>}
            </div>
            {sidebarOpen && (
              <svg className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${menuExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"/>
              </svg>
            )}
          </button>
          
          {sidebarOpen && (
            <div className={`overflow-hidden transition-all duration-300 ${menuExpanded ? 'max-h-96' : 'max-h-0'}`}>
              <div className="p-3 space-y-1">
                <button onClick={handleNameChange} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="text-sm text-slate-700">Cambiar nombre</span>
                </button>
                <button onClick={() => setVoiceEnabled(!voiceEnabled)} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left">
                  <div className="flex items-center gap-3">
                    {voiceEnabled ? <Volume2 className="w-4 h-4 text-slate-500" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                    <span className="text-sm text-slate-700">Síntesis de voz</span>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors ${voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${voiceEnabled ? 'translate-x-4' : ''}`}></div>
                  </div>
                </button>
                <div className="h-px bg-blue-100 my-2"></div>
                <button onClick={() => {
                  setUserName('Invitado');
                  localStorage.removeItem('nexa_user_name');
                  setMessages([]);
                  setMenuExpanded(false);
                }} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-50 transition-all text-left group">
                  <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-600" />
                  <span className="text-sm text-slate-700 group-hover:text-red-700">Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white/80 backdrop-blur-xl border-b border-blue-100 p-4 flex items-center gap-3 shadow-sm">
          <div className="flex-1 flex items-center justify-center gap-2">
            <svg width="28" height="28" viewBox="0 0 100 100">
              <defs>
                <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#06b6d4'}} />
                  <stop offset="100%" style={{stopColor: '#a855f7'}} />
                </linearGradient>
              </defs>
              <path d="M 20 20 L 50 50 L 20 80" stroke="url(#grad)" strokeWidth="10" fill="none" strokeLinecap="round"/>
              <path d="M 80 20 L 50 50 L 80 80" stroke="url(#grad)" strokeWidth="10" fill="none" strokeLinecap="round"/>
            </svg>
            <span className="text-base font-semibold bg-gradient-to-r from-cyan-600 to-purple-600 bg-clip-text text-transparent">NEXA OS</span>
          </div>
          {isSpeaking && (
            <button onClick={stopSpeaking} className="px-4 py-1.5 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm flex items-center gap-2 hover:bg-red-100 transition-all animate-pulse">
              <VolumeX className="w-4 h-4" />
              Detener voz
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border-b border-red-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 max-w-lg">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-100 to-purple-100 mb-4 shadow-lg">
                    <svg width="40" height="40" viewBox="0 0 100 100">
                      <defs>
                        <linearGradient id="logo" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{stopColor: '#06b6d4'}} />
                          <stop offset="100%" style={{stopColor: '#a855f7'}} />
                        </linearGradient>
                      </defs>
                      <path d="M 20 20 L 50 50 L 20 80" stroke="url(#logo)" strokeWidth="10" fill="none" strokeLinecap="round"/>
                      <path d="M 80 20 L 50 50 L 80 80" stroke="url(#logo)" strokeWidth="10" fill="none" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h2 className="text-3xl font-medium bg-gradient-to-r from-slate-700 to-slate-600 bg-clip-text text-transparent">
                    {userName === 'Invitado' ? '¡Hola! Soy NEXA OS' : `¡Hola ${userName}!`}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    ¿En qué puedo ayudarte hoy? Puedo asistirte con escritura, análisis, programación y mucho más.
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className="animate-fade-in">
                {msg.role === 'user' && (
                  <div className="flex justify-end">
                    <div className="max-w-2xl bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl px-4 py-3 border border-blue-200 shadow-sm">
                      <p className="text-slate-800 whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="flex justify-start">
                    <div className="max-w-2xl bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-blue-100 shadow-sm">
                      <p className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                  </div>
                )}
                {msg.role === 'system' && (
                  <div className="flex justify-center">
                    <div className="bg-cyan-50 border border-cyan-200 rounded-xl px-3 py-2 shadow-sm">
                      <p className="text-xs text-cyan-700">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-blue-100 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}

            {isListening && (
              <div className="flex justify-center">
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-2 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-red-600 animate-pulse" />
                    <p className="text-xs text-red-700 font-medium">Escuchando...</p>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-blue-100 p-4 bg-white/60 backdrop-blur-xl shadow-lg">
          <div className="max-w-3xl mx-auto">
            <div className="relative bg-white/80 backdrop-blur-sm border border-blue-200 rounded-2xl shadow-md focus-within:border-blue-300 focus-within:shadow-lg transition-all">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Envía un mensaje a NEXA OS..."
                className="w-full px-4 py-3 pr-24 outline-none resize-none text-slate-700 placeholder-slate-400 bg-transparent rounded-2xl text-base"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button
                  onClick={toggleVoiceRecognition}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white shadow-lg' : 'hover:bg-blue-50 text-slate-500 disabled:opacity-50'}`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
                <button
                  onClick={isLoading ? stopGeneration : sendMessage}
                  disabled={!isLoading && !input.trim()}
                  className={`p-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg ${isLoading ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed'}`}
                >
                  {isLoading ? <Square className="w-4 h-4 fill-current" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-2">
              NEXA OS puede cometer errores. Verifica la información importante.
            </p>
          </div>
        </div>
      </div>

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.5); }
      `}</style>
    </div>
  );
}