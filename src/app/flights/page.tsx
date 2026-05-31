'use client'

import { useState, useRef, useEffect } from 'react'

interface Flight {
  airline: string; from: string; to: string
  departureTime: string; arrivalTime: string; duration: string
  stops: number; price: number; currency: string
  source: string; stars: number; deepLink: string
}

export default function FlightsPage() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [date, setDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [adults, setAdults] = useState(1)
  const [currency, setCurrency] = useState('USD')
  const [maxPrice, setMaxPrice] = useState('')
  const [flights, setFlights] = useState<Flight[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [meta, setMeta] = useState<any>(null)
  const [sortBy, setSortBy] = useState<'price' | 'stars' | 'duration'>('stars')
  const [filterSource, setFilterSource] = useState<string>('all')
  const [showCalendar, setShowCalendar] = useState(false)

  const search = async () => {
    if (!from || !to || !date) { setError('Fill from, to and date'); return }
    setLoading(true); setError(''); setFlights([]); setMeta(null)
    try {
      const p = new URLSearchParams({ from, to, date, adults: String(adults), currency })
      if (returnDate) p.set('return', returnDate)
      if (maxPrice) p.set('maxPrice', maxPrice)
      const res = await fetch(`/api/flights/search?${p}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setFlights(data.flights || [])
      setMeta(data.meta || null)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // Filter & sort
  const filtered = flights
    .filter(f => filterSource === 'all' || f.source === filterSource)
    .sort((a, b) => {
      if (sortBy === 'price') return a.price - b.price
      if (sortBy === 'stars') return b.stars - a.stars
      return (parseInt(a.duration) || 0) - (parseInt(b.duration) || 0)
    })

  const sources = [...new Set(flights.map(f => f.source))]

  const formatTime = (t: string) => {
    if (!t) return '—'
    try { return new Date(t).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', hour12: true }) } catch { return t }
  }

  const formatDate = (d: string) => {
    if (!d) return ''
    try { return new Date(d).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' }) } catch { return d }
  }

  const getStars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n)

  const getAirlineColor = (name: string) => {
    const colors: Record<string, string> = {
      'AA': '#e63946', 'DL': '#1d3557', 'UA': '#457b9d', 'SW': '#f4a261',
      'AM': '#2a9d8f', 'LH': '#264653', 'AF': '#e76f51', 'BA': '#2b2d42',
      'IB': '#ef233c', 'KL': '#0077b6', 'TP': '#00a86b', 'FR': '#ff6b6b',
      'VY': '#ffd166', 'W6': '#06d6a0', 'NK': '#ff9f1c', 'F9': '#014f86',
      'IBERIA': '#c8102e', 'AIR EUROPA': '#0055a4', 'Vueling': '#ffcc00',
    }
    const key = name.toUpperCase()
    for (const [k, v] of Object.entries(colors)) {
      if (key.includes(k)) return v
    }
    return '#8b5cf6'
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a1a 0%, #0f172a 50%, #0a0a1a 100%)', color: '#e2e8f0', fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {/* HEADER */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(10,10,26,0.8)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 100 }}>
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>✈</div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#e2e8f0' }}>NEXA <span style={{ color: '#8b5cf6' }}>Flights</span></span>
        </a>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>5 sources: Bing · Skyscanner · Google · Amadeus · Kiwi</span>
          <a href="/chat" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: 13 }}>← Back to Chat</a>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px' }}>
        {/* SEARCH BOX — Glassmorphism */}
        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>FROM</label>
              <input value={from} onChange={e => setFrom(e.target.value)} placeholder="Mexico City"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>TO</label>
              <input value={to} onChange={e => setTo(e.target.value)} placeholder="New York"
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>DATE</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, display: 'block', marginBottom: 6 }}>ADULTS</label>
              <select value={adults} onChange={e => setAdults(+e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '12px 16px', color: '#e2e8f0', fontSize: 14, outline: 'none' }}>
                {[1,2,3,4,5,6].map(n => <option key={n} value={n} style={{ background: '#1e293b' }}>{n}</option>)}
              </select>
            </div>
            <button onClick={search} disabled={loading}
              style={{ padding: '12px 28px', borderRadius: 12, background: loading ? '#334155' : 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', height: 44 }}>
              {loading ? '⏳ Searching...' : '🔍 Search'}
            </button>
          </div>

          {/* Advanced filters */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>RETURN (optional)</label>
              <input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none' }} />
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>CURRENCY</label>
              <select value={currency} onChange={e => setCurrency(e.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none' }}>
                {['USD','EUR','GBP','CAD','MXN','COP','ARS','CLP','BRL','PEN'].map(c => <option key={c} value={c} style={{background:'#1e293b'}}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600, display: 'block', marginBottom: 4 }}>MAX PRICE</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="500"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '8px 12px', color: '#e2e8f0', fontSize: 13, outline: 'none', width: 100 }} />
            </div>
          </div>
        </div>

        {/* ERROR */}
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', padding: '12px 20px', borderRadius: 12, marginBottom: 16, fontSize: 14 }}>⚠ {error}</div>}

        {/* LOADING */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>✈️</div>
            <div style={{ color: '#94a3b8', fontSize: 16 }}>Searching across 5 sources...</div>
            <div style={{ color: '#64748b', fontSize: 13, marginTop: 8 }}>Bing Travel · Skyscanner · Google Travel · Amadeus · Kiwi</div>
          </div>
        )}

        {/* RESULTS */}
        {meta && !loading && (
          <>
            {/* Summary bar */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 12, padding: '10px 18px' }}>
                <span style={{ color: '#22c55e', fontSize: 12, fontWeight: 600 }}>CHEAPEST</span>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18 }}>${meta.cheapest || '—'} {currency}</div>
              </div>
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, padding: '10px 18px' }}>
                <span style={{ color: '#8b5cf6', fontSize: 12, fontWeight: 600 }}>FOUND</span>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18 }}>{meta.total} flights</div>
              </div>
              <div style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 12, padding: '10px 18px' }}>
                <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600 }}>AVERAGE</span>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18 }}>${meta.average || '—'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '10px 18px' }}>
                <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>SOURCES</span>
                <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 18 }}>{meta.sources?.join(' · ') || '—'}</div>
              </div>
            </div>

            {/* Sort & Filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, color: '#64748b' }}>Sort:</span>
              {(['stars', 'price', 'duration'] as const).map(s => (
                <button key={s} onClick={() => setSortBy(s)}
                  style={{ padding: '6px 14px', borderRadius: 8, background: sortBy === s ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: sortBy === s ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, cursor: 'pointer' }}>
                  {s === 'stars' ? '★ Rating' : s === 'price' ? '💰 Price' : '⏱ Duration'}
                </button>
              ))}
              <div style={{ width: 1, height: 20, background: '#2a2a4a' }} />
              <span style={{ fontSize: 13, color: '#64748b' }}>Source:</span>
              <button onClick={() => setFilterSource('all')}
                style={{ padding: '6px 14px', borderRadius: 8, background: filterSource === 'all' ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: filterSource === 'all' ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, cursor: 'pointer' }}>All</button>
              {sources.map(s => (
                <button key={s} onClick={() => setFilterSource(s)}
                  style={{ padding: '6px 14px', borderRadius: 8, background: filterSource === s ? '#8b5cf6' : 'rgba(255,255,255,0.06)', color: filterSource === s ? '#fff' : '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', fontSize: 12, cursor: 'pointer', textTransform: 'capitalize' }}>{s}</button>
              ))}
            </div>

            {/* FLIGHT CARDS */}
            {filtered.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
                <p>No flights found. Try different dates or destinations.</p>
                <p style={{ fontSize: 13, marginTop: 8 }}>Tip: Some APIs require API keys. Check Vercel env vars for AMADEUS_API_KEY, KIWI_API_KEY</p>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((flight, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(10px)',
                  border: flight.stars >= 4 ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: 16, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 20,
                  transition: 'all 0.2s',
                }}>
                  {/* Airline */}
                  <div style={{ minWidth: 80, textAlign: 'center' }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, background: getAirlineColor(flight.airline),
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11,
                      margin: '0 auto 6px'
                    }}>
                      {flight.airline.substring(0, 2).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{flight.airline}</div>
                  </div>

                  {/* Route */}
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{formatTime(flight.departureTime)}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>{flight.from}</div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#64748b' }}>{flight.duration}</div>
                      <div style={{ height: 2, background: 'linear-gradient(90deg, #8b5cf6, #6d28d9)', borderRadius: 1, margin: '4px 0', opacity: 0.5 }} />
                      <div style={{ fontSize: 11, color: flight.stops > 0 ? '#ef4444' : '#22c55e' }}>
                        {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: '#e2e8f0' }}>{formatTime(flight.arrivalTime)}</div>
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>{flight.to}</div>
                    </div>
                  </div>

                  {/* Stars */}
                  <div style={{ textAlign: 'center', minWidth: 80 }}>
                    <div style={{ fontSize: 20, letterSpacing: 2, color: flight.stars >= 4 ? '#22c55e' : flight.stars >= 3 ? '#eab308' : '#64748b' }}>
                      {getStars(flight.stars)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{flight.stars}/5</div>
                  </div>

                  {/* Price */}
                  <div style={{ textAlign: 'right', minWidth: 100 }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: flight.stars >= 4 ? '#22c55e' : '#e2e8f0' }}>
                      ${flight.price.toFixed(0)}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{flight.currency}</div>
                    <div style={{ fontSize: 10, color: '#475569', marginTop: 2, textTransform: 'capitalize' }}>{flight.source}</div>
                  </div>

                  {/* Book */}
                  <a href={flight.deepLink} target="_blank" rel="noopener"
                    style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', color: '#fff', textDecoration: 'none', fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap' }}>
                    Book →
                  </a>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        input:focus, select:focus { border-color: #8b5cf6 !important; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 3px; }
      `}</style>
    </div>
  )
}
