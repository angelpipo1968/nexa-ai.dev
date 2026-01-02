'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Plus, MessageSquare, AlertCircle, Square, Settings, Globe, HelpCircle, ArrowUp, Gift, Download, LogOut, User, ChevronLeft, ChevronRight, FolderPlus, Code, X } from 'lucide-react';
import JSZip from 'jszip';

declare global {
  interface Window {
    storage?: any;
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export default function ChatApp() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('Invitado');
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<'es' | 'en' | 'zh'>('es');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mode, setMode] = useState<'fast'|'deep'>('fast');
  const [codeMode, setCodeMode] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pdfTexts, setPdfTexts] = useState<Array<{ name: string; text: string }>>([]);

  useEffect(() => {
    const initPdf = async () => {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        // @ts-ignore
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
      } catch (e) {
        console.error("PDF init error", e);
      }
    };
    initPdf();
  }, []);

  const extractPdfText = async (file: File) => {
    const pdfjsLib = await import('pdfjs-dist');
    const data = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data }).promise;
    const parts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      parts.push(content.items.map((it: any) => it.str).join(' '));
    }
    return parts.join('\n\n');
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadUserName = async () => {
      try {
        if (window.storage?.get) {
          const result = await window.storage.get('nexa_user_name');
          if (result?.value) {
            setUserName(result.value);
          }
        }
      } catch (err) {
        console.log('Usuario nuevo:', err);
      }
    };
    loadUserName();
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [input]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      const langMap: Record<'es'|'en'|'zh', string> = { es: 'es-ES', en: 'en-US', zh: 'zh-CN' };
      recognitionRef.current.lang = langMap[language];

      recognitionRef.current.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Error de reconocimiento:', event.error);
        setIsListening(false);
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        
        switch(event.error) {
          case 'no-speech':
            setError('No se detectó voz. Intenta de nuevo.');
            break;
          case 'not-allowed':
            setError(isIOS ? 
              'Permite el acceso al micrófono en Configuración > Safari > Micrófono.' : 
              'Permite el acceso al micrófono en la configuración del navegador.');
            break;
          case 'network':
            setError('Error de red. Verifica tu conexión.');
            break;
          default:
            setError('Error de reconocimiento de voz.');
        }
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch (err) {
      return 'prompt';
    }
  };

  const toggleVoiceRecognition = async () => {
    if (!recognitionRef.current) {
      setError('Reconocimiento de voz no disponible en este navegador.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      return;
    }

    try {
      const permissionState = await checkMicrophonePermission();
      
      if (permissionState === 'denied') {
        setError('❌ Micrófono bloqueado. Haz clic en el ícono 🔒 o ⓘ en la barra de direcciones y permite el micrófono.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      
      setError(null);
      recognitionRef.current.start();
    } catch (err: any) {
      console.error('Error de micrófono:', err);
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('❌ Permiso denegado. Haz clic en el ícono 🔒 junto a la URL y permite el micrófono, luego recarga la página.');
      } else if (err.name === 'NotFoundError') {
        setError('❌ No se encontró ningún micrófono conectado.' as string);
      } else if (err.name === 'NotReadableError') {
        setError('❌ El micrófono está siendo usado por otra aplicación.');
      } else {
        setError('❌ Error al acceder al micrófono. Verifica los permisos del navegador.');
      }
    }
  };

  const speakText = (text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(text);
      
      const voices = window.speechSynthesis.getVoices();
      const voice = voices.find(v => {
        if (language === 'es') return v.lang.toLowerCase().startsWith('es');
        if (language === 'en') return v.lang.toLowerCase().startsWith('en');
        return v.lang.toLowerCase().startsWith('zh');
      });
      if (voice) utterance.voice = voice;
      const langMap: Record<'es'|'en'|'zh', string> = { es: 'es-ES', en: 'en-US', zh: 'zh-CN' };
      utterance.lang = langMap[language];
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = (event: any) => {
        console.error('Error en síntesis de voz:', event);
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    }, 100);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
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

    const attachmentNote = attachments.length ? `\nAdjuntos: ${attachments.map(f => f.name).join(', ')}` : '';
    const pdfNote = pdfTexts.length ? `\n\n${pdfTexts.map(p => `[PDF ${p.name}]\n${p.text}`).join('\n\n')}` : '';
    const userMessage = { role: 'user', content: input.trim() + attachmentNote + pdfNote };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setPdfTexts([]);
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

      // Convert image attachments to base64 for vision analysis
      const imageFiles = attachments.filter(f => f.type.startsWith('image/'));
      const readAsBase64 = (file: File) => new Promise<{ media_type: string; data: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve({ media_type: file.type, data: base64 });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const imageAttachments = await Promise.all(imageFiles.map(readAsBase64)).catch(() => []);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...conversationHistory, {
            role: 'user',
            content: userMessage.content
          }],
          language,
          attachments: imageAttachments,
          mode,
          codeMode
        }),
        signal: abortControllerRef.current.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Error del servidor: ${response.status}`);
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

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
    }
  };

  const saveUserName = async (name: string) => {
    try {
      if (window.storage?.set) {
        await window.storage.set('nexa_user_name', name);
      }
    } catch (err) {
      console.error('Error al guardar nombre:', err);
    }
  };

  const handleNameChange = () => {
    const newName = prompt('¿Cómo te llamas?', userName);
    if (newName && newName.trim()) {
      const trimmedName = newName.trim();
      setUserName(trimmedName);
      saveUserName(trimmedName);
    }
  };

  const handleLogout = async () => {
    setUserName('Invitado');
    try {
      if (window.storage?.delete) {
        await window.storage.delete('nexa_user_name');
      }
    } catch (err) {
      console.error('Error:', err);
    }
    setMessages([]);
    setMenuExpanded(false);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 overflow-hidden">
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
              stopSpeaking();
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

          <button 
            onClick={() => setCodeMode(!codeMode)}
            className="w-full p-3 rounded-lg hover:bg-blue-50 transition-all flex items-center gap-3 group"
          >
            <Code className="w-5 h-5 text-slate-600 group-hover:text-blue-600 shrink-0" />
            {sidebarOpen && <span className="text-sm text-slate-700">{codeMode ? 'Código (ON)' : 'Código'}</span>}
          </button>
        </div>

        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {messages.length > 0 && (
              <button className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-all text-left group">
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
            className="w-full p-3 flex items-center justify-between hover:bg-blue-50 transition-all group"
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
                <button onClick={handleNameChange} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group">
                  <User className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span className="text-sm text-slate-700">Cambiar nombre</span>
                </button>

                <button 
                  onClick={() => setShowSettings(true)}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
                >
                  <Settings className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span className="text-sm text-slate-700">Configuración</span>
                </button>

                <button 
                  onClick={() => {
                    stopSpeaking();
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center gap-3">
                    {voiceEnabled ? <Volume2 className="w-4 h-4 text-slate-500 group-hover:text-blue-600" /> : <VolumeX className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />}
                    <span className="text-sm text-slate-700">Síntesis de voz</span>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors ${voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full m-0.5 transition-transform ${voiceEnabled ? 'translate-x-4' : ''}`}></div>
                  </div>
                </button>

                <div className="h-px bg-blue-100 my-2"></div>

                <button 
                  onClick={() => alert('Idioma: Actualmente solo soportamos Español.')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
                >
                  <Globe className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span className="text-sm text-slate-700">Idioma</span>
                </button>

                <button 
                  onClick={() => alert('Ayuda: Visita nuestra documentación en línea o contacta soporte.')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
                >
                  <HelpCircle className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span className="text-sm text-slate-700">Ayuda</span>
                </button>

                <button 
                  onClick={() => alert('Mejorar plan: Las opciones premium estarán disponibles pronto.')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
                >
                  <ArrowUp className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span className="text-sm text-slate-700">Mejorar plan</span>
                </button>

                <button 
                  onClick={() => alert('Regalar: ¡Gracias por tu interés! Pronto podrás regalar suscripciones.')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
                >
                  <Gift className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span className="text-sm text-slate-700">Regalar NEXA OS</span>
                </button>

                <button 
                  onClick={() => alert('Descargar: La aplicación de escritorio/móvil está en desarrollo.')}
                  className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
                >
                  <Download className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
                  <span className="text-sm text-slate-700">Descargar app</span>
                </button>

                <div className="h-px bg-blue-100 my-2"></div>

                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-50 transition-all text-left group">
                  <LogOut className="w-4 h-4 text-slate-500 group-hover:text-red-600" />
                  <span className="text-sm text-slate-700 group-hover:text-red-700">Cerrar sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white border border-blue-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setMode('fast')}
                className={`px-3 py-1.5 text-sm ${mode==='fast'?'bg-blue-600 text-white':'text-slate-600 hover:bg-blue-50'}`}
              >
                Rápido
              </button>
              <button
                onClick={() => setMode('deep')}
                className={`px-3 py-1.5 text-sm ${mode==='deep'?'bg-blue-600 text-white':'text-slate-600 hover:bg-blue-50'}`}
              >
                Profundo
              </button>
            </div>
            <button
              onClick={() => setCodeMode(!codeMode)}
              className={`px-3 py-1.5 text-sm rounded-lg border ${codeMode?'border-purple-300 bg-purple-50 text-purple-700':'border-blue-200 bg-white text-slate-600 hover:bg-blue-50'}`}
              title="Modo Código"
            >
              {codeMode ? 'Código: ON' : 'Código: OFF'}
            </button>
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
            <div className="flex items-center gap-2 flex-1">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <span className="text-sm text-red-700 leading-relaxed">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 ml-2">
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
              <div key={idx}>
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
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) {
                    setAttachments(prev => [...prev, ...files]);
                    files.forEach(async (f) => {
                      if (f.type === 'application/pdf') {
                        try {
                          const text = await extractPdfText(f);
                          setPdfTexts(prev => [...prev, { name: f.name, text }]);
                        } catch {}
                      }
                    });
                  }
                }}
              />
              
              {attachments.length > 0 && (
                <div className="px-4 pt-3 flex flex-wrap gap-2">
                  {attachments.map((f, idx) => (
                    <div key={idx} className="flex items-center gap-2 px-2 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                      <span className="truncate max-w-[12rem]">{f.name}</span>
                      <button
                        onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                        className="text-blue-600 hover:text-blue-800"
                        aria-label="Quitar adjunto"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Envía un mensaje a NEXA OS..."
                className="w-full px-4 py-3 pr-24 outline-none resize-none text-slate-700 placeholder-slate-400 bg-transparent rounded-2xl text-base"
                rows={1}
                disabled={isLoading}
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
              
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl transition-all hover:bg-blue-50 text-slate-500"
                  title="Adjuntar archivos"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
                <button
                  onClick={toggleVoiceRecognition}
                  disabled={isLoading}
                  className={`p-2.5 rounded-xl transition-all ${
                    isListening ? 'bg-red-500 text-white shadow-lg' : 'hover:bg-blue-50 text-slate-500 disabled:opacity-50'
                  }`}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <button
                  onClick={isLoading ? stopGeneration : sendMessage}
                  disabled={!isLoading && !input.trim()}
                  className={`p-2.5 text-white rounded-xl transition-all shadow-md hover:shadow-lg ${
                    isLoading ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed'
                  }`}
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

       {showSettings && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100">
             <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
               <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                 <Settings className="w-5 h-5 text-blue-500" />
                 Configuración
               </h3>
               <button 
                 onClick={() => setShowSettings(false)} 
                 className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-all"
               >
                 <X className="w-5 h-5" />
               </button>
             </div>
             
             <div className="p-6 space-y-6">
               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Tu Nombre</label>
                 <input 
                   type="text" 
                   value={userName} 
                   onChange={(e) => setUserName(e.target.value)}
                   onBlur={(e) => saveUserName(e.target.value)}
                   placeholder="¿Cómo te llamas?"
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                 />
               </div>

               <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                 <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-lg ${voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                     {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                   </div>
                   <div>
                     <p className="font-medium text-gray-700">Respuesta por voz</p>
                     <p className="text-xs text-gray-500">NEXA leerá las respuestas en voz alta</p>
                   </div>
                 </div>
                 <button 
                   onClick={() => {
                     stopSpeaking();
                     setVoiceEnabled(!voiceEnabled);
                   }}
                   className={`w-12 h-6 rounded-full transition-colors relative ${voiceEnabled ? 'bg-blue-500' : 'bg-gray-300'}`}
                 >
                   <div 
                     className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all duration-300 ${voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                   ></div>
                 </button>
               </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Idioma</label>
                 <select 
                   value={language}
                   onChange={(e) => setLanguage(e.target.value as 'es'|'en'|'zh')}
                   className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-600"
                 >
                   <option value="es">Español (España)</option>
                   <option value="en">English (US)</option>
                   <option value="zh">中文 (简体)</option>
                 </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Exportar conversación</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
                        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'conversacion.txt'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-all text-sm"
                    >
                      Descargar .TXT
                    </button>
                    <button
                      onClick={() => {
                        const blob = new Blob([JSON.stringify(messages, null, 2)], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'conversacion.json'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-all text-sm"
                    >
                      Descargar .JSON
                    </button>
                    <button
                      onClick={() => {
                        const w = window.open('', '_blank');
                        if (!w) return;
                        const html = `
                          <html><head><title>Conversación</title>
                          <style>
                            body{font-family:system-ui,Segoe UI,Arial;padding:24px;}
                            .msg{margin-bottom:16px;padding:12px;border-radius:12px;}
                            .user{background:#e0f2fe;}
                            .assistant{background:#f8fafc;}
                            .system{background:#ecfeff;}
                            h1{font-size:18px;margin-bottom:12px;}
                          </style></head><body>
                          <h1>Conversación NEXA OS</h1>
                          ${messages.map(m => `<div class="msg ${m.role}"><strong>${m.role}</strong><div>${m.content.replace(/</g,'&lt;')}</div></div>`).join('')}
                          </body></html>`;
                        w.document.write(html);
                        w.document.close();
                        w.focus();
                        w.print();
                      }}
                      className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-all text-sm"
                    >
                      Guardar como PDF
                    </button>
                    <button
                      onClick={async () => {
                        const zip = new JSZip();
                        const text = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
                        zip.file('conversacion.txt', text);
                        zip.file('conversacion.json', JSON.stringify(messages, null, 2));
                        if (attachments.length) {
                          const folder = zip.folder('adjuntos');
                          if (folder) {
                            for (const f of attachments) {
                              const arrayBuffer = await f.arrayBuffer();
                              folder.file(f.name, arrayBuffer);
                            }
                          }
                        }
                        const blob = await zip.generateAsync({ type: 'blob' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url; a.download = 'nexa_conversacion.zip'; a.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 hover:bg-blue-100 transition-all text-sm"
                    >
                      Descargar .ZIP
                    </button>
                  </div>
                </div>
 
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Plantillas rápidas de código</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Crea un componente React funcional con:\n- botón \"Incrementar\"\n- contador en estado\n- estilos básicos Tailwind\nIncluye TypeScript.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 hover:bg-purple-100 transition-all text-sm"
                    >
                      React: Contador
                    </button>
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Crea una ruta API de Next.js (app/api/example/route.ts) que acepte POST con JSON {name} y responda {greeting: \"Hola {name}\"} con validación y tipos TypeScript.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 hover:bg-purple-100 transition-all text-sm"
                    >
                      Next.js: API
                    </button>
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Escribe una función TypeScript utilitaria:\n- nombre: formatCurrency\n- parámetros: amount:number, currency?:string=\"EUR\", locale?:string=\"es-ES\"\n- retorna string con Intl.NumberFormat\n- añade pruebas básicas de uso.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 hover:bg-purple-100 transition-all text-sm"
                    >
                      TS: Utilidad
                    </button>
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Genera un README breve para un proyecto Next.js con:\n- requisitos\n- instalación\n- scripts\n- despliegue en Vercel\n- estructura de carpetas.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-700 hover:bg-purple-100 transition-all text-sm"
                    >
                      README rápido
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
       )}
    </div>
  );
}
