'use client'

import { useState, useRef, useEffect } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  image?: string
  provider?: string
  timestamp: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('google/gemini-2.5-flash')
  const [image, setImage] = useState<string | null>(null)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() && !image) return
    setError('')
    setLoading(true)

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: input,
      image: image || undefined,
      timestamp: Date.now(),
    }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setCurrentImage(null)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({
            role: m.role,
            content: m.content,
            image: m.image,
          })),
          model,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: '',
        provider: '',
        timestamp: Date.now(),
      }
      setMessages(prev => [...prev, assistantMsg])

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) {
                setMessages(prev => {
                  const last = prev[prev.length - 1]
                  if (last.role === 'assistant') {
                    return [...prev.slice(0, -1), { ...last, content: last.content + parsed.text }]
                  }
                  return prev
                })
              }
              if (parsed.provider) setProvider(parsed.provider)
            } catch {}
          }
        }
      }
    } catch (e: any) {
      setError(e.message || 'Error sending message')
    } finally {
      setLoading(false)
    }
  }

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Image too large (max 5MB)')
      return
    }
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100vh',background:'#0a0a0f',color:'#e2e8f0',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* HEADER */}
      <div style={{display:'flex',alignItems:'center',padding:'12px 20px',borderBottom:'1px solid #1e293b',gap:12,background:'#0f0f1a'}}>
        <a href="/" style={{color:'#8b5cf6',textDecoration:'none',fontWeight:700,fontSize:18}}>⚕ NEXA</a>
        <select value={model} onChange={e => setModel(e.target.value)}
          style={{background:'#1e293b',border:'1px solid #2a2a4a',color:'#94a3b8',padding:'6px 10px',borderRadius:8,fontSize:12,cursor:'pointer'}}>
          <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (Free)</option>
          <option value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet</option>
          <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
          <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
          <option value="meta-llama/llama-3.3-70b">Llama 3.3 70B</option>
        </select>
        {provider && <span style={{fontSize:11,color:'#64748b'}}>via {provider}</span>}
        <div style={{flex:1}} />
        <span style={{fontSize:11,color:'#22c55e',display:'flex',alignItems:'center',gap:4}}>
          <span style={{width:6,height:6,borderRadius:'50%',background:'#22c55e'}}/> Online
        </span>
      </div>

      {/* MESSAGES */}
      <div style={{flex:1,overflowY:'auto',padding:'20px',display:'flex',flexDirection:'column',gap:16}}>
        {messages.length === 0 && (
          <div style={{textAlign:'center',padding:'60px 20px',color:'#64748b'}}>
            <div style={{fontSize:48,marginBottom:16}}>⚕</div>
            <h2 style={{fontSize:24,fontWeight:700,color:'#e2e8f0',marginBottom:8}}>NEXA PRO Chat</h2>
            <p style={{maxWidth:400,margin:'0 auto 24px',lineHeight:1.6}}>
              Ask me anything. I can analyze images, search the web, generate code, check flights, weather, and 37+ more tools.
            </p>
            <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
              {['Analyze an image','Search flights to Paris','Weather in Mexico City','Generate Python code','Check lottery results'].map(q=>(
                <button key={q} onClick={()=>{setInput(q)}}
                  style={{padding:'8px 16px',borderRadius:8,background:'#1e293b',color:'#94a3b8',border:'1px solid #2a2a4a',fontSize:13,cursor:'pointer'}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} style={{display:'flex',gap:10,maxWidth:750,alignSelf:msg.role==='user'?'flex-end':'flex-start',flexDirection:msg.role==='user'?'row-reverse':'row'}}>
            <div style={{width:28,height:28,borderRadius:8,background:msg.role==='assistant'?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'#334155',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,flexShrink:0}}>
              {msg.role==='assistant'?'⚕':'👤'}
            </div>
            <div style={{background:msg.role==='user'?'#8b5cf6':'#1e293b',padding:'12px 16px',borderRadius:12,borderTopRightRadius:msg.role==='user'?4:12,borderTopLeftRadius:msg.role==='user'?12:4,lineHeight:1.6,fontSize:14,whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
              {msg.image && <img src={msg.image} alt="" style={{maxWidth:200,borderRadius:8,marginBottom:8}}/>}
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{display:'flex',gap:10,maxWidth:750}}>
            <div style={{width:28,height:28,borderRadius:8,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13}}>⚕</div>
            <div style={{background:'#1e293b',padding:'12px 16px',borderRadius:12,borderTopLeftRadius:4}}>
              <div style={{display:'flex',gap:4}}>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#64748b',animation:'bounce 1.4s infinite'}}/>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#64748b',animation:'bounce 1.4s infinite .2s'}}/>
                <span style={{width:6,height:6,borderRadius:'50%',background:'#64748b',animation:'bounce 1.4s infinite .4s'}}/>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#ef4444',padding:'12px 16px',borderRadius:10,fontSize:13,textAlign:'center'}}>
            ⚠ {error}
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* INPUT */}
      <div style={{padding:'12px 16px',borderTop:'1px solid #1e293b',background:'#0f0f1a'}}>
        {image && (
          <div style={{marginBottom:8,position:'relative',display:'inline-block'}}>
            <img src={image} alt="" style={{maxHeight:80,borderRadius:8}}/>
            <button onClick={()=>setImage(null)} style={{position:'absolute',top:-6,right:-6,width:20,height:20,borderRadius:'50%',background:'#ef4444',color:'#fff',border:'none',cursor:'pointer',fontSize:12}}>×</button>
          </div>
        )}
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <button onClick={()=>fileRef.current?.click()}
            style={{width:40,height:40,borderRadius:10,background:'#1e293b',border:'1px solid #2a2a4a',color:'#94a3b8',cursor:'pointer',fontSize:18,flexShrink:0}}>
            📷
          </button>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{display:'none'}}/>
          <textarea value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()}}}
            placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{flex:1,background:'#0a0a0f',border:'1px solid #2a2a4a',borderRadius:10,padding:'10px 14px',color:'#e2e8f0',fontSize:14,resize:'none',outline:'none',minHeight:40,maxHeight:120,fontFamily:'inherit'}}
          />
          <button onClick={sendMessage} disabled={loading || (!input.trim() && !image)}
            style={{width:40,height:40,borderRadius:10,background:loading?'#1e293b':'linear-gradient(135deg,#8b5cf6,#6d28d9)',border:'none',color:'#fff',cursor:loading?'not-allowed':'pointer',fontSize:18,flexShrink:0,opacity:loading?.5:1}}>
            ➤
          </button>
        </div>
        <div style={{textAlign:'center',marginTop:8}}>
          <span style={{fontSize:11,color:'#475569'}}>Powered by OpenRouter + Gemini 2.5 Flash (Free) · 37+ tools connected</span>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
        textarea:focus { border-color: #8b5cf6 !important; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
      `}</style>
    </div>
  )
}
