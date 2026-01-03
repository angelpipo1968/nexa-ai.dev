'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Mic, MicOff, Volume2, VolumeX, Plus, MessageSquare, AlertCircle, Settings, Globe, HelpCircle, ArrowUp, Gift, Download, LogOut, User, FolderPlus, Code, X, Search, Sparkles, Zap, Image, Video, Book, Briefcase, Calendar, PenTool, Lightbulb, FileText, Layout, Paperclip, Music, ChevronDown, ChevronUp, PanelLeft, Eye, EyeOff, Check, Copy, Clock, Loader2, Play, CheckCircle2, HardDrive, Shield, RotateCcw, Menu, Palette, Compass, Newspaper, GraduationCap, MoreHorizontal, Headphones } from 'lucide-react';
import JSZip from 'jszip';
import { AuthModal } from '../components/AuthModal';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { SYSTEM_APPS, getAppById } from '../lib/apps';
import { MemorySystem } from '../lib/memory';
import VideoGen from '../components/apps/VideoGen';
import ImageStudio from '../components/apps/ImageStudio';
import MemoryBank from '../components/apps/MemoryBank';
import Security from '../components/apps/Security';
import WebDev from '../components/apps/WebDev';
import Learn from '../components/apps/Learn';
import Research from '../components/apps/Research';
import CodeEditor from '../components/apps/CodeEditor';

const APP_COMPONENTS: Record<string, React.ComponentType<any>> = {
  'VideoGen': VideoGen,
  'ImageStudio': ImageStudio,
  'MemoryBank': MemoryBank,
  'Security': Security,
  'WebDev': WebDev,
  'Learn': Learn,
  'Research': Research,
  'CodeEditor': CodeEditor,
};

