'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Plus, MessageSquare, AlertCircle, Settings, Globe, HelpCircle, ArrowUp, Gift, Download, LogOut, User, FolderPlus, Code, X, Search, Sparkles, Zap, Image, Video, Book, Briefcase, Calendar, PenTool, Lightbulb, FileText, Layout, Paperclip, Music, ChevronDown, ChevronUp, PanelLeft, Eye, EyeOff, Check, Copy, Clock, Loader2, Play, CheckCircle2, HardDrive, Shield, RotateCcw, Menu } from 'lucide-react';
import JSZip from 'jszip';
import { AuthModal } from '../components/AuthModal';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// CodeBlock Component
const CodeBlock = ({ language, code }: { language: string, code: string }) => {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Determine if code is previewable (HTML or SVG)
  const isPreviewable = ['html', 'svg', 'xml'].includes(language.toLowerCase()) || 
                       (language === '' && code.trim().startsWith('<'));

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200">
        <span className="text-xs font-semibold text-slate-500 uppercase">{language || 'code'}</span>
        <div className="flex items-center gap-2">
           {isPreviewable && (
             <button 
               onClick={() => setShowPreview(!showPreview)} 
               className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-white rounded-md transition-all"
             >
               {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
               {showPreview ? 'Ocultar' : 'Preview'}
             </button>
           )}
           <button 
             onClick={handleCopy} 
             className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 hover:text-green-600 hover:bg-white rounded-md transition-all"
           >
             {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
             {copied ? 'Copiado' : 'Copiar'}
           </button>
        </div>
      </div>
      
      {showPreview ? (
        <div className="p-0 bg-white border-b border-slate-200 relative group">
           <iframe 
             srcDoc={code} 
             className="w-full h-[400px] border-0 bg-white" 
             sandbox="allow-scripts"
             title="Preview"
           />
        </div>
      ) : (
        <div className="relative group">
            <pre className="p-4 overflow-x-auto text-sm font-mono text-slate-700 bg-slate-50 whitespace-pre">
            {code}
            </pre>
        </div>
      )}
    </div>
  )
}

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserName(currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario');
        
        // Save user to Firestore if not exists
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
              photoURL: currentUser.photoURL,
              createdAt: new Date().toISOString(),
              role: 'user'
            });
          }
        } catch (error) {
          console.error("Error creating user document:", error);
        }
      } else {
        setUserName('Invitado');
      }
    });

    return () => unsubscribe();
  }, []);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<'es' | 'en' | 'zh'>('es');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [mode, setMode] = useState<'fast'|'deep'>('fast');
  const [codeMode, setCodeMode] = useState(false);
  const [autoVoiceMode, setAutoVoiceMode] = useState(false);
  const [showCreative, setShowCreative] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [pdfTexts, setPdfTexts] = useState<Array<{ name: string; text: string }>>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [conversations, setConversations] = useState<Array<{id: string, title: string, date: string, messages: any[]}>>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);
  // Video Gen States
  const [showVideoGen, setShowVideoGen] = useState(false);
  const [videoGenFile, setVideoGenFile] = useState<File | null>(null);
  const [videoPrompt, setVideoPrompt] = useState('');
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);

  const handleGenerateVideo = () => {
    setIsGeneratingVideo(true);
    // Simulation of video generation process
    setTimeout(() => {
        setIsGeneratingVideo(false);
        setGeneratedVideo(true);
    }, 3000);
  };

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);
    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  useEffect(() => {
    const initPdf = async () => {
      if (typeof window === 'undefined') return;
      try {
        // Use require to avoid some ESM issues in dev if import fails
        const pdfjsLib = await import('pdfjs-dist');
        const lib = pdfjsLib.default || pdfjsLib;
        
        if (lib && lib.GlobalWorkerOptions) {
            // Use unpkg for matching version, fallback to a stable recent version
            const version = lib.version || '4.0.379';
            lib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
        }
      } catch (e) {
        console.error("PDF init error", e);
      }
    };
    initPdf();

    // Load offline history
    const savedHistory = localStorage.getItem('nexa_conversations');
    if (savedHistory) {
        try {
            setConversations(JSON.parse(savedHistory));
        } catch (e) { console.error(e); }
    }

    const savedMessages = localStorage.getItem('nexa_chat_history');
    if (savedMessages) {
        try {
            setMessages(JSON.parse(savedMessages));
        } catch (e) {
            console.error("Error loading history", e);
        }
    }
  }, []);

  useEffect(() => {
      localStorage.setItem('nexa_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
      localStorage.setItem('nexa_conversations', JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
      localStorage.setItem('nexa_settings_language', language);
  }, [language]);

  useEffect(() => {
      localStorage.setItem('nexa_settings_voice', JSON.stringify(voiceEnabled));
  }, [voiceEnabled]);

  useEffect(() => {
      const savedLang = localStorage.getItem('nexa_settings_language');
      if (savedLang && (savedLang === 'es' || savedLang === 'en' || savedLang === 'zh')) {
          setLanguage(savedLang);
      }
      const savedVoice = localStorage.getItem('nexa_settings_voice');
      if (savedVoice) {
          setVoiceEnabled(JSON.parse(savedVoice));
      }

      // Auto-repair check
      const checkAutoRepair = async () => {
        const localConv = localStorage.getItem('nexa_conversations');
        const localMsg = localStorage.getItem('nexa_chat_history');
        
        if ((!localConv || localConv === '[]') && (!localMsg || localMsg === '[]')) {
             try {
                const res = await fetch('/api/system/restore');
                const data = await res.json();
                if (data.success && data.data) {
                    // Simulating "Auto Repair" by asking user
                    if (confirm('⚠️ NEXA OS: Se detectó una posible pérdida de datos. ¿Deseas ejecutar la AUTO-REPARACIÓN desde la última copia de seguridad?')) {
                        const { messages: msgs, conversations: convs, settings } = data.data;
                        if(msgs) setMessages(msgs);
                        if(convs) setConversations(convs);
                        if(settings) {
                            if(settings.language) setLanguage(settings.language);
                            if(settings.userName) setUserName(settings.userName);
                            if(settings.voiceEnabled !== undefined) setVoiceEnabled(settings.voiceEnabled);
                        }
                    }
                }
             } catch(e) { console.error("Auto-repair check failed", e); }
        }
     };
     setTimeout(checkAutoRepair, 1500);
  }, []);

  const startNewChat = () => {
      if (messages.length > 0) {
          const newChat = {
              id: Date.now().toString(),
              title: messages[0].content.substring(0, 30) + '...',
              date: new Date().toLocaleDateString(),
              messages: [...messages]
          };
          setConversations(prev => [newChat, ...prev]);
      }
      setMessages([]);
      setInput('');
      setError(null);
      stopSpeaking();
      setShowConversations(false);
  };

  const loadConversation = (id: string) => {
      const chat = conversations.find(c => c.id === id);
      if (chat) {
          if (messages.length > 0) {
             // Save current before switching? Maybe optional.
          }
          setMessages(chat.messages);
          setShowConversations(false);
      }
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setConversations(prev => prev.filter(c => c.id !== id));
  };

  const handleSystemBackup = async () => {
    setIsBackingUp(true);
    try {
      const userData = {
         messages,
         conversations,
         settings: { language, voiceEnabled, userName }
      };
      
      const res = await fetch('/api/system/backup', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userData })
      });
      
      if (res.ok) {
         alert('Copia de seguridad completada exitosamente en la carpeta /backups');
      } else {
         throw new Error('Error en el backup');
      }
    } catch (e) {
      console.error(e);
      alert('Error al realizar la copia de seguridad');
    } finally {
      setIsBackingUp(false);
    }
  };
  
  const handleSystemRestore = async () => {
     if(!confirm('¿Estás seguro? Esto sobrescribirá tus datos actuales con la última copia de seguridad.')) return;
     
     try {
       const res = await fetch('/api/system/restore');
       const data = await res.json();
       
       if (data.success && data.data) {
          const { messages: msgs, conversations: convs, settings } = data.data;
          if(msgs) setMessages(msgs);
          if(convs) setConversations(convs);
          if(settings) {
              if(settings.language) setLanguage(settings.language);
              if(settings.userName) setUserName(settings.userName);
              if(settings.voiceEnabled !== undefined) setVoiceEnabled(settings.voiceEnabled);
          }
          alert('Sistema restaurado correctamente.');
          setShowSettings(false);
       } else {
          alert('No se encontró ninguna copia de seguridad válida.');
       }
     } catch (e) {
       console.error(e);
       alert('Error al restaurar el sistema');
     }
  };

  const extractPdfText = async (file: File) => {
    try {
      // Use require to avoid ESM issues
      const pdfjsLibModule = await import('pdfjs-dist');
      const pdfjsLib = pdfjsLibModule.default || pdfjsLibModule;
      
      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const parts: string[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        // @ts-ignore
        parts.push(content.items.map((it: any) => it.str).join(' '));
      }
      return parts.join('\n\n');
    } catch (e) {
      console.error("Error extracting PDF text:", e);
      return "";
    }
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
        if (autoVoiceMode && event.results[0].isFinal) {
            // Give a small delay to ensure state is updated
            setTimeout(() => {
                document.getElementById('send-button')?.click();
            }, 500);
        }
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
  }, [autoVoiceMode]);

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
        if (autoVoiceMode) {
            setTimeout(() => toggleVoiceRecognition(), 500);
        }
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

    // INTERCEPTION: Detect video generation intent
    const lowerInput = input.toLowerCase();
    const isVideoRequest = lowerInput.includes('video') && (lowerInput.includes('generar') || lowerInput.includes('crear') || lowerInput.includes('haz') || lowerInput.includes('make') || lowerInput.includes('create'));
    
    if (isVideoRequest) {
      const userMessage = { role: 'user', content: input.trim() };
      setMessages(prev => [...prev, userMessage]);
      setInput('');
      setIsLoading(true);
      
      // Simulate processing time
      setTimeout(() => {
        setIsLoading(false);
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: "¡Claro que sí! Puedo ayudarte a generar ese video. He abierto la herramienta **Video Gen** para ti. Por favor, ingresa los detalles en el panel que acaba de aparecer."
        }]);
        setShowVideoGen(true);
        if (voiceEnabled) speakText("¡Claro que sí! Puedo ayudarte a generar ese video. He abierto la herramienta Video Gen para ti.");
      }, 1000);
      return;
    }

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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 overflow-hidden font-sans">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={`${
          sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-[72px] md:translate-x-0'
        } transition-all duration-300 ease-in-out bg-gray-50/80 backdrop-blur-xl border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-40 md:relative md:z-20 h-full shadow-2xl md:shadow-none`}
      >
        {/* Header Section */}
        <div className="flex flex-col pt-6 pb-4 px-4 gap-4">
            <div className="flex items-center justify-between">
                {sidebarOpen && (
                    <h1 className="text-lg font-bold text-slate-800 tracking-tight ml-2">Nexa</h1>
                )}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-lg hover:bg-gray-200/50 text-slate-500 transition-colors ${!sidebarOpen ? 'mx-auto' : ''}`}
                >
                  <PanelLeft className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Main Actions */}
        <div className="flex flex-col px-3 gap-2">
            <button 
                onClick={startNewChat}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all text-slate-500 hover:bg-gray-100 hover:text-slate-900 ${!sidebarOpen ? 'justify-center' : ''}`}
                title="New Chat"
            >
                <Plus className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">New Chat</span>}
            </button>

            <button 
                onClick={() => setShowCreative(true)}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all text-slate-500 hover:bg-gray-100 hover:text-slate-900 ${!sidebarOpen ? 'justify-center' : ''}`}
                title="New Project"
            >
                <FolderPlus className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">New Project</span>}
            </button>

            <button 
                onClick={() => {
                    setShowConversations(!showConversations);
                    if (!sidebarOpen) setSidebarOpen(true);
                }}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${showConversations ? 'bg-gray-100 text-slate-900' : 'text-slate-500 hover:bg-gray-100 hover:text-slate-900'} ${!sidebarOpen ? 'justify-center' : ''}`}
                title="All Chats"
            >
                <Search className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">All Chats</span>}
            </button>
        </div>

        {/* Conversations List (Only when open) */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-4 mt-2">
            {showConversations ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                    <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 mb-3">Historial</h3>
                    {conversations.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No hay conversaciones</p>}
                    {conversations.map(chat => (
                        <div key={chat.id} onClick={() => loadConversation(chat.id)} className="w-full p-2.5 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-100 transition-all cursor-pointer group relative">
                            <p className="text-sm text-slate-700 font-medium truncate pr-6">{chat.title}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{chat.date}</p>
                            <button 
                                onClick={(e) => deleteConversation(chat.id, e)}
                                className="absolute right-2 top-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            ) : null}
          </div>
        )}

        {/* Spacer if closed to push user to bottom */}
        {!sidebarOpen && <div className="flex-1"></div>}

        {/* Bottom Section: User Profile */}
        <div className="p-4 mt-auto border-t border-gray-200/50">
             {userName === 'Invitado' ? (
                sidebarOpen ? (
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                setAuthMode('login');
                                setIsAuthModalOpen(true);
                            }}
                            className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all shadow-sm"
                        >
                            Log In
                        </button>
                        <button 
                            onClick={() => {
                                setAuthMode('signup');
                                setIsAuthModalOpen(true);
                            }}
                            className="flex-1 py-2 px-3 bg-white border border-gray-200 hover:bg-gray-50 text-slate-700 text-xs font-bold rounded-lg transition-all shadow-sm"
                        >
                            Sign Up
                        </button>
                    </div>
                ) : (
                    <button 
                        onClick={() => {
                            setAuthMode('login');
                            setIsAuthModalOpen(true);
                        }}
                        className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-md mx-auto hover:scale-105 transition-transform"
                        title="Log In / Sign Up"
                    >
                        <User className="w-4 h-4" />
                    </button>
                )
             ) : (
                 <div className={`flex items-center gap-3 ${!sidebarOpen ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-md shrink-0">
                        {userName.charAt(0).toUpperCase()}
                    </div>
                    {sidebarOpen && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
                            <button onClick={() => signOut(auth)} className="text-[10px] text-slate-400 hover:text-blue-600 transition-colors flex items-center gap-1">
                                <LogOut size={10} /> Cerrar Sesión
                            </button>
                        </div>
                    )}
                 </div>
             )}
        </div>

        <AuthModal 
          isOpen={isAuthModalOpen} 
          onClose={() => setIsAuthModalOpen(false)} 
          defaultMode={authMode} 
        />

      {sidebarOpen && (
        <div className="px-3 pb-4">
            <div className="h-px bg-blue-100 my-2"></div>

            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
            >
              <Settings className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
              <span className="text-sm text-slate-700">Configuración</span>
            </button>

            <button 
              onClick={() => {
                  const nextLang = language === 'es' ? 'en' : 'es';
                  setLanguage(nextLang);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-blue-50 transition-all text-left group"
            >
              <Globe className="w-4 h-4 text-slate-500 group-hover:text-blue-600" />
              <span className="text-sm text-slate-700">Idioma: {language === 'es' ? 'Español' : 'English'}</span>
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
      )}
    </div>

      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white/80 backdrop-blur-xl border-b border-blue-100 p-4 flex items-center gap-3 shadow-sm">
          <button 
             onClick={() => setSidebarOpen(true)}
             className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg mr-2"
          >
             <Menu className="w-6 h-6" />
          </button>
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
                    <div className="max-w-2xl w-full bg-white/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-blue-100 shadow-sm overflow-hidden">
                      {msg.content.split(/(```[\s\S]*?```)/g).map((part, i) => {
                          if (part.startsWith('```')) {
                              const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
                              if (match) {
                                  return <CodeBlock key={i} language={match[1] || ''} code={match[2]} />;
                              }
                          }
                          return <p key={i} className="text-slate-700 leading-relaxed whitespace-pre-wrap break-words">{part}</p>;
                      })}
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
          <div className="max-w-4xl mx-auto">
            <div className="relative bg-white/40 backdrop-blur-md border border-white/50 rounded-[2rem] shadow-sm focus-within:shadow-md transition-all p-2">
              <input
                ref={docInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.pdf,.doc,.docx,.xls,.xlsx,.csv"
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
              <input
                ref={imageInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) setAttachments(prev => [...prev, ...files]);
                }}
              />
              <input
                ref={videoInputRef}
                type="file"
                multiple
                accept="video/*"
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) setAttachments(prev => [...prev, ...files]);
                }}
              />
              <input
                ref={audioInputRef}
                type="file"
                multiple
                accept="audio/*"
                className="hidden"
                onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length) setAttachments(prev => [...prev, ...files]);
                }}
              />
              
              {/* @ts-ignore */}
              <input
                  type="file"
                  multiple
                  // @ts-ignore
                  webkitdirectory=""
                  directory=""
                  className="hidden"
                  id="folder-upload"
                  onChange={(e) => {
                      // @ts-ignore
                      const files = Array.from(e.target.files || []);
                      if (files.length) setAttachments(prev => [...prev, ...files]);
                  }}
              />

              {showUploadMenu && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 ml-2 w-60 bg-white/90 backdrop-blur-xl border border-white/50 rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-1.5 space-y-0.5">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">Upload</div>
                        <button onClick={() => { setShowUploadMenu(false); docInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Paperclip className="w-4 h-4" /></div>
                            <span className="font-medium">Document</span>
                        </button>
                        <button onClick={() => { setShowUploadMenu(false); imageInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><Image className="w-4 h-4" /></div>
                            <span className="font-medium">Image</span>
                        </button>
                        <button onClick={() => { setShowUploadMenu(false); videoInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-red-100 rounded-lg text-red-600"><Video className="w-4 h-4" /></div>
                            <span className="font-medium">Video</span>
                        </button>
                        <button onClick={() => { setShowUploadMenu(false); audioInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><Music className="w-4 h-4" /></div>
                            <span className="font-medium">Audio</span>
                        </button>
                         <button onClick={() => { setShowUploadMenu(false); document.getElementById('folder-upload')?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-green-50 hover:text-green-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-green-100 rounded-lg text-green-600"><FolderPlus className="w-4 h-4" /></div>
                            <span className="font-medium">Folder</span>
                        </button>
                    </div>
                </div>
              )}

              <div className="flex flex-col gap-2">
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="¿Cómo puedo ayudarte hoy?"
                    className="w-full px-4 py-2 outline-none resize-none text-slate-700 placeholder-slate-400 bg-transparent text-lg font-medium"
                    rows={1}
                    disabled={isLoading}
                    style={{ minHeight: '44px', maxHeight: '120px' }}
                />

                <div className="flex items-center justify-between px-2 pb-1">
                    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                        <button
                            onClick={() => setShowUploadMenu(!showUploadMenu)}
                            disabled={isLoading}
                            className={`p-2 rounded-full hover:bg-black/5 transition-colors ${showUploadMenu ? 'bg-blue-100 text-blue-600' : 'text-slate-500'}`}
                            title="Adjuntar archivo"
                        >
                            <Plus className={`w-5 h-5 transition-transform ${showUploadMenu ? 'rotate-45' : ''}`} />
                        </button>
                        
                        <div className="h-4 w-px bg-slate-200 mx-1"></div>

                        <button
                            onClick={() => setMode(mode === 'fast' ? 'deep' : 'fast')}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${mode === 'deep' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                        >
                            <Zap className="w-3 h-3" />
                            {mode === 'deep' ? 'Thinking' : 'Rápido'}
                        </button>

                        <button
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                            onClick={() => alert("Búsqueda web próximamente")}
                        >
                            <Search className="w-3 h-3" />
                            Search
                        </button>

                        <button
                            onClick={() => setShowCreative(true)}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                        >
                            <Sparkles className="w-3 h-3" />
                            MCP
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                         <button
                           onClick={() => setAutoVoiceMode(!autoVoiceMode)}
                           className={`p-2 rounded-full transition-all ${autoVoiceMode ? 'bg-green-100 text-green-600' : 'hover:bg-black/5 text-slate-400'}`}
                           title={autoVoiceMode ? "Auto: ON" : "Auto: OFF"}
                         >
                           <MessageSquare className="w-5 h-5" />
                         </button>
                        <button
                            onClick={toggleVoiceRecognition}
                            disabled={isLoading}
                            className={`p-3 rounded-full transition-all shadow-sm ${
                                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                        >
                            {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                        </button>
                        <button
                            id="send-button"
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                            className={`p-3 rounded-full transition-all shadow-sm ${
                                isLoading || !input.trim() 
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105 active:scale-95'
                            }`}
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {attachments.length > 0 && (
                    <div className="px-4 pb-2 flex flex-wrap gap-2">
                    {attachments.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-100 rounded-full text-xs text-slate-600 shadow-sm">
                        <span className="truncate max-w-[12rem]">{f.name}</span>
                        <button
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="text-slate-400 hover:text-red-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                        </div>
                    ))}
                    </div>
                )}
              </div>
            </div>

            {/* Quick Actions Chips */}
            <div className="mt-4 flex flex-col items-center gap-3 px-4">
                <div className="flex flex-wrap gap-2 justify-center transition-all duration-300 ease-in-out">
                {[
                    { icon: Image, label: 'Image Edit', action: () => { setCodeMode(false); setInput('Edita esta imagen para que parezca...'); imageInputRef.current?.click(); } },
                    { icon: Layout, label: 'Web Dev', action: () => { setCodeMode(true); setMode('fast'); setInput('Crea una landing page para...'); } },
                    { icon: Book, label: 'Learn', action: () => { setCodeMode(false); setMode('deep'); setInput('Explícame el concepto de...'); } },
                    { icon: Search, label: 'Deep Research', action: () => { setCodeMode(false); setMode('deep'); setInput('Investiga profundamente sobre...'); } },
                    { icon: Sparkles, label: 'Image Gen', action: () => { setCodeMode(false); setInput('Genera una imagen de...'); } },
                    { icon: Video, label: 'Video Gen', action: () => { setCodeMode(false); setInput('Crea un guion de video sobre...'); } },
                    { icon: Briefcase, label: 'Artifacts', action: () => { setShowCreative(true); } },
                    { icon: Calendar, label: 'Travel Planner', action: () => { setCodeMode(false); setInput('Planifica un viaje de 5 días a...'); } },
                    { icon: Code, label: 'Code', action: () => { setCodeMode(true); setInput('Escribe una función en Python que...'); } },
                    { icon: PenTool, label: 'Make a plan', action: () => { setCodeMode(false); setMode('deep'); setInput('Crea un plan detallado para...'); } },
                    { icon: FileText, label: 'Summarize', action: () => { setCodeMode(false); setInput('Resume este texto: '); } },
                    { icon: Lightbulb, label: 'Brainstorm', action: () => { setCodeMode(false); setInput('Dame 10 ideas creativas para...'); } },
                ].slice(0, showAllApps ? undefined : 6).map((item, idx) => (
                    <button
                        key={idx}
                        onClick={item.action}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/50 hover:bg-white border border-white/60 hover:border-blue-200 rounded-full text-xs text-slate-600 hover:text-blue-600 transition-all shadow-sm backdrop-blur-sm animate-in fade-in zoom-in duration-200"
                    >
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                    </button>
                ))}
                </div>
                
                <button
                    onClick={() => setShowAllApps(!showAllApps)}
                    className="flex items-center gap-1 px-4 py-1.5 bg-white/40 hover:bg-white/80 border border-white/50 rounded-full text-xs font-medium text-slate-500 hover:text-slate-700 transition-all shadow-sm backdrop-blur-sm"
                >
                    {showAllApps ? (
                        <>
                            Show Less <ChevronUp className="w-3 h-3" />
                        </>
                    ) : (
                        <>
                            More <ChevronDown className="w-3 h-3" />
                        </>
                    )}
                </button>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-4 opacity-60">
              NEXA OS v2.0 • AI Powered Workspace
            </p>
          </div>
        </div>
      </div>

      {showVideoGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-red-50 to-orange-50">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <Video className="w-5 h-5 text-red-500" />
                        Generador de Video AI
                    </h3>
                    <button onClick={() => setShowVideoGen(false)} className="p-1 hover:bg-white/50 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-6">
                    {generatedVideo ? (
                        <div className="flex flex-col items-center justify-center space-y-6">
                             <div className="w-full h-64 md:h-80 bg-black rounded-xl overflow-hidden relative group shadow-2xl ring-1 ring-black/10 flex items-center justify-center">
                                {videoGenFile && videoGenFile.type.startsWith('image') ? (
                                    <img src={URL.createObjectURL(videoGenFile)} alt="Preview" className="w-full h-full object-cover opacity-60" />
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
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                    <CheckCircle2 className="w-3 h-3" /> Completado
                                </div>
                                <h3 className="text-2xl font-bold text-slate-800">¡Tu video está listo!</h3>
                                <p className="text-slate-600 max-w-md mx-auto">
                                    Hemos generado una animación basada en tu prompt: <span className="italic">&quot;{videoPrompt}&quot;</span>
                                </p>
                             </div>
                             
                             <div className="flex gap-3 w-full max-w-md">
                                 <button onClick={() => { setShowVideoGen(false); setGeneratedVideo(false); setVideoGenFile(null); setVideoPrompt(''); }} className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors">
                                     Descartar
                                 </button>
                                 <button onClick={() => {
                                     setShowVideoGen(false);
                                     setGeneratedVideo(false);
                                     setMessages(prev => [...prev, {
                                        role: 'assistant',
                                        content: `🎥 **Video Generado**\n\nAquí tienes el resultado de tu solicitud: "${videoPrompt}"\n\n*[Video adjunto: generation_v2_480p.mp4]*`
                                     }]);
                                     setVideoGenFile(null);
                                     setVideoPrompt('');
                                 }} className="flex-1 py-3 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/40 transition-all transform hover:-translate-y-0.5">
                                     Insertar en Chat
                                 </button>
                             </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-2">
                               <label className="text-sm font-medium text-slate-700">1. Sube tu imagen o video de referencia</label>
                                <div 
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${videoGenFile ? 'border-red-200 bg-red-50/30' : 'border-slate-200 hover:border-red-300 hover:bg-slate-50'}`}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        const file = e.dataTransfer.files[0];
                                        if(file) setVideoGenFile(file);
                                    }}
                                >
                                    {videoGenFile ? (
                                        <div className="text-center relative">
                                            {videoGenFile.type.startsWith('image') ? (
                                                <img src={URL.createObjectURL(videoGenFile)} alt="File preview" className="h-32 rounded-lg shadow-sm mb-2 object-cover" />
                                            ) : (
                                                <div className="h-32 w-32 bg-slate-100 rounded-lg flex items-center justify-center mb-2 mx-auto">
                                                    <Video className="w-10 h-10 text-slate-400" />
                                                </div>
                                            )}
                                            <p className="text-sm font-medium text-slate-700">{videoGenFile.name}</p>
                                            <button onClick={() => setVideoGenFile(null)} className="text-xs text-red-500 hover:underline mt-1">Cambiar archivo</button>
                                        </div>
                                    ) : (
                                        <div className="text-center cursor-pointer" onClick={() => document.getElementById('video-upload')?.click()}>
                                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 text-red-500">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm text-slate-600 font-medium">Haz clic o arrastra un archivo aquí</p>
                                            <p className="text-xs text-slate-400 mt-1">Soporta JPG, PNG, MP4</p>
                                        </div>
                                    )}
                                    <input type="file" id="video-upload" className="hidden" accept="image/*,video/*" onChange={(e) => e.target.files?.[0] && setVideoGenFile(e.target.files[0])} />
                                </div>
                            </div>

                            {/* Prompt Section */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-700">2. Describe cómo quieres recrearlo</label>
                                <textarea 
                                    value={videoPrompt}
                                    onChange={(e) => setVideoPrompt(e.target.value)}
                                    placeholder="Ej: Haz que el paisaje se mueva suavemente, añade lluvia y una atmósfera melancólica..."
                                    className="w-full p-3 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none resize-none h-24 text-sm"
                                />
                            </div>

                            {/* Settings */}
                            <div className="flex items-center gap-4 text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-slate-400" />
                                    <span>Duración: <strong>22 segundos</strong></span>
                                </div>
                                <div className="h-4 w-px bg-slate-200"></div>
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-slate-400" />
                                    <span>Modelo: <strong>NEXA Video Gen 2.0</strong></span>
                                </div>
                            </div>

                            {/* Generate Button */}
                            <button 
                                onClick={handleGenerateVideo}
                                disabled={!videoGenFile || !videoPrompt || isGeneratingVideo}
                                className={`w-full py-3 rounded-xl font-medium text-white shadow-lg shadow-red-500/20 transition-all flex items-center justify-center gap-2 ${
                                    !videoGenFile || !videoPrompt || isGeneratingVideo
                                    ? 'bg-slate-300 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 hover:scale-[1.02] active:scale-[0.98]'
                                }`}
                            >
                                {isGeneratingVideo ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Generando Video (Esto tomará unos segundos)...
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
      )}
       {showCreative && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Gift className="w-6 h-6 text-purple-600" />
                    Estudio Creativo NEXA
                  </h2>
                  <button onClick={() => setShowCreative(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <X className="w-6 h-6 text-slate-500" />
                  </button>
                </div>
 
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                   {/* Web Generator */}
                   <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-2xl border border-blue-100 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => {
                            setCodeMode(true);
                            setMode('fast');
                            setInput("Crea una página web moderna y responsiva para [TU TEMA AQUÍ] que incluya una sección de héroe, características y contacto. Usa Tailwind CSS.");
                            setShowCreative(false);
                        }}>
                       <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                           <Globe className="w-6 h-6 text-blue-600" />
                       </div>
                       <h3 className="text-lg font-semibold text-slate-800 mb-2">Diseñador Web</h3>
                       <p className="text-sm text-slate-600">Crea sitios web completos, landing pages y componentes UI al instante.</p>
                   </div>
 
                   {/* Logo Creator */}
                   <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border border-purple-100 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => {
                            setCodeMode(true);
                            setMode('fast');
                            setInput("Genera el código SVG para un logo moderno y minimalista de [NOMBRE/EMPRESA]. El logo debe representar [CONCEPTO]. Usa colores vibrantes.");
                            setShowCreative(false);
                        }}>
                       <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                           <Code className="w-6 h-6 text-purple-600" />
                       </div>
                       <h3 className="text-lg font-semibold text-slate-800 mb-2">Creador de Logos</h3>
                       <p className="text-sm text-slate-600">Diseña logotipos vectoriales (SVG) listos para usar en tus proyectos.</p>
                   </div>
 
                   {/* Book Writer */}
                   <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-100 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => {
                            setCodeMode(false);
                            setMode('deep');
                            setInput("Escribe el primer capítulo de un libro sobre [TEMA]. El tono debe ser [TONO]. Incluye diálogos y descripciones detalladas.");
                            setShowCreative(false);
                        }}>
                       <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                           <FolderPlus className="w-6 h-6 text-amber-600" />
                       </div>
                       <h3 className="text-lg font-semibold text-slate-800 mb-2">Escritor de Libros</h3>
                       <p className="text-sm text-slate-600">Ayuda para escribir novelas, cuentos o documentación técnica extensa.</p>
                   </div>
 
                   {/* Video Script */}
                   <div className="bg-gradient-to-br from-red-50 to-rose-50 p-6 rounded-2xl border border-red-100 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => {
                            setCodeMode(false);
                            setMode('fast');
                            setInput("Crea un guion detallado para un video de YouTube sobre [TEMA]. Incluye escenas, narración y sugerencias visuales.");
                            setShowCreative(false);
                        }}>
                       <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                           <Volume2 className="w-6 h-6 text-red-600" />
                       </div>
                       <h3 className="text-lg font-semibold text-slate-800 mb-2">Guionista de Video</h3>
                       <p className="text-sm text-slate-600">Genera guiones, ideas y estructuras para contenido audiovisual.</p>
                   </div>
                </div>
              </div>
           </div>
         )}
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
                 <span className="text-sm font-medium text-gray-700">Estado de Red</span>
                 <span className={`text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                   {isOnline ? 'En línea' : 'Sin conexión'}
                 </span>
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
                
                {/* Backup & Repair System */}
                <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                   <HardDrive className="w-4 h-4" /> Copia de Seguridad y Reparación
                 </label>
                 <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 space-y-3">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                            <Shield className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="font-medium text-slate-700">Backup Automático</p>
                            <p className="text-xs text-slate-500">Guarda proyecto y datos en /backups</p>
                         </div>
                      </div>
                      <button 
                        onClick={handleSystemBackup}
                        disabled={isBackingUp}
                        className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {isBackingUp ? 'Guardando...' : 'Backup Ahora'}
                      </button>
                   </div>
                   <div className="h-px bg-blue-200/50"></div>
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <RotateCcw className="w-5 h-5" />
                         </div>
                         <div>
                            <p className="font-medium text-slate-700">Restauración</p>
                            <p className="text-xs text-slate-500">Recuperar último estado seguro</p>
                         </div>
                      </div>
                      <button 
                        onClick={handleSystemRestore}
                        className="px-3 py-1.5 bg-white border border-gray-200 text-slate-600 text-xs font-medium rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        Restaurar
                      </button>
                   </div>
                 </div>
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
