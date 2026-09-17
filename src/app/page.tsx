'use client';

import React, { useState, useEffect, useRef } from 'react';
import './chat.css';
import { AnimatedNexaFace } from '@/components/AnimatedNexaFace';

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

export default function NexaAndroidWebClone() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: '¡Hola! Soy NEXA AI, tu asistente virtual avanzado. ¿En qué te puedo ayudar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState<"WAITING" | "LISTENING" | "THINKING" | "SPEAKING">("WAITING");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [recOn, setRecOn] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [chats, setChats] = useState<ChatSession[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, errorMsg]);

  useEffect(() => {
    const saved = localStorage.getItem('nexa_sessions');
    if (saved) {
      try { setChats(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const apiCall = async (text: string, currentMsgs: Message[]) => {
    setIsBusy(true);
    setErrorMsg('');
    if (voiceMode) setVoiceState("THINKING");

    try {
      const msgsToSend = currentMsgs.map(m => {
        if (m.images && m.images.length > 0) return { role: m.role, content: m.content, images: m.images };
        return { role: m.role, content: m.content };
      });

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'nexa', messages: msgsToSend, stream: false })
      });

      if (!res.ok) {
        throw new Error(`Error del servidor: ${res.status}`);
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || data.message || "Respuesta recibida";
      
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (voiceMode) {
        setVoiceState("SPEAKING");
        // Simulated speech time, then back to listening
        setTimeout(() => setVoiceState("LISTENING"), 3000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error de conexión con NEXA Router');
      if (voiceMode) setVoiceState("WAITING");
    } finally {
      setIsBusy(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() && !isBusy) return;
    const newMsgs: Message[] = [...messages, { role: 'user', content: input }];
    setMessages(newMsgs);
    setInput('');
    apiCall(input, newMsgs);
  };

  const toggleVoiceMode = () => {
    setVoiceMode(!voiceMode);
    if (!voiceMode) {
      setVoiceState("LISTENING");
      setVoiceTranscript("Escuchando...");
    }
  };

  const startMic = () => {
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      alert("Reconocimiento de voz no soportado en este navegador.");
      return;
    }
    const rec = new SR();
    rec.lang = 'es-ES';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setRecOn(true);
    rec.onresult = (e: any) => {
      let t = '';
      for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      if (voiceMode) setVoiceTranscript(t);
      else setInput(t);
    };
    rec.onend = () => {
      setRecOn(false);
    };
    try { rec.start(); recRef.current = rec; } catch (e) {}
  };

  const stopMic = () => {
    if (recRef.current) {
      try { recRef.current.stop(); } catch (e) {}
    }
    setRecOn(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowAttach(false);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64Data = ev.target?.result as string;
      const b64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
      
      const prompt = input.trim() || 'Describe este archivo.';
      const newMsgs: Message[] = [...messages, { role: 'user', content: prompt, images: [b64] }];
      setMessages(newMsgs);
      setInput('');
      apiCall(prompt, newMsgs);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="nexa-root">
      {/* DRAWER */}
      <div className={`nexa-drawer ${drawerOpen ? 'open' : ''}`}>
        <div className="drawer-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div className="drawer-brand">
            <div className="brand-icon">N</div>
            <span className="brand-text">NEXA AI</span>
          </div>
          <button className="icon-btn" onClick={() => setDrawerOpen(false)} style={{width: 32, height: 32}} title="Cerrar menú">
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="drawer-content">
          <button className="btn-new-chat" onClick={() => { setMessages([]); setDrawerOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Nuevo Chat
          </button>
          <div className="search-bar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" placeholder="Buscar..." />
          </div>
          <div className="session-list">
            {chats.map(c => (
              <div key={c.id} className="session-item">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                <span className="session-title">{c.title}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="drawer-footer" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
          <div className="drawer-menu-items" style={{display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '16px'}}>
            <button className="session-item" style={{background:'transparent', border:'none', width:'100%', textAlign:'left', padding:'12px', cursor:'pointer'}} onClick={() => alert('OCRI functionality')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l2-9 5 18 3-10h4"></path></svg>
              <span className="session-title">OCRI</span>
            </button>
            <button className="session-item" style={{background:'transparent', border:'none', width:'100%', textAlign:'left', padding:'12px', cursor:'pointer'}} onClick={() => alert('Settings functionality')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span className="session-title">Configuración</span>
            </button>
          </div>
          <button className="user-profile" style={{background:'transparent', border:'none', width:'100%', cursor:'pointer'}} onClick={() => alert('Profile functionality')}>
            <div className="user-avatar">A</div>
            <div className="user-info" style={{textAlign:'left'}}>
              <span className="user-name">Angel</span>
              <span className="user-plan">Perfil</span>
            </div>
          </button>
        </div>
      </div>
      
      {drawerOpen && <div className="drawer-overlay" onClick={() => setDrawerOpen(false)}></div>}

      {/* MAIN CONTENT */}
      <div className="nexa-main">
        <div className="top-bar">
          <button className="icon-btn" onClick={() => setDrawerOpen(true)} title="Menú">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
          <div className="top-title">
            <span>NEXA AI</span>
            <div className="status-dot"></div>
          </div>
          <div style={{width: 40}}></div>
        </div>

        <div className="chat-area">
          <div className="chat-container">
            {messages.map((m, i) => (
              <div key={i} className={`message-row ${m.role}`}>
                {m.role === 'assistant' && <div className="message-avatar">N</div>}
                <div className="message-bubble">
                  {m.images && m.images.map((img, idx) => (
                    <img key={idx} src={`data:image/jpeg;base64,${img}`} style={{maxWidth:'100%', borderRadius:'8px', marginBottom:'8px'}} alt="uploaded" />
                  ))}
                  {m.content}
                </div>
              </div>
            ))}
            {isBusy && !errorMsg && (
              <div className="message-row assistant">
                <div className="message-avatar">N</div>
                <div className="message-bubble">
                  <div className="dots"><span></span><span></span><span></span></div>
                </div>
              </div>
            )}
            {errorMsg && (
              <div className="message-row assistant">
                <div className="message-avatar">!</div>
                <div className="message-bubble" style={{color: '#ff4444'}}>{errorMsg}</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* INPUT BAR */}
        <div className="input-bar-container" style={{position: 'relative'}}>
          {/* ATTACH MENU */}
          {showAttach && (
            <div className="attach-menu on" style={{position:'absolute', bottom:'80px', left:'16px', background:'var(--bg-surface)', border:'1px solid var(--border)', borderRadius:'12px', padding:'8px', zIndex:50}}>
              <label className="att-item" style={{display:'flex', gap:'8px', padding:'10px', cursor:'pointer', color:'var(--text-main)'}}>
                📄 Subir documento
                <input type="file" accept=".pdf,.doc,.docx,.txt" style={{display:'none'}} onChange={handleFileUpload} />
              </label>
              <label className="att-item" style={{display:'flex', gap:'8px', padding:'10px', cursor:'pointer', color:'var(--text-main)'}}>
                🖼️ Subir imagen
                <input type="file" accept="image/*" style={{display:'none'}} onChange={handleFileUpload} ref={fileInputRef} />
              </label>
              <label className="att-item" style={{display:'flex', gap:'8px', padding:'10px', cursor:'pointer', color:'var(--text-main)'}}>
                🎥 Subir video
                <input type="file" accept="video/*" style={{display:'none'}} onChange={handleFileUpload} />
              </label>
              <label className="att-item" style={{display:'flex', gap:'8px', padding:'10px', cursor:'pointer', color:'var(--text-main)'}}>
                🎵 Subir audio
                <input type="file" accept="audio/*" style={{display:'none'}} onChange={handleFileUpload} />
              </label>
              <label className="att-item" style={{display:'flex', gap:'8px', padding:'10px', cursor:'pointer', color:'var(--text-main)'}}>
                📷 Tomar foto
                <input type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={handleFileUpload} ref={cameraInputRef} />
              </label>
              <label className="att-item" style={{display:'flex', gap:'8px', padding:'10px', cursor:'pointer', color:'var(--text-main)'}}>
                🎥 Grabar video
                <input type="file" accept="video/*" capture="environment" style={{display:'none'}} onChange={handleFileUpload} ref={videoInputRef} />
              </label>
            </div>
          )}

          <div className="input-box">
            <button className="attach-btn" title="Adjuntar" onClick={() => setShowAttach(!showAttach)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
            </button>
            <textarea 
              value={input} 
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
              }}
              placeholder="Escribe un mensaje..."
              rows={1}
            />
            {input.trim() ? (
              <button className="send-btn" onClick={handleSend} disabled={isBusy}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            ) : null}
            <button className={`mic-btn ${recOn ? 'recording' : ''}`} onClick={recOn ? stopMic : startMic} title="Micrófono (Voz normal)" style={{color: recOn ? '#ff4444' : 'var(--text-main)'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
            </button>
            <button className="hf-toggle-btn" onClick={toggleVoiceMode} title="Modo Manos Libres" style={{background:'transparent', border:'none', cursor:'pointer', color:'var(--text-main)', padding:'8px'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 12h4l2-9 5 18 3-12 4 3h4"></path></svg>
            </button>
          </div>
        </div>
      </div>

      {voiceMode && (
        <div className="voice-overlay">
          <div className="voice-header">
            <button className="icon-btn" onClick={toggleVoiceMode}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
          <div className="voice-center">
            <AnimatedNexaFace state={voiceState} size={300} />
            <div className="voice-status">{voiceTranscript}</div>
          </div>
          <div className="voice-actions">
            <button className="voice-action-btn" onClick={() => cameraInputRef.current?.click()}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
            </button>
            <button className="voice-action-btn primary" onClick={() => setVoiceState(voiceState === "LISTENING" ? "THINKING" : "LISTENING")}>
               <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
            </button>
            <button className="voice-action-btn" onClick={() => alert('Configuración manos libres')}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
