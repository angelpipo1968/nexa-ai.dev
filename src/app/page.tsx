"use client";

import React, { useState, useEffect, useRef } from 'react';
import './chat.css';

// Type definitions
interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
}

export default function ChatPage() {
  // API is always proxied through Next.js server route — key never exposed to browser
  const PROXY_URL = '/api/nexa';
  const [apiHealthy, setApiHealthy] = useState<boolean>(false);
  
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  const [inputVal, setInputVal] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hfOn, setHfOn] = useState(false);
  const [recOn, setRecOn] = useState(false);
  const [hfTranscript, setHfTranscript] = useState('');
  const [hfStatus, setHfStatus] = useState('Toca para hablar');
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  
  const [voiceMode, setVoiceMode] = useState<'female' | 'male'>('female');
  
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<any>(null);
  const activeVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  // Verify proxy health on mount
  useEffect(() => {
    // Ping the Next.js API health endpoint (no key required)
    fetch('/api/health')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(() => setApiHealthy(true))
      .catch(() => setApiHealthy(false));
  }, []);

  // Initialize Chats
  useEffect(() => {
    const saved = localStorage.getItem('nx_c');
    if (saved) {
      try {
        setChats(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);
  
  // Voices
  useEffect(() => {
    const loadVoices = () => {
      if (!window.speechSynthesis) return;
      const vs = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('es'));
      if (vs.length === 0) return;
      
      let v: SpeechSynthesisVoice | undefined;
      if (voiceMode === 'female') {
        v = vs.find(v => v.name.toLowerCase().includes('mujer') || v.name.toLowerCase().includes('female')) || vs[0];
      } else {
        v = vs.find(v => v.name.toLowerCase().includes('hombre') || v.name.toLowerCase().includes('male')) || vs[Math.min(1, vs.length-1)];
      }
      activeVoiceRef.current = v || null;
    };
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [voiceMode]);

  const saveChats = (msgsToSave: Message[]) => {
    if (!msgsToSave.length) return;
    const titleMsg = msgsToSave.find(m => m.role === 'user')?.content?.slice(0, 25) || 'Chat';
    setChats(prev => {
      let next = [...prev];
      if (currentChatId) {
        const idx = next.findIndex(c => c.id === currentChatId);
        if (idx >= 0) {
          next[idx] = { ...next[idx], messages: [...msgsToSave], title: titleMsg };
        }
      } else {
        const newId = Date.now().toString();
        setCurrentChatId(newId);
        next.unshift({ id: newId, title: titleMsg, messages: [...msgsToSave] });
      }
      localStorage.setItem('nx_c', JSON.stringify(next));
      return next;
    });
  };

  const deleteChat = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setChats(prev => {
      const next = prev.filter(c => c.id !== id);
      localStorage.setItem('nx_c', JSON.stringify(next));
      return next;
    });
    if (currentChatId === id) {
      clearChat();
    }
  };

  const loadChat = (id: string) => {
    const c = chats.find(x => x.id === id);
    if (!c) return;
    setCurrentChatId(id);
    setMessages([...c.messages]);
    setShowSidebar(false);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentChatId(null);
  };

  const autoResizeInput = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 80) + 'px';
    }
  };

  useEffect(() => {
    autoResizeInput();
  }, [inputVal]);

  const scrollToBottom = () => {
    if (chatAreaRef.current) {
      chatAreaRef.current.scrollTop = chatAreaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const unlockAudio = () => {
    try {
      // @ts-ignore
      const a = new (window.AudioContext || window.webkitAudioContext)();
      if (a.state === 'suspended') a.resume();
    } catch (e) {}
    if ('speechSynthesis' in window && window.SpeechSynthesisUtterance) {
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }
  };

  const speak = (text: string, cbEnd?: () => void, cbStart?: () => void) => {
    try {
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      let safeText = text.replace(/[*_#`~>\[\](){}]/g, ' ').replace(/https?:\/\/[^\s]+/g, '').trim();
      if (safeText.length > 800) safeText = safeText.substring(0, 800);
      
      if (cbStart) cbStart();
      
      // TTS goes through the proxy base; falls back to browser synthesis on error
      const url = "/api/nexa/audio/speech?text=" + encodeURIComponent(safeText);
      const audio = new Audio(url);
      
      audio.onended = () => { if (cbEnd) cbEnd(); };
      audio.onerror = () => {
        console.error("Error reproduciendo voz ultra realista");
        if (window.speechSynthesis) {
          const u = new SpeechSynthesisUtterance(safeText);
          u.lang = 'es-ES';
          u.onend = cbEnd || null; 
          u.onerror = cbEnd || null;
          if (activeVoiceRef.current) u.voice = activeVoiceRef.current;
          window.speechSynthesis.speak(u);
        } else {
          if (cbEnd) cbEnd();
        }
      };
      audio.play().catch(e => {
        console.error(e);
        if (cbEnd) cbEnd();
      });
    } catch (e) {
      if (cbEnd) cbEnd();
    }
  };

  const apiCall = async (text: string, currentMsgs: Message[]) => {
    if (hfOn) setHfStatus('Procesando...');
    setIsTyping(true);
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);
      
      const msgsToSend = currentMsgs.filter(m => m.role !== 'system').map((m, i, arr) => {
        if (i === arr.length - 1) return m;
        const { images, ...rest } = m;
        return rest;
      });

      const r = await fetch(PROXY_URL, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'nexa',
          messages: msgsToSend,
          stream: false
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!r.ok) {
        if (r.status === 429) {
          const retryAfter = r.headers.get('Retry-After') || 'unos';
          throw new Error(`Límite de solicitudes. Espera ${retryAfter} segs.`);
        }
        throw new Error(`Error ${r.status}`);
      }
      
      const d = await r.json();
      const reply = d.choices[0].message.content;
      
      const newMsgs = [...currentMsgs, { role: 'assistant', content: reply } as Message];
      setMessages(newMsgs);
      saveChats(newMsgs);
      
      if (hfOn) {
        setHfStatus('Respondiendo...');
        speak(reply, () => {
          if (hfOn) {
            setHfStatus('Escuchando...');
            setTimeout(() => { if (!recOn) startMic() }, 300);
          } else {
            setHfStatus('Toca para hablar');
          }
        });
      }
    } catch (e: any) {
      const errorMsg = e.message?.includes('Límite') ? e.message : 'Error de conexión. Intenta de nuevo.';
      setMessages([...currentMsgs, { role: 'assistant', content: errorMsg }]);
    } finally {
      setIsTyping(false);
      setIsBusy(false);
    }
  };

  const send = () => {
    const t = inputVal.trim();
    if (!t || isBusy) return;
    setInputVal('');
    if (recOn) stopMic();
    
    const newMsgs = [...messages, { role: 'user', content: t } as Message];
    setMessages(newMsgs);
    setIsBusy(true);
    apiCall(t, newMsgs);
  };

  const startMic = () => {
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (recRef.current) stopMic();
    
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = true;
    
    rec.onstart = () => {
      setRecOn(true);
      if (hfOn) setHfStatus('Escuchando...');
    };
    
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        t += e.results[i][0].transcript;
      }
      if (hfOn) {
        setHfTranscript(t);
      } else {
        setInputVal(t);
      }
      
      if (e.results[e.results.length - 1].isFinal) {
        if (t.trim()) {
          if (hfOn) {
            const newMsgs = [...messages, { role: 'user', content: t.trim() } as Message];
            setMessages(newMsgs);
            setIsBusy(true);
            setHfTranscript('');
            apiCall(t.trim(), newMsgs);
          } else {
            setInputVal(t.trim());
          }
        }
      }
    };
    
    rec.onend = () => {
      setRecOn(false);
      if (hfOn && !isBusy) {
        setTimeout(() => {
          if (!recOn && !isBusy) startMic();
        }, 100);
      } else if (!hfOn) {
        setHfStatus('Toca para hablar');
      }
    };
    
    rec.onerror = () => { setRecOn(false); };
    
    try { rec.start(); recRef.current = rec; } catch (e) {}
  };

  const stopMic = () => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch (e) {}
    }
    setRecOn(false);
  };

  const toggleMic = () => {
    if (recOn) stopMic();
    else { unlockAudio(); startMic(); }
  };

  const toggleHF = () => {
    const nextState = !hfOn;
    setHfOn(nextState);
    if (nextState) {
      unlockAudio();
      startMic();
    } else {
      stopMic();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAttach(false);
    const f = e.target.files?.[0];
    if (!f) return;
    
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target?.result as string;
      
      let b64 = base64Data;
      if (base64Data.includes(',')) {
        b64 = base64Data.split(',')[1];
      }
      
      let imgSrc = base64Data;
      if (!imgSrc.startsWith('data:')) {
        imgSrc = 'data:image/jpeg;base64,' + base64Data;
      }
      
      const newMsgs = [...messages, { 
        role: 'user', 
        content: 'Describe detalladamente qué hay en esta imagen.',
        images: [b64]
      } as Message];
      
      setMessages(newMsgs);
      setIsBusy(true);
      apiCall('Describe detalladamente qué hay en esta imagen.', newMsgs);
    };
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  // Format message content
  const renderMessageContent = (content: string, images?: string[]) => {
    let html = content
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
      
    html = html.replace(/\[([^\]]*)\]\(\/static\/([^)]+)\)/g, '[$1](/api/nexa/static/$2)');
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; margin-top:5px;">');
    html = html.replace(/\[([^\]]*)\]\(([^)]+\.mp4)\)/g, '<video src="$2" controls style="max-width:100%; border-radius:8px; margin-top:5px;"></video>');
    html = html.replace(/\[([^\]]*)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--accent);">$1</a>');
    
    return (
      <>
        {images && images.map((img, i) => (
          <div key={i}>
             <img src={`data:image/jpeg;base64,${img}`} style={{maxWidth:'100%',borderRadius:'8px',marginBottom:'5px'}} />
             <br/><i>Analizando imagen...</i>
          </div>
        ))}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </>
    );
  };

  return (
    <div style={{height:'100vh', display:'flex', flexDirection:'column', background:'var(--bg)', color:'var(--text)', overflow:'hidden'}}>
      {/* HEADER */}
      <div className="hdr">
        <button className="hdr-btn" onClick={() => setShowSidebar(!showSidebar)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <h1>NEXA AI</h1><div className="dot"></div>
        <button className="hdr-btn" onClick={clearChat}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
        </button>
      </div>

      {/* CHAT AREA */}
      <div className="chat" id="chatArea" ref={chatAreaRef}>
        {messages.length === 0 && (
          <div className="welcome" id="wc">
            <div className="w-icon">&#10024;</div>
            <h2>Hola, Angel</h2>
            <p>Escribe o activa manos libres.</p>
          </div>
        )}
        
        {messages.map((m, i) => (
          <div key={i} className={`m ${m.role === 'user' ? 'u' : 'a'}`}>
            <div className="m-av">{m.role === 'user' ? 'U' : '✨'}</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div className="m-b">
                {renderMessageContent(m.content, m.images)}
              </div>
              {m.role !== 'user' && (
                <div className="m-acts">
                  <button className="ma" onClick={() => speak(m.content)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  </button>
                  <button className="ma" onClick={() => { if(window.speechSynthesis) window.speechSynthesis.cancel() }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="6" width="12" height="12"/></svg>
                  </button>
                  <button className="ma" onClick={() => navigator.clipboard.writeText(m.content)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="m a">
            <div className="m-av">✨</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div className="m-b">
                <div className="dots"><span></span><span></span><span></span></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT BAR */}
      <div className="ibar">
        <div className="ibox">
          <button className="ibtn" style={{background:'transparent', color:'var(--text2)', width:32, height:32, marginRight:2}} onClick={() => setShowAttach(!showAttach)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <textarea 
            ref={inputRef}
            id="inp" 
            rows={1} 
            placeholder="Escribe..." 
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className={`ibtn b-mic ${recOn ? 'rec' : ''}`} id="micB" onClick={toggleMic}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
          </button>
          <button className={`ibtn b-hf ${hfOn ? 'on' : ''}`} id="hfB" onClick={toggleHF}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l2-9 5 18 3-12 4 3h4"/></svg>
          </button>
          <button className="ibtn b-send" id="senB" onClick={send} disabled={!inputVal.trim() || isBusy}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      {/* ATTACH MENU */}
      <div className={`attach-menu ${showAttach ? 'on' : ''}`} id="attM">
        <button className="att-item" style={{background:'transparent',border:'none',width:'100%',textAlign:'left',fontFamily:'inherit'}} onClick={() => { setShowAttach(false); alert('Cámara web / nativa conectada proximamente'); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Cámara
        </button>
        <label className="att-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Galería
          <input type="file" accept="image/*" style={{display:'none'}} onChange={handleImageUpload} />
        </label>
      </div>

      {/* HANDS FREE OVERLAY */}
      <div className={`hf ${hfOn ? 'on' : ''}`} id="hfO" onClick={() => { if(!hfOn || isBusy) return; if(!recOn) { unlockAudio(); startMic(); } }}>
        <button className="hf-x" onClick={(e) => { e.stopPropagation(); toggleHF(); }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
        <div className={`hf-av ${isBusy ? 'speak' : ''} ${recOn ? 'listen' : ''}`} id="hfA">&#10024;</div>
        <div className="hf-st" id="hfSt">{hfStatus}</div>
        <div className={`hf-prev ${hfTranscript ? 'vis' : ''}`} id="hfPr">{hfTranscript}</div>
      </div>

      {/* SIDEBAR */}
      <div className={`sbar-ov ${showSidebar ? 'on' : ''}`} id="sbOv" onClick={() => setShowSidebar(false)}></div>
      <div className={`sbar ${showSidebar ? 'on' : ''}`} id="sb">
        <div className="sbar-hdr"><h2>Chats</h2></div>
        <button className="nc-btn" onClick={() => { clearChat(); setShowSidebar(false); }}>Nuevo chat</button>
        <div className="cl" id="cList">
          {chats.map(c => (
            <div key={c.id} className={`ci ${c.id === currentChatId ? 'act' : ''}`} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}} onClick={() => loadChat(c.id)}>
              <span style={{flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.title}</span>
              <button style={{background:'none',border:'none',color:'var(--red)',cursor:'pointer',padding:'0 5px',fontSize:14}} onClick={(e) => deleteChat(c.id, e)}>🗑️</button>
            </div>
          ))}
        </div>
        <div style={{padding: '15px 15px calc(env(safe-area-inset-bottom, 20px) + 30px) 15px', borderTop: '1px solid var(--border)', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10}}>
          <button style={{width: '100%', padding: 10, background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8}} onClick={() => { setShowSettings(true); setShowSidebar(false); }}>⚙️ Configuración</button>
          <button style={{width: '100%', padding: 10, background: 'linear-gradient(135deg, var(--accent2), var(--accent))', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 'bold', marginBottom: 5}} onClick={() => { setShowLogin(true); setShowSidebar(false); }}>Login</button>
        </div>
      </div>

      {/* SETTINGS MODAL */}
      <div className={`modal-ov ${showSettings ? 'on' : ''}`} id="setModal" onClick={() => setShowSettings(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3 style={{textAlign:'center',margin:'0 0 10px 0',fontSize:18}}>Configuración</h3>
          <div style={{display:'flex', flexDirection:'column', gap:12}}>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              <label style={{fontSize:12, color:'var(--text2)', fontWeight:'bold'}}>Voz del Asistente</label>
              <select value={voiceMode} onChange={e => setVoiceMode(e.target.value as any)} style={{width:'100%', padding:12, background:'var(--bg3)', color:'var(--text)', border:'1px solid var(--border)', borderRadius:10, fontSize:14, outline:'none', cursor:'pointer'}}>
                <option value="female">Voz de mujer</option>
                <option value="male">Voz de hombre</option>
              </select>
            </div>
            <div style={{display:'flex', flexDirection:'column', gap:6}}>
              <label style={{fontSize:12, color:'var(--text2)', fontWeight:'bold'}}>Estado del Servidor</label>
              <span style={{fontSize:13, paddingLeft:2, color: apiHealthy ? 'var(--green)' : 'var(--red)'}}>
                {apiHealthy ? '● Backend conectado' : '● Backend no disponible'}
              </span>
              <span style={{fontSize:11, color:'var(--text2)'}}>La conexión con el servidor se gestiona de forma segura.</span>
            </div>
          </div>
          <div style={{display:'flex', gap:8, marginTop:5}}>
            <button className="modal-btn" style={{flex:1, background:'var(--accent)', color:'#fff', border:'none'}} onClick={() => setShowSettings(false)}>Cerrar</button>
          </div>
        </div>
      </div>

      {/* LOGIN MODAL */}
      <div className={`modal-ov ${showLogin ? 'on' : ''}`} id="logModal" onClick={() => setShowLogin(false)}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <h3 style={{textAlign:'center',margin:'0 0 10px 0',fontSize:18}}>Acceder a Nexa PRO</h3>
          <button className="modal-btn g" style={{background:'#fff',color:'#000',border:'none'}} onClick={() => window.location.href='https://accounts.google.com/signin'}>
            <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Entrar con Google
          </button>
          <button className="modal-btn" onClick={() => window.location.href='https://accounts.google.com/signup'}>Registrarse con Google</button>
          <button className="modal-btn" style={{background:'transparent',border:'none',fontSize:12,color:'var(--text2)',marginTop:5,padding:0}} onClick={() => window.location.href='https://accounts.google.com/signin/recovery'}>¿Olvidaste tu contraseña?</button>
        </div>
      </div>
      
    </div>
  );
}