const AttachmentPreview = ({ file }: { file: File }) => {
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (file.type.startsWith('image/') && preview) {
    return (
      <div className="w-8 h-8 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100 relative group-preview">
         {/* eslint-disable-next-line @next/next/no-img-element */}
         <img src={preview} alt="Attachment preview" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="p-1.5 bg-blue-50 rounded-lg text-blue-600 flex-shrink-0">
        <Paperclip className="w-4 h-4" />
    </div>
  );
};

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
    <div className="my-4 rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
        <span className="text-xs font-semibold text-gray-500 uppercase">{language || 'code'}</span>
        <div className="flex items-center gap-2">
           {isPreviewable && (
             <button 
               onClick={() => setShowPreview(!showPreview)} 
               className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-blue-600 hover:bg-white rounded-md transition-all"
             >
               {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
               {showPreview ? 'Ocultar' : 'Preview'}
             </button>
           )}
           <button 
             onClick={handleCopy} 
             className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-500 hover:text-green-600 hover:bg-white rounded-md transition-all"
           >
             {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
             {copied ? 'Copiado' : 'Copiar'}
          </button>
       </div>
    </div>
    
    {showPreview ? (
        <div className="p-0 bg-white border-b border-gray-200 relative group">
           <iframe 
             srcDoc={code} 
             className="w-full h-[400px] border-0 bg-white" 
             sandbox="allow-scripts"
             title="Preview"
           />
        </div>
      ) : (
        <div className="relative group">
            <pre className="p-4 overflow-x-auto text-sm font-mono text-gray-800 bg-gray-50 whitespace-pre">
            {code}
            </pre>
        </div>
      )}
    </div>
  )
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
        onClick={handleCopy}
        className="absolute bottom-2 right-2 p-1.5 text-gray-400 hover:text-blue-600 bg-white/80 hover:bg-white rounded-full transition-all shadow-sm backdrop-blur-sm z-10"
        title="Copiar mensaje"
    >
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState('Invitado');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  useEffect(() => {
    // Open sidebar by default only on desktop
    if (window.innerWidth >= 768) {
      setSidebarOpen(true);
    }
  }, []);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUserName(currentUser.displayName || currentUser.email?.split('@')[0] || 'Usuario');
        
        // Save user to Firestore if not exists
        try {
          if (db) {
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [fileTexts, setFileTexts] = useState<Array<{ name: string; text: string }>>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [conversations, setConversations] = useState<Array<{id: string, title: string, date: string, messages: any[]}>>([]);
  const [showConversations, setShowConversations] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showAllApps, setShowAllApps] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [inputHighlight, setInputHighlight] = useState(false);
  
  // App System State
  const [activeApp, setActiveApp] = useState<string | null>(null);
  const [activeAppParams, setActiveAppParams] = useState<any>(null);
  const [appFile, setAppFile] = useState<File | null>(null);
  const [wallpaper, setWallpaper] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const wallpaperInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
     // Check if we need to auto-open an app on mount (could be passed via URL or context in real app)
     // For this session, we manually trigger the user's request:
     // "Generar imagen de león en el bosque"
     const hasAutoAction = sessionStorage.getItem('nexa_auto_action');
     if (!hasAutoAction) {
          setActiveApp('image_studio');
          setActiveAppParams({ initialPrompt: 'Generar una imagen hiperrealista de un león caminando majestuosamente en un bosque denso y místico, iluminación cinematográfica, 8k.' });
          setMessages(prev => [...prev, {
              role: 'assistant',
              content: 'He abierto **Image Studio** con tu solicitud para generar el león en el bosque. ¡Mira lo que podemos crear!'
          }]);
          sessionStorage.setItem('nexa_auto_action', 'true');
     }
  }, []);

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
        const pdfjsLibModule = await import('pdfjs-dist/build/pdf');
        const pdfjsLib = pdfjsLibModule.default || pdfjsLibModule;
        // Ensure version is set, default to installed version
        const version = pdfjsLib.version || '3.11.174';
        const workerSrc = `https://unpkg.com/pdfjs-dist@${version}/build/pdf.worker.min.js`;
        
        if (pdfjsLib.GlobalWorkerOptions) {
            pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
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

  const processFile = async (file: File): Promise<{name: string, text: string} | null> => {
    try {
      if (file.type === 'application/pdf') {
        try {
            // Importar pdfjs-dist dinámicamente
            const pdfjsLibModule = await import('pdfjs-dist/build/pdf');
            const pdfjsLib = pdfjsLibModule.default || pdfjsLibModule;

            // Configurar worker de manera segura
            if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '3.11.174'}/build/pdf.worker.min.js`;
            }
            
            const data = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data }).promise;
            
            const parts: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const content = await page.getTextContent();
              parts.push(content.items.map((it: any) => it.str).join(' '));
            }
            return { name: file.name, text: parts.join('\n\n') };
        } catch (pdfError) {
            console.error("PDF Init Error:", pdfError);
            // Fallback para errores de inicialización
            return { name: file.name, text: "[Error al leer PDF: Intente subir el archivo nuevamente o verifique que no esté dañado]" };
        }
      } else if (
        file.type.startsWith('text/') || 
        file.name.endsWith('.md') || 
        file.name.endsWith('.json') || 
        file.name.endsWith('.ts') || 
        file.name.endsWith('.tsx') || 
        file.name.endsWith('.js') || 
        file.name.endsWith('.csv') ||
        file.name.endsWith('.txt')
      ) {
         const text = await file.text();
         return { name: file.name, text };
      }
      return null;
    } catch (e) {
      console.error("Error processing file:", e);
      return null;
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

  // Refs for stable access in event handlers
  const autoVoiceModeRef = useRef(autoVoiceMode);
  const isListeningRef = useRef(isListening);

  useEffect(() => {
    autoVoiceModeRef.current = autoVoiceMode;
  }, [autoVoiceMode]);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  const checkMicrophonePermission = useCallback(async () => {
    try {
      // @ts-ignore
      const result = await navigator.permissions.query({ name: 'microphone' });
      return result.state;
    } catch (err) {
      return 'prompt';
    }
  }, []);

  const toggleVoiceRecognition = useCallback(async () => {
    if (!recognitionRef.current) {
      setError('Reconocimiento de voz no disponible en este navegador.');
      return;
    }

    if (isListeningRef.current) {
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
  }, [checkMicrophonePermission]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!recognitionRef.current) {
         recognitionRef.current = new SpeechRecognition();
      }
      
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      const langMap: Record<'es'|'en'|'zh', string> = { es: 'es-ES', en: 'en-US', zh: 'zh-CN' };
      recognition.lang = langMap[language];

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        if (autoVoiceModeRef.current && event.results[0].isFinal) {
            // Give a small delay to ensure state is updated
            setTimeout(() => {
                document.getElementById('send-button')?.click();
            }, 500);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
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
            setError('⚠️ Error de red en el reconocimiento de voz. Verifica tu conexión a internet o intenta escribir.');
            // Si es modo auto, intentar reconectar una vez tras 2 segundos
            if (autoVoiceModeRef.current) {
                 setTimeout(() => {
                     if (autoVoiceModeRef.current && !isListeningRef.current) toggleVoiceRecognition();
                 }, 2000);
            }
            break;
          default:
            setError('Error de reconocimiento de voz.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [language, toggleVoiceRecognition]);

  const speakText = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    
    const speak = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        
        let voices = window.speechSynthesis.getVoices();
        // Si no hay voces, intentar cargarlas de nuevo o esperar evento (simplificado aquí)
        if (voices.length === 0) {
            console.warn("No voices found initially. Attempting to reload voices.");
            // Pequeño hack para forzar carga en algunos navegadores
            window.speechSynthesis.getVoices(); 
        }
        
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
          if (autoVoiceModeRef.current) {
              setTimeout(() => toggleVoiceRecognition(), 500);
          }
        };
        
        utterance.onerror = (event: any) => {
          // Ignorar errores de cancelación o interrupción intencional
          if (event.error === 'interrupted' || event.error === 'canceled') {
              setIsSpeaking(false);
              return;
          }
          console.error('Error en síntesis de voz:', event.error);
          setIsSpeaking(false);
        };

        window.speechSynthesis.speak(utterance);
    };

    // Asegurar que las voces estén cargadas antes de hablar
    if (window.speechSynthesis.getVoices().length === 0) {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null; // Limpiar listener
            speak();
        };
        // Timeout de seguridad por si el evento nunca se dispara
        setTimeout(() => {
             if (window.speechSynthesis.getVoices().length > 0) speak();
        }, 500);
    } else {
        setTimeout(speak, 100);
    }
  }, [voiceEnabled, language, toggleVoiceRecognition]);

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
    
    // INTERCEPTION: Detect image editing/generation intent
    const isImageRequest = (lowerInput.includes('imagen') || lowerInput.includes('foto') || lowerInput.includes('image') || lowerInput.includes('photo')) && 
                          (lowerInput.includes('editar') || lowerInput.includes('edit') || lowerInput.includes('generar') || lowerInput.includes('crear') || lowerInput.includes('make') || lowerInput.includes('create') || lowerInput.includes('retocar'));

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
        setActiveApp('video_gen');
        setActiveAppParams({ initialPrompt: input.trim() });
        if (voiceEnabled) speakText("¡Claro que sí! Puedo ayudarte a generar ese video. He abierto la herramienta Video Gen para ti.");
      }, 1000);
      return;
    }

    if (isImageRequest) {
        const userMessage = { role: 'user', content: input.trim() };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
        
        // Check if there are attachments to edit
        if (attachments.length > 0) {
            setAppFile(attachments[0]);
            setAttachments([]); // Move attachment to studio
        }
        
        // Simulate processing time
        setTimeout(() => {
          setIsLoading(false);
          setMessages(prev => [...prev, {
              role: 'assistant',
              content: "¡Entendido! He abierto **Image Studio** para procesar tu solicitud. Puedes editar o generar imágenes avanzadas desde aquí."
          }]);
          setActiveApp('image_studio');
          setActiveAppParams({ initialPrompt: input.trim() });
          if (voiceEnabled) speakText("¡Entendido! He abierto Image Studio para procesar tu solicitud.");
        }, 1000);
        return;
      }

    const attachmentNote = attachments.length ? `\nAdjuntos: ${attachments.map(f => f.name).join(', ')}` : '';
    const fileNote = fileTexts.length ? `\n\n${fileTexts.map(p => `[FILE ${p.name}]\n${p.text}`).join('\n\n')}` : '';
    const userMessage = { role: 'user', content: input.trim() + attachmentNote + fileNote };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachments([]);
    setFileTexts([]);
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
      const imageAttachments: Array<{ media_type: string; data: string }> = await Promise.all(imageFiles.map(readAsBase64)).catch(() => []);

      // Get Memory Context
      const systemContext = MemorySystem.getSystemContext();

      // NEW: Check if previous assistant message has a generated image (blob url or https) and attach it for context
      // This allows the AI to "see" what it just generated/edited in the previous turn
      // We scan the last 3 assistant messages to catch the image even if there was a short conversation in between
      const recentAssistantMsgs = conversationHistory
          .filter(m => m.role === 'assistant')
          .slice(-3)
          .reverse();
      
      let contextImageFound = false;

      for (const msg of recentAssistantMsgs) {
          if (contextImageFound) break;

          const blobMatch = msg.content.match(/\*\[Imagen adjunta: ((?:blob|https?):.*?)\]\*/);
          if (blobMatch) {
              const imageUrl = blobMatch[1];
              try {
                  const response = await fetch(imageUrl);
                  const blob = await response.blob();
                  const file = new File([blob], "generated_image.png", { type: blob.type });
                  const base64Data = await readAsBase64(file);
                  // Avoid duplicates if user manually re-uploaded (check by data length as approximation)
                  if (!imageAttachments.some(img => img.data === base64Data.data)) {
                       imageAttachments.push(base64Data);
                       contextImageFound = true;
                  }
              } catch (e) {
                  console.error("Failed to load previous context image:", e);
              }
          }
      }

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
          codeMode,
          systemContext, // Send memory context
          provider: 'anthropic' // Send selected provider
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

      let content = data.content[0].text;

      // PROCESS MEMORY TAGS
       const memoryMatch = content.match(/\[MEMORY: (.*?)\]/g);
       if (memoryMatch) {
           memoryMatch.forEach((tag: string) => {
               const memoryContent = tag.replace('[MEMORY: ', '').replace(']', '');
               MemorySystem.addMemory(memoryContent);
               console.log("Memory stored:", memoryContent);
           });
           // Remove memory tags from display
           content = content.replace(/\[MEMORY: .*?\]/g, '').trim();
       }

       // PROCESS OPEN_APP TAGS
       // Format: [OPEN_APP: id, {json_params}] or [OPEN_APP: id]
       const openAppRegex = /\[OPEN_APP:\s*([a-zA-Z0-9_]+)(?:,\s*(\{.*?\}))?\]/g;
       let match;
       while ((match = openAppRegex.exec(content)) !== null) {
           const appId = match[1].trim();
           const paramsStr = match[2];
           
           const app = getAppById(appId);
           if (app) {
               setActiveApp(appId);
               let params = {};
               if (paramsStr) {
                   try {
                       params = JSON.parse(paramsStr);
                   } catch (e) {
                       console.error("Error parsing app params:", e);
                   }
               }
               // Fallback: If no prompt in params, use message content if short
               if (!params.hasOwnProperty('initialPrompt') && content.length < 200) {
                   // @ts-ignore
                   params.initialPrompt = content.replace(openAppRegex, '').trim();
               }
               
               setActiveAppParams(params);
               console.log(`Auto-opening app: ${appId}`, params);
           }
       }
       // Remove tags for clean display
       content = content.replace(/\[OPEN_APP:.*?\]/g, '').trim();

      const assistantMessage = {
        role: 'assistant',
        content: content
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Trigger tools based on AI response (fallback for when client interception is skipped)
      const lowerResponse = content.toLowerCase();
      if (lowerResponse.includes('abriendo image studio') || lowerResponse.includes('opening image studio')) {
          setActiveApp('image_studio');
      }
      if ((lowerResponse.includes('video gen') || lowerResponse.includes('generador de video')) && (lowerResponse.includes('abriendo') || lowerResponse.includes('opening'))) {
          setActiveApp('video_gen');
          
          // Auto-load context if available
          // 1. Check current attachments (captured in closure)
          if (attachments && attachments.length > 0 && attachments[0].type.startsWith('image/')) {
              setAppFile(attachments[0]);
          } else {
              // 2. Check history for generated images
               const lastImageMsg = [...messages].reverse().find(m => m.role === 'assistant' && m.content.includes('*[Imagen adjunta:'));
               if (lastImageMsg) {
                   const match = lastImageMsg.content.match(/\*\[Imagen adjunta: ((?:blob|https?):.*?)\]\*/);
                   if (match) {
                       fetch(match[1])
                           .then(res => res.blob())
                           .then(blob => {
                               const file = new File([blob], "context_image.png", { type: blob.type });
                               setAppFile(file);
                           })
                           .catch(e => console.error("Error loading context for video:", e));
                   }
               }
          }
      }

      if (voiceEnabled) {
        speakText(data.content[0].text);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return;
      }
      
      console.error('Error:', error);
      
      let errorMessage = error.message || 'Error al procesar tu mensaje';
      let assistantResponse = 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.';

      if (errorMessage.includes('401') || errorMessage.includes('API key')) {
        errorMessage = '⚠️ Error de configuración: Falta la API Key de Anthropic. Por favor, agrégala en el archivo .env.local';
        assistantResponse = '⚠️ **Error de Sistema**: No se ha detectado una API Key válida para Anthropic. Por favor, configura la variable `ANTHROPIC_API_KEY` en el archivo `.env.local` de tu proyecto.';
      }

      setError(errorMessage);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: assistantResponse
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

  const handleQuickAction = (actionId: string) => {
    // Check if it's an app that needs to be opened
    const app = getAppById(actionId);
    
    if (app && (app.component || actionId === 'memory_bank')) {
        setActiveApp(actionId);
        if (voiceEnabled) speakText(`Abriendo ${app.name}.`);
        return;
    }
    
    // Fallback for non-app actions (legacy prompts)
    const prompts: Record<string, string> = {
        'web_dev': "Crea una página web que...",
        'learn': "Explícame el concepto de...",
        'research': "Investiga sobre...",
        'code': "Escribe un código en Python para...",
        'plan': "Crea un plan para...",
        'news': "Búscame las últimas noticias sobre...",
        'analyze': "Analiza esta imagen y dime...",
        'summary': "Resume el siguiente texto:",
        'write': "Ayúdame a redactar un...",
        'idea': "Dame ideas para...",
        'travel': "Planifica un viaje a..."
    };

    if (prompts[actionId]) {
        setInput(prompts[actionId]);
        setInputHighlight(true);
        setTimeout(() => setInputHighlight(false), 500);
        if (textareaRef.current) textareaRef.current.focus();
    }
  };

  return (
    <div className="flex h-[100dvh] bg-white overflow-hidden font-sans text-gray-900">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');
        :root { --font-sans: 'Inter', system-ui, sans-serif; }
        body { font-family: var(--font-sans); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div 
        className={`${
          sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64 md:translate-x-0 md:w-[72px]'
        } transition-all duration-300 ease-in-out bg-white/90 backdrop-blur-xl border-r border-white/20 flex flex-col fixed inset-y-0 left-0 z-40 md:relative md:z-20 h-full shadow-2xl md:shadow-none`}
      >
        {/* Header Section */}
        <div className="flex flex-col pt-6 pb-4 px-4 gap-4">
            <div className="flex items-center justify-between">
                {sidebarOpen && (
                    <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent animate-pulse tracking-tight ml-2 drop-shadow-sm">
                      Nexa OS
                    </h1>
                )}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className={`p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors ${!sidebarOpen ? 'mx-auto' : ''}`}
                >
                  <PanelLeft className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* Main Actions */}
        <div className="flex flex-col px-3 gap-2">
            <button 
                onClick={startNewChat}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all text-gray-600 hover:bg-gray-100 hover:text-gray-900 ${!sidebarOpen ? 'justify-center' : ''}`}
                title="New Chat"
            >
                <Plus className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">New Chat</span>}
            </button>

            <button 
                onClick={() => {
                    setShowConversations(!showConversations);
                    if (!sidebarOpen) setSidebarOpen(true);
                }}
                className={`flex items-center gap-2 p-2 rounded-lg transition-all ${showConversations ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'} ${!sidebarOpen ? 'justify-center' : ''}`}
                title="All Chats"
            >
                <Search className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span className="text-sm font-medium">All Chats</span>}
            </button>
        </div>

        {/* System Status Badge */}
        {sidebarOpen && (
            <div className="px-3 mt-4 mb-2">
                <div className="flex items-center gap-2 text-[10px] text-green-600 bg-green-50/50 px-2 py-1 rounded-md border border-green-100 select-none cursor-help" title="Sistema monitorizado y seguro">
                    <Shield className="w-3 h-3 fill-green-100" />
                    <span className="font-semibold tracking-wide uppercase">Nexa Secure Core</span>
                </div>
            </div>
        )}

        {/* Conversations List (Only when open) */}
        {sidebarOpen && (
          <div className="flex-1 overflow-y-auto px-3 py-4 mt-2">
            {showConversations ? (
                <div className="space-y-2 animate-in fade-in slide-in-from-left-4 duration-300">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-3">Historial</h3>
                    {conversations.length === 0 && <p className="text-xs text-gray-400 text-center py-4">No hay conversaciones</p>}
                    {conversations.map(chat => (
                        <div key={chat.id} onClick={() => loadConversation(chat.id)} className="w-full p-2.5 rounded-lg hover:bg-gray-50 hover:shadow-sm border border-transparent hover:border-gray-200 transition-all cursor-pointer group relative">
                            <p className="text-sm text-gray-700 font-medium truncate pr-6">{chat.title}</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">{chat.date}</p>
                            <button 
                                onClick={(e) => deleteConversation(chat.id, e)}
                                className="absolute right-2 top-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="p-4 mt-auto border-t border-gray-200">
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
                            className="flex-1 py-2 px-3 bg-transparent border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-lg transition-all shadow-sm"
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
                            <p className="text-sm font-medium text-gray-900 truncate">{userName}</p>
                            <button onClick={() => auth && signOut(auth)} className="text-[10px] text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1">
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
            <div className="h-px bg-gray-200 my-2"></div>

            <button 
              onClick={() => setShowSettings(true)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-all text-left group"
            >
              <Settings className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700">Configuración</span>
            </button>

            <button 
              onClick={() => {
                  const nextLang = language === 'es' ? 'en' : 'es';
                  setLanguage(nextLang);
              }}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-all text-left group"
            >
              <Globe className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700">Idioma: {language === 'es' ? 'Español' : 'English'}</span>
            </button>

            <button 
              onClick={() => alert('Ayuda: Visita nuestra documentación en línea o contacta soporte.')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-all text-left group"
            >
              <HelpCircle className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700">Ayuda</span>
            </button>

            <button 
              onClick={() => alert('Mejorar plan: Las opciones premium estarán disponibles pronto.')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-all text-left group"
            >
              <ArrowUp className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700">Mejorar plan</span>
            </button>

            <button 
              onClick={() => alert('Regalar: ¡Gracias por tu interés! Pronto podrás regalar suscripciones.')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-all text-left group"
            >
              <Gift className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700">Regalar NEXA OS</span>
            </button>

            <button 
              onClick={() => alert('Descargar: La aplicación de escritorio/móvil está en desarrollo.')}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-100 transition-all text-left group"
            >
              <Download className="w-4 h-4 text-gray-500 group-hover:text-blue-600" />
              <span className="text-sm text-gray-700">Descargar app</span>
            </button>

            <div className="h-px bg-gray-200 my-2"></div>

            <button onClick={handleLogout} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-red-50 transition-all text-left group">
              <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-500" />
              <span className="text-sm text-gray-700 group-hover:text-red-600">Cerrar sesión</span>
            </button>
        </div>
      )}
    </div>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Simple Mobile Header */}
        <header className="h-14 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500">
             <Menu className="w-5 h-5" />
          </button>
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent animate-pulse tracking-tight drop-shadow-sm">Nexa OS</span>
          <button 
            onClick={() => setShowSettings(true)} 
            className="text-gray-500 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
             <Settings className="w-5 h-5" />
          </button>
        </header>

        {error && (
          <div className="bg-red-900/20 border-b border-red-900/30 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <span className="text-sm text-red-300 leading-relaxed">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 pb-24">
          <div className="max-w-2xl mx-auto space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full mt-20">
                 <div className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-600 bg-clip-text text-transparent animate-pulse tracking-tight drop-shadow-sm">Nexa OS está listo.</div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div 
                  className={`max-w-[85%] px-5 py-4 rounded-3xl text-[15px] leading-relaxed shadow-sm relative group animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                    msg.role === 'user' 
                      ? 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25 rounded-br-sm' 
                      : 'bg-white/80 backdrop-blur-md text-gray-800 border border-gray-100 rounded-bl-sm shadow-sm'
                  }`}
                >
                  {msg.role === 'assistant' && <CopyButton text={msg.content} />}
                  {msg.role === 'assistant' ? (
                      msg.content.split(/(```[\s\S]*?```|\*\[Video adjunto: .*?\]\*|\*\[Imagen adjunta: .*?\]\*)/g).map((part, i) => {
                          if (part.startsWith('```')) {
                              const match = part.match(/```(\w+)?\n([\s\S]*?)```/);
                              if (match) {
                                  return <CodeBlock key={i} language={match[1] || ''} code={match[2]} />;
                              }
                          }
                          
                          const videoMatch = part.match(/\*\[Video adjunto: (.*?)\]\*/);
                          if (videoMatch) {
                              const videoSrc = videoMatch[1];
                              // Si es un archivo local simulado, usar una ruta relativa o absoluta si es necesario
                              // Aquí asumimos que está en la raíz pública o es una URL completa
                              return (
                                <div key={i} className="my-3 rounded-xl overflow-hidden bg-black/5 border border-gray-200 shadow-sm group">
                                    <div className="relative">
                                        <video 
                                            src={videoSrc} 
                                            controls 
                                            className="w-full max-h-[300px] object-contain bg-black" 
                                            poster="/placeholder-video.jpg" // Opcional
                                            onError={(e) => {
                                                // Fallback visual si el video no carga (común en demos)
                                                const target = e.target as HTMLVideoElement;
                                                target.style.display = 'none';
                                                target.parentElement?.querySelector('.video-error')?.classList.remove('hidden');
                                            }}
                                        />
                                        <div className="video-error hidden absolute inset-0 flex flex-col items-center justify-center bg-gray-100 text-gray-400">
                                            <Video className="w-12 h-12 mb-2 opacity-50" />
                                            <span className="text-xs">Video no disponible (Demo)</span>
                                        </div>
                                    </div>
                                    <div className="px-3 py-2 bg-white border-t border-gray-100 text-xs text-gray-500 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Video className="w-3.5 h-3.5" />
                                            <span className="truncate max-w-[200px]">{videoSrc}</span>
                                        </div>
                                        <a href={videoSrc} download className="p-1 hover:bg-gray-100 rounded-md transition-colors" title="Descargar">
                                            <Download className="w-3.5 h-3.5" />
                                        </a>
                                    </div>
                                </div>
                              );
                          }

                          const imageMatch = part.match(/\*\[Imagen adjunta: (.*?)\]\*/);
                          if (imageMatch) {
                              const imgSrc = imageMatch[1];
                              return (
                                  <div key={i} className="my-3 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-sm group relative">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img 
                                          src={imgSrc} 
                                          alt="Imagen generada" 
                                          className="w-full max-h-[400px] object-contain bg-white"
                                      />
                                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                                          <a href={imgSrc} download="nexa_image.jpg" className="p-1.5 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-colors" title="Descargar imagen">
                                              <Download className="w-4 h-4" />
                                          </a>
                                      </div>
                                  </div>
                              );
                          }

                          if (!part) return null;
                          return <p key={i} className="whitespace-pre-wrap break-words">{part}</p>;
                      })
                  ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}




            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-nexa-surface/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-nexa-primary/20 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                </div>
              </div>
            )}

            {isListening && (
              <div className="flex justify-center my-4">
                <div className="bg-white/90 backdrop-blur-md border border-cyan-500/30 rounded-full px-6 py-3 flex items-center gap-4 shadow-lg shadow-cyan-500/10 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-1 h-4">
                        <div className="w-1 bg-cyan-500 rounded-full animate-[wave_1s_ease-in-out_infinite]" style={{height: '40%'}}></div>
                        <div className="w-1 bg-blue-500 rounded-full animate-[wave_1s_ease-in-out_infinite_0.1s]" style={{height: '100%'}}></div>
                        <div className="w-1 bg-cyan-500 rounded-full animate-[wave_1s_ease-in-out_infinite_0.2s]" style={{height: '60%'}}></div>
                        <div className="w-1 bg-blue-500 rounded-full animate-[wave_1s_ease-in-out_infinite_0.3s]" style={{height: '80%'}}></div>
                        <div className="w-1 bg-cyan-500 rounded-full animate-[wave_1s_ease-in-out_infinite_0.4s]" style={{height: '50%'}}></div>
                    </div>
                    <span className="text-sm text-gray-700 font-medium tracking-wide">Escuchando...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

      <div className="fixed bottom-0 w-full p-3 bg-white border-t border-gray-100 z-20">
        <div className="max-w-2xl mx-auto flex flex-col gap-3">
            {/* Input Container */}
            <div className={`w-full flex items-center gap-3 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl px-4 py-2 relative transition-all duration-300 shadow-lg shadow-blue-900/5 ${inputHighlight ? 'ring-2 ring-blue-400/50 bg-blue-50/50' : 'hover:bg-white/90 hover:shadow-xl hover:shadow-blue-900/10'}`}>
              <input
                ref={docInputRef}
                type="file"
                multiple
                accept=".txt,.md,.json,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ts,.tsx,.js,.py,.html,.css"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length) {
                    setAttachments(prev => [...prev, ...files]);
                    files.forEach(async (f) => {
                       const result = await processFile(f);
                       if (result) {
                          setFileTexts(prev => [...prev, result]);
                       }
                    });
                  }
                  e.target.value = '';
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
                    e.target.value = '';
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
                    e.target.value = '';
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
                    e.target.value = '';
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
                      e.target.value = '';
                  }}
              />

              {showUploadMenu && (
                <div className="absolute bottom-[calc(100%+8px)] left-0 ml-2 w-60 bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden z-[60] animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-1.5 space-y-0.5">
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">Upload</div>
                        <button onClick={() => { setShowUploadMenu(false); docInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-colors">
                            <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600"><Paperclip className="w-4 h-4" /></div>
                            <span className="font-medium">Document</span>
                        </button>
                        <button onClick={() => { setShowUploadMenu(false); imageInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-purple-50 hover:text-purple-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-purple-100 rounded-lg text-purple-600"><Image className="w-4 h-4" /></div>
                            <span className="font-medium">Image</span>
                        </button>
                        <button onClick={() => { setShowUploadMenu(false); videoInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-red-100 rounded-lg text-red-600"><Video className="w-4 h-4" /></div>
                            <span className="font-medium">Video</span>
                        </button>
                        <button onClick={() => { setShowUploadMenu(false); audioInputRef.current?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-amber-50 hover:text-amber-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-amber-100 rounded-lg text-amber-600"><Music className="w-4 h-4" /></div>
                            <span className="font-medium">Audio</span>
                        </button>
                         <button onClick={() => { setShowUploadMenu(false); document.getElementById('folder-upload')?.click(); }} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-600 rounded-xl transition-colors">
                             <div className="p-1.5 bg-green-100 rounded-lg text-green-600"><FolderPlus className="w-4 h-4" /></div>
                            <span className="font-medium">Folder</span>
                        </button>
                    </div>
                </div>
              )}

              <button
                  onClick={() => setShowUploadMenu(!showUploadMenu)}
                  disabled={isLoading}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                  <Plus className={`w-5 h-5 transition-transform ${showUploadMenu ? 'rotate-45' : ''}`} />
              </button>

              <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Escribe a Nexa..."
                  className="flex-1 bg-transparent py-3 outline-none text-gray-900 resize-none overflow-hidden placeholder-gray-400"
                  rows={1}
                  disabled={isLoading}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
              />

              <div className="flex items-center gap-1">
                 {/* Fluid Conversation Mode */}
                 <button
                    onClick={() => {
                        const newState = !autoVoiceMode;
                        setAutoVoiceMode(newState);
                        if (newState) {
                            toggleVoiceRecognition();
                        } else {
                            stopSpeaking();
                            if (isListening) toggleVoiceRecognition();
                        }
                    }}
                    className={`p-2 transition-all rounded-full ${autoVoiceMode ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                    title="Modo Conversación Fluida"
                 >
                    {autoVoiceMode ? <Headphones className="w-5 h-5 animate-pulse" /> : <Headphones className="w-5 h-5" />}
                 </button>

                 {input.trim() ? (
                   <button
                       onClick={sendMessage}
                       disabled={isLoading}
                       className="p-2 text-[#2563eb] hover:text-blue-600 transition-colors"
                   >
                       <Send className="w-5 h-5" />
                   </button>
                 ) : (
                   <button
                       onClick={toggleVoiceRecognition}
                       className={`p-2 transition-colors ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600'}`}
                   >
                       {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                   </button>
                 )}
              </div>



                {attachments.length > 0 && (
                    <div className="absolute bottom-full left-0 w-full px-4 pb-2 flex flex-wrap gap-2 z-10">
                    {attachments.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-2 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-xl text-xs shadow-sm animate-in fade-in zoom-in duration-200">
                        <AttachmentPreview file={f} />
                        <span className="truncate max-w-[10rem] font-medium text-gray-700">{f.name}</span>
                        <button
                            onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-full transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            {/* Quick Actions Menu - Mobile (Horizontal Scroll) */}
            <div className="w-full overflow-x-auto no-scrollbar pb-1 md:hidden">
               <div className="flex items-center gap-2 w-max px-1">
                  {SYSTEM_APPS.map(app => (
                    <button
                      key={app.id}
                      onClick={() => handleQuickAction(app.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm hover:brightness-95 transition-all whitespace-nowrap ${app.color}`}
                    >
                      <app.icon className="w-3.5 h-3.5" />
                      <span className="text-xs font-medium text-gray-700">{app.name}</span>
                    </button>
                  ))}
               </div>
            </div>

            {/* Quick Actions Menu - Desktop (Minimalist Switch) */}
            <div className="hidden md:flex flex-col w-full">
                <div className="flex justify-center">
                    <button 
                        onClick={() => setMenuExpanded(!menuExpanded)}
                        className="flex items-center gap-2 text-xs text-gray-400 hover:text-blue-500 transition-colors py-1"
                    >
                        {menuExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        <span className="uppercase tracking-widest font-semibold">{menuExpanded ? 'Ocultar Herramientas' : 'Herramientas NEXA'}</span>
                    </button>
                </div>
                
                {menuExpanded && (
                    <div className="grid grid-cols-4 gap-2 pt-2 animate-in slide-in-from-top-2 duration-300">
                        {SYSTEM_APPS.map(app => (
                            <button
                            key={app.id}
                            onClick={() => handleQuickAction(app.id)}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border hover:shadow-md transition-all ${app.color} bg-opacity-50 hover:bg-opacity-100`}
                            >
                            <app.icon className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium text-gray-700 text-center">{app.name}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </div>
      
      {(() => {
        if (!activeApp) return null;
        const appDef = getAppById(activeApp);
        if (!appDef?.component) return null;
        
        const Component = APP_COMPONENTS[appDef.component];
        if (!Component) return null;

        return (
          <Component
            isOpen={true}
            onClose={() => { setActiveApp(null); setAppFile(null); setActiveAppParams(null); }}
            onInsert={(content: string, typeOrSrc: string = '') => {
              // Handle Prompts (System Instructions)
              if (typeOrSrc === 'system' || typeOrSrc === 'web_dev_prompt' || typeOrSrc === 'code_prompt') {
                  setActiveApp(null);
                  setAppFile(null);
                  setActiveAppParams(null);
                  
                  setInput(content);
                  setInputHighlight(true);
                  setTimeout(() => setInputHighlight(false), 500);
                  if (textareaRef.current) textareaRef.current.focus();
                  return;
              }

              // Handle App Results (Images, Videos, etc.)
              setActiveApp(null);
              setAppFile(null);
              setActiveAppParams(null);
              
              let prefix = '📱 **App Result**';
              let attachmentType = 'Adjunto';
              
              if (activeApp === 'video_gen') {
                 prefix = '🎥 **Video Generado**';
                 attachmentType = 'Video adjunto';
              } else if (activeApp === 'image_studio') {
                 prefix = '🖼️ **Imagen Procesada**';
                 attachmentType = 'Imagen adjunta';
              }
              
              setMessages(prev => [...prev, {
                role: 'assistant',
                content: `${prefix}\n\n${content}\n\n*[${attachmentType}: ${typeOrSrc}]*`
              }]);
            }}
            initialFile={appFile}
            {...activeAppParams}
          />
        );
      })()}

       {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 border border-gray-200 flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                Configuración
              </h3>
              <button 
                onClick={() => setShowSettings(false)} 
                className="text-gray-500 hover:text-gray-900 p-1 hover:bg-gray-200 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
             
             <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Tu Nombre</label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)}
                  onBlur={(e) => saveUserName(e.target.value)}
                  placeholder="¿Cómo te llamas?"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-gray-900 placeholder-gray-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Fondo de Pantalla</label>
                <div 
                    onClick={() => wallpaperInputRef.current?.click()}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                >
                    <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
                        {wallpaper ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={wallpaper} alt="Wallpaper" className="w-full h-full object-cover" />
                        ) : (
                            <Image className="w-5 h-5 text-gray-400" />
                        )}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{wallpaper ? 'Fondo personalizado' : 'Fondo por defecto'}</p>
                        <p className="text-xs text-gray-500">Click para cambiar</p>
                    </div>
                    {wallpaper && (
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                setWallpaper(null);
                            }}
                            className="p-1 hover:bg-gray-200 rounded-full text-gray-500"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
                <input 
                    ref={wallpaperInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            const url = URL.createObjectURL(file);
                            setWallpaper(url);
                        }
                    }}
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <span className="text-sm font-medium text-gray-900">Estado de Red</span>
                <span className={`text-xs px-2 py-1 rounded-full ${isOnline ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${voiceEnabled ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                    {voiceEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Respuesta por voz</p>
                    <p className="text-xs text-gray-500">NEXA leerá las respuestas en voz alta</p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    stopSpeaking();
                    setVoiceEnabled(!voiceEnabled);
                  }}
                  className={`w-12 h-6 rounded-full transition-colors relative ${voiceEnabled ? 'bg-blue-600' : 'bg-gray-300'}`}
                >
                  <div 
                    className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-0.5 transition-all duration-300 ${voiceEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}
                  ></div>
                </button>
              </div>

               <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-900">Idioma</label>
                 <select 
                   value={language}
                   onChange={(e) => setLanguage(e.target.value as 'es'|'en'|'zh')}
                   className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-gray-900"
                 >
                   <option value="es" className="bg-white">Español (España)</option>
                   <option value="en" className="bg-white">English (US)</option>
                   <option value="zh" className="bg-white">中文 (简体)</option>
                 </select>
                </div>
                


                {/* Backup & Repair System */}
               <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <HardDrive className="w-4 h-4" /> Copia de Seguridad y Reparación
                </label>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                           <Shield className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="font-medium text-gray-900">Backup Automático</p>
                           <p className="text-xs text-gray-500">Guarda proyecto y datos en /backups</p>
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
                  <div className="h-px bg-gray-200"></div>
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                           <RotateCcw className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="font-medium text-gray-900">Restauración</p>
                           <p className="text-xs text-gray-500">Recuperar último estado seguro</p>
                        </div>
                     </div>
                     <button 
                       onClick={handleSystemRestore}
                       className="px-3 py-1.5 bg-white border border-pink-200 text-pink-600 text-xs font-medium rounded-lg hover:bg-pink-50 transition-colors"
                     >
                       Restaurar
                     </button>
                  </div>
                </div>
              </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Exportar conversación</label>
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
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-all text-sm"
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
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-all text-sm"
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
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-all text-sm"
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
                      className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-blue-600 hover:bg-blue-50 transition-all text-sm"
                    >
                      Descargar .ZIP
                    </button>
                  </div>
                </div>
 
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-900">Plantillas rápidas de código</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Crea un componente React funcional con:\n- botón \"Incrementar\"\n- contador en estado\n- estilos básicos Tailwind\nIncluye TypeScript.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-pink-50 border border-pink-200 rounded-lg text-pink-600 hover:bg-pink-100 transition-all text-sm"
                    >
                      React: Contador
                    </button>
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Crea una ruta API de Next.js (app/api/example/route.ts) que acepte POST con JSON {name} y responda {greeting: \"Hola {name}\"} con validación y tipos TypeScript.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-pink-50 border border-pink-200 rounded-lg text-pink-600 hover:bg-pink-100 transition-all text-sm"
                    >
                      Next.js: API
                    </button>
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Escribe una función TypeScript utilitaria:\n- nombre: formatCurrency\n- parámetros: amount:number, currency?:string=\"EUR\", locale?:string=\"es-ES\"\n- retorna string con Intl.NumberFormat\n- añade pruebas básicas de uso.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-pink-50 border border-pink-200 rounded-lg text-pink-600 hover:bg-pink-100 transition-all text-sm"
                    >
                      TS: Utilidad
                    </button>
                    <button
                      onClick={() => {
                        setCodeMode(true);
                        setInput("Genera un README breve para un proyecto Next.js con:\n- requisitos\n- instalación\n- scripts\n- despliegue en Vercel\n- estructura de carpetas.");
                        setShowSettings(false);
                      }}
                      className="px-3 py-2 bg-nexa-secondary/10 border border-nexa-secondary/20 rounded-lg text-nexa-secondary hover:bg-nexa-secondary/20 transition-all text-sm"
                    >
                      README rápido
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end shrink-0">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
       )}
    </div>
    </div>
  );
}
