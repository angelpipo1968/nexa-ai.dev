import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'NEXA PRO v5.2 — AI Assistant | Chat, Vision, Voice, 37+ Tools',
  description: 'NEXA PRO: Advanced AI assistant with chat, image analysis, voice, web search, code generation, flights, weather, lottery, and 37+ integrated tools. Free tier available.',
  keywords: 'AI assistant, chatbot, image analysis, voice AI, free AI, NEXA PRO',
  openGraph: {
    title: 'NEXA PRO v5.2 — AI Assistant',
    description: 'Advanced AI with 37+ tools. Chat, Vision, Voice, Code, Flights, Weather & more.',
    images: ['/og-image.png'],
  },
}

export default function Home() {
  return (
    <main style={{minHeight:'100vh',background:'#0a0a0f',color:'#e2e8f0',fontFamily:"'Segoe UI',system-ui,sans-serif"}}>
      {/* NAV */}
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 32px',borderBottom:'1px solid #1e293b',background:'#0a0a0f',position:'sticky',top:0,zIndex:100,backdropFilter:'blur(12px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,borderRadius:10,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:18}}>N</div>
          <span style={{fontWeight:700,fontSize:20,letterSpacing:'-0.5px'}}>NEXA <span style={{color:'#8b5cf6'}}>PRO</span></span>
          <span style={{fontSize:11,padding:'2px 8px',borderRadius:6,background:'#1e293b',color:'#94a3b8',marginLeft:4}}>v5.2</span>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <a href="#features" style={{color:'#94a3b8',textDecoration:'none',fontSize:14,padding:'8px 16px',borderRadius:8,transition:'all .2s'}}>Features</a>
          <a href="#pricing" style={{color:'#94a3b8',textDecoration:'none',fontSize:14,padding:'8px 16px',borderRadius:8,transition:'all .2s'}}>Pricing</a>
          <a href="/chat" style={{color:'#fff',textDecoration:'none',fontSize:14,padding:'8px 20px',borderRadius:8,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',fontWeight:600}}>Open Chat →</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{textAlign:'center',padding:'80px 32px 60px',maxWidth:900,margin:'0 auto'}}>
        <div style={{display:'inline-block',padding:'6px 16px',borderRadius:20,background:'#1e293b',color:'#a78bfa',fontSize:13,fontWeight:600,marginBottom:24,border:'1px solid #2a2a4a'}}>
          🚀 v5.2 — Now with Android 16, 37+ Tools & Free AI Models
        </div>
        <h1 style={{fontSize:'clamp(36px,6vw,64px)',fontWeight:800,lineHeight:1.1,margin:'0 0 20px',letterSpacing:'-1.5px',background:'linear-gradient(135deg,#fff,#a78bfa)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>
          Your AI Assistant<br/>That Actually Works
        </h1>
        <p style={{fontSize:18,color:'#94a3b8',maxWidth:600,margin:'0 auto 32px',lineHeight:1.6}}>
          Chat, analyze images, search the web, generate code, check flights, weather, lottery, and 37+ tools — all in one place. Free tier with $5 credit to start.
        </p>
        <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
          <a href="/chat" style={{padding:'14px 32px',borderRadius:12,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'#fff',textDecoration:'none',fontWeight:700,fontSize:16,boxShadow:'0 0 30px rgba(139,92,246,0.3)'}}>
            Start Free — $5 Credit →
          </a>
          <a href="#features" style={{padding:'14px 32px',borderRadius:12,background:'#1e293b',color:'#e2e8f0',textDecoration:'none',fontWeight:600,fontSize:16,border:'1px solid #2a2a4a'}}>
            See Features
          </a>
        </div>
        <div style={{display:'flex',gap:24,justifyContent:'center',marginTop:40,flexWrap:'wrap'}}>
          {['37+ Tools','Free Tier','Vision AI','Voice Mode','Code Gen','Web Search'].map(t=>(
            <span key={t} style={{fontSize:13,color:'#64748b',display:'flex',alignItems:'center',gap:6}}>
              <span style={{color:'#22c55e'}}>✓</span> {t}
            </span>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{padding:'60px 32px',maxWidth:1100,margin:'0 auto'}}>
        <h2 style={{textAlign:'center',fontSize:32,fontWeight:700,marginBottom:8}}>Everything You Need</h2>
        <p style={{textAlign:'center',color:'#64748b',marginBottom:40}}>37+ integrated tools and counting</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:16}}>
          {[
            {icon:'💬',title:'AI Chat',desc:'Chat with advanced AI models — Gemini, Claude, GPT-4o, Llama & more. Streaming responses in real-time.',tag:'Free'},
            {icon:'👁️',title:'Vision AI',desc:'Analyze any image — describe, extract text, identify objects, suggest improvements, read code.',tag:'Free'},
            {icon:'🎤',title:'Voice Mode',desc:'Hands-free voice conversation. Speak naturally, NEXA responds. Barge-in support.',tag:'Pro'},
            {icon:'💻',title:'Code Generation',desc:'Generate production code in any language. Debug, optimize, explain. Full-stack capable.',tag:'Free'},
            {icon:'🔍',title:'Web Search',desc:'Real-time web search with Brave, Google, and DuckDuckGo. Always up-to-date info.',tag:'Free'},
            {icon:'✈️',title:'Flight Search',desc:'Search flights with Skyscanner & Google Flights. Compare prices, dates, airlines.',tag:'Free'},
            {icon:'🌤️',title:'Weather',desc:'7-day weather forecast for any city. Powered by Open-Meteo (free, no API key).',tag:'Free'},
            {icon:'🎰',title:'Lottery',desc:'Check lottery results, generate numbers, get next draw dates. Multiple games supported.',tag:'Free'},
            {icon:'🎬',title:'Movies & TV',desc:'Search movies, TV shows, get ratings, trailers, streaming availability via TMDB.',tag:'Free'},
            {icon:'📰',title:'News',desc:'Latest news from multiple sources. Category filtering, search, trending topics.',tag:'Free'},
            {icon:'🎵',title:'Spotify',desc:'Search songs, artists, albums, playlists. Control playback, get recommendations.',tag:'Free'},
            {icon:'🗺️',title:'Maps & Places',desc:'Search places, get directions, find nearby restaurants, hotels, attractions.',tag:'Free'},
            {icon:'📊',title:'Finance',desc:'Stock prices, crypto rates, market data. Real-time from free financial APIs.',tag:'Free'},
            {icon:'🚀',title:'Space & NASA',desc:'NASA APOD, Mars rover photos, space news, ISS tracking.',tag:'Free'},
            {icon:'📚',title:'Academic',desc:'Search arXiv papers, books, academic resources. Research assistant.',tag:'Free'},
            {icon:'🌐',title:'Translation',desc:'Translate between 100+ languages. Powered by free ML models.',tag:'Free'},
            {icon:'🎨',title:'Image Generation',desc:'Generate AI images from text descriptions. Powered by free image APIs.',tag:'Free'},
            {icon:'🔧',title:'System Tools',desc:'Calculator, unit converter, QR generator, password generator, color picker.',tag:'Free'},
          ].map(f=>(
            <div key={f.title} style={{background:'#12121a',border:'1px solid #1e293b',borderRadius:14,padding:20,transition:'all .2s'}}>
              <div style={{fontSize:28,marginBottom:10}}>{f.icon}</div>
              <h3 style={{fontSize:16,fontWeight:700,marginBottom:6}}>{f.title}</h3>
              <p style={{fontSize:13,color:'#94a3b8',lineHeight:1.5,marginBottom:10}}>{f.desc}</p>
              <span style={{fontSize:11,padding:'3px 10px',borderRadius:6,background:f.tag==='Free'?'rgba(34,197,94,0.15)':'rgba(139,92,246,0.15)',color:f.tag==='Free'?'#22c55e':'#a78bfa',fontWeight:600}}>{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{padding:'60px 32px',maxWidth:900,margin:'0 auto'}}>
        <h2 style={{textAlign:'center',fontSize:32,fontWeight:700,marginBottom:8}}>Simple Pricing</h2>
        <p style={{textAlign:'center',color:'#64748b',marginBottom:40}}>Start free, upgrade when you need more</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:20}}>
          {/* FREE */}
          <div style={{background:'#12121a',border:'1px solid #1e293b',borderRadius:16,padding:28,textAlign:'center'}}>
            <div style={{fontSize:13,color:'#64748b',fontWeight:600,marginBottom:8}}>FREE</div>
            <div style={{fontSize:40,fontWeight:800,marginBottom:4}}>$0</div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>Forever free</div>
            <div style={{textAlign:'left',display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
              {['$5 free credit to start','AI Chat (Vision, GPT-4o mini)','Image analysis','Web search','Code generation','Weather, Flights, Lottery','37+ free tools'].map(f=>(
                <span key={f} style={{fontSize:13,color:'#94a3b8',display:'flex',alignItems:'center',gap:8}}><span style={{color:'#22c55e'}}>✓</span> {f}</span>
              ))}
            </div>
            <a href="/chat" style={{display:'block',padding:'12px',borderRadius:10,background:'#1e293b',color:'#e2e8f0',textDecoration:'none',fontWeight:600,border:'1px solid #2a2a4a'}}>Get Started Free</a>
          </div>
          {/* PRO 5 */}
          <div style={{background:'#12121a',border:'2px solid #8b5cf6',borderRadius:16,padding:28,textAlign:'center',position:'relative'}}>
            <div style={{position:'absolute',top:-12,left:'50%',transform:'translateX(-50%)',padding:'4px 14px',borderRadius:20,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'#fff',fontSize:12,fontWeight:700}}>POPULAR</div>
            <div style={{fontSize:13,color:'#a78bfa',fontWeight:600,marginBottom:8}}>PRO 5</div>
            <div style={{fontSize:40,fontWeight:800,marginBottom:4}}>$5<span style={{fontSize:16,color:'#64748b'}}>/mo</span></div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>15 days free trial</div>
            <div style={{textAlign:'left',display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
              {['Everything in Free','Priority AI models (Claude, GPT-4o)','Voice mode with barge-in','Higher rate limits','Image generation','Email support'].map(f=>(
                <span key={f} style={{fontSize:13,color:'#94a3b8',display:'flex',alignItems:'center',gap:8}}><span style={{color:'#8b5cf6'}}>✓</span> {f}</span>
              ))}
            </div>
            <a href="#signup" style={{display:'block',padding:'12px',borderRadius:10,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'#fff',textDecoration:'none',fontWeight:700}}>Start 15-Day Trial →</a>
          </div>
          {/* PRO 15 */}
          <div style={{background:'#12121a',border:'1px solid #1e293b',borderRadius:16,padding:28,textAlign:'center'}}>
            <div style={{fontSize:13,color:'#64748b',fontWeight:600,marginBottom:8}}>PRO 15</div>
            <div style={{fontSize:40,fontWeight:800,marginBottom:4}}>$15<span style={{fontSize:16,color:'#64748b'}}>/mo</span></div>
            <div style={{fontSize:13,color:'#64748b',marginBottom:20}}>3 services included</div>
            <div style={{textAlign:'left',display:'flex',flexDirection:'column',gap:8,marginBottom:24}}>
              {['Everything in Pro 5','3 different AI services','Unlimited voice mode','Custom AI personas','API access','Priority support'].map(f=>(
                <span key={f} style={{fontSize:13,color:'#94a3b8',display:'flex',alignItems:'center',gap:8}}><span style={{color:'#22c55e'}}>✓</span> {f}</span>
              ))}
            </div>
            <a href="#signup" style={{display:'block',padding:'12px',borderRadius:10,background:'#1e293b',color:'#e2e8f0',textDecoration:'none',fontWeight:600,border:'1px solid #2a2a4a'}}>Get Started →</a>
          </div>
        </div>
      </section>

      {/* SIGNUP */}
      <section id="signup" style={{padding:'60px 32px',maxWidth:500,margin:'0 auto'}}>
        <div style={{background:'#12121a',border:'1px solid #1e293b',borderRadius:16,padding:32}}>
          <h2 style={{fontSize:24,fontWeight:700,marginBottom:8,textAlign:'center'}}>Create Your Free Account</h2>
          <p style={{color:'#64748b',textAlign:'center',marginBottom:24,fontSize:14}}>Get $5 free credit. No credit card required.</p>
          <form action="/api/auth/register" method="POST" style={{display:'flex',flexDirection:'column',gap:12}}>
            <input name="name" placeholder="Your name" required style={{background:'#0a0a0f',border:'1px solid #2a2a4a',borderRadius:10,padding:'12px 16px',color:'#e2e8f0',fontSize:14,outline:'none'}}/>
            <input name="email" type="email" placeholder="Email address" required style={{background:'#0a0a0f',border:'1px solid #2a2a4a',borderRadius:10,padding:'12px 16px',color:'#e2e8f0',fontSize:14,outline:'none'}}/>
            <input name="password" type="password" placeholder="Password (min 8 chars)" required minLength={8} style={{background:'#0a0a0f',border:'1px solid #2a2a4a',borderRadius:10,padding:'12px 16px',color:'#e2e8f0',fontSize:14,outline:'none'}}/>
            <button type="submit" style={{padding:'14px',borderRadius:10,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',color:'#fff',fontWeight:700,fontSize:16,cursor:'pointer',border:'none',marginTop:4}}>
              Create Account — Get $5 Free →
            </button>
          </form>
          <p style={{color:'#475569',textAlign:'center',marginTop:16,fontSize:12}}>
            By signing up you agree to our Terms of Service. Cancel anytime.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid #1e293b',padding:'32px',textAlign:'center',color:'#475569',fontSize:13}}>
        <div style={{display:'flex',justifyContent:'center',gap:24,marginBottom:16,flexWrap:'wrap'}}>
          <a href="/chat" style={{color:'#94a3b8',textDecoration:'none'}}>Chat</a>
          <a href="#features" style={{color:'#94a3b8',textDecoration:'none'}}>Features</a>
          <a href="#pricing" style={{color:'#94a3b8',textDecoration:'none'}}>Pricing</a>
          <a href="https://github.com/angelpipo1968/nexa-ai-android" style={{color:'#94a3b8',textDecoration:'none'}}>GitHub</a>
          <a href="https://nexa-ai.dev/api/health" style={{color:'#94a3b8',textDecoration:'none'}}>API Status</a>
        </div>
        <p>© 2026 NEXA PRO by ZOO Company. All rights reserved.</p>
        <p style={{marginTop:8,fontSize:11}}>Powered by OpenRouter, Ollama, Gemini, Claude, GPT-4o, Llama & 37+ free APIs</p>
      </footer>
    </main>
  )
}
