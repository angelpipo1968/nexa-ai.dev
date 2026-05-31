import { NextRequest, NextResponse } from 'next/server'
import { searchAllFlights, cityToIATA, FlightResult } from '@/lib/nexa-core/flight-search'
import { searchAmadeusFlights } from '@/lib/nexa-core/amadeus'
import { searchKiwiFlights } from '@/lib/nexa-core/kiwi'

export const maxDuration = 60
export const runtime = 'nodejs'

// ─── Unified Flight Search — 5 providers in parallel ──────
// Sources: Bing Travel + Skyscanner + Google Travel + Amadeus + Kiwi
// Returns: Cheapest flights with 5-star rating

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  const departDate = searchParams.get('date') || searchParams.get('depart') || ''
  const returnDate = searchParams.get('return') || undefined
  const adults = parseInt(searchParams.get('adults') || '1')
  const currency = searchParams.get('currency') || 'USD'
  const maxPrice = searchParams.get('maxPrice') ? parseInt(searchParams.get('maxPrice')!) : undefined
  
  if (!from || !to || !departDate) {
    return NextResponse.json({
      error: 'Missing required params: from, to, date',
      example: '/api/flights/search?from=Mexico%20City&to=Madrid&date=2026-07-15&adults=1&currency=USD',
    }, { status: 400 })
  }
  
  const fromIATA = cityToIATA(from)
  const toIATA = cityToIATA(to)
  
  // ─── Search all 5 providers in parallel with individual timeouts ───
  const [webFlights, amadeusFlights, kiwiFlights] = await Promise.allSettled([
    // Web scrapers (Bing, Skyscanner, Google) — 18s timeout
    Promise.race([
      searchAllFlights({ from, to, departDate, returnDate, adults, currency }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Web timeout')), 18000)),
    ]).then(r => r.flights),
    
    // Amadeus API — 15s timeout
    Promise.race([
      searchAmadeusFlights({ from: fromIATA, to: toIATA, departDate, returnDate, adults, currency, maxPrice }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Amadeus timeout')), 15000)),
    ]),
    
    // Kiwi API — 15s timeout
    Promise.race([
      searchKiwiFlights({ from: fromIATA, to: toIATA, departDate, returnDate, adults, currency, maxPrice }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Kiwi timeout')), 15000)),
    ]),
  ])
  
  // ─── Collect results ───
  const allFlights: FlightResult[] = []
  const sources: string[] = []
  const errors: string[] = []
  
  if (webFlights.status === 'fulfilled' && webFlights.value.length > 0) {
    allFlights.push(...webFlights.value)
    sources.push('bing', 'skyscanner', 'google')
  } else if (webFlights.status === 'rejected') {
    errors.push(`Web: ${webFlights.reason?.message || 'failed'}`)
  }
  
  if (amadeusFlights.status === 'fulfilled' && amadeusFlights.value.length > 0) {
    // Convert Amadeus format to unified format
    for (const f of amadeusFlights.value) {
      allFlights.push({
        airline: f.airline,
        from: f.from,
        to: f.to,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        duration: f.duration,
        stops: f.stops,
        price: f.price,
        currency: f.currency,
        source: 'amadeus',
        stars: 0,
        deepLink: f.deepLink,
      })
    }
    sources.push('amadeus')
  } else if (amadeusFlights.status === 'rejected') {
    errors.push(`Amadeus: ${amadeusFlights.reason?.message || 'failed'}`)
  }
  
  if (kiwiFlights.status === 'fulfilled' && kiwiFlights.value.length > 0) {
    // Convert Kiwi format to unified format
    for (const f of kiwiFlights.value) {
      allFlights.push({
        airline: f.airline,
        from: f.from,
        to: f.to,
        departureTime: f.departureTime,
        arrivalTime: f.arrivalTime,
        duration: f.duration,
        stops: f.stops,
        price: f.price,
        currency: f.currency,
        source: 'kiwi',
        stars: 0,
        deepLink: f.deepLink,
      })
    }
    sources.push('kiwi')
  } else if (kiwiFlights.status === 'rejected') {
    errors.push(`Kiwi: ${kiwiFlights.reason?.message || 'failed'}`)
  }
  
  // ─── Calculate 5-star rating based on price ───
  const validFlights = allFlights.filter(f => f.price > 0)
  let ratedFlights: FlightResult[] = []
  
  if (validFlights.length > 0) {
    const prices = validFlights.map(f => f.price).sort((a, b) => a - b)
    const min = prices[0]
    const max = prices[prices.length - 1]
    const range = max - min || 1
    
    ratedFlights = validFlights.map(f => {
      // Cheaper = more stars (linear scale)
      const normalized = range > 0 ? 1 - ((f.price - min) / range) : 1
      const stars = Math.max(1, Math.min(5, Math.round(normalized * 4 + 1)))
      return { ...f, stars }
    }).sort((a, b) => b.stars - a.stars || a.price - b.price)
  }
  
  // ─── Group by source for comparison ───
  const bySource: Record<string, FlightResult[]> = {}
  for (const f of ratedFlights) {
    if (!bySource[f.source]) bySource[f.source] = []
    bySource[f.source].push(f)
  }
  
  return NextResponse.json({
    success: true,
    query: { from, to, fromIATA, toIATA, departDate, returnDate, adults, currency },
    flights: ratedFlights,
    bySource,
    meta: {
      total: ratedFlights.length,
      sources,
      cheapest: validFlights.length > 0 ? Math.min(...validFlights.map(f => f.price)) : 0,
      mostExpensive: validFlights.length > 0 ? Math.max(...validFlights.map(f => f.price)) : 0,
      average: validFlights.length > 0 ? Math.round(validFlights.reduce((s, f) => s + f.price, 0) / validFlights.length) : 0,
      errors: errors.length > 0 ? errors : undefined,
    },
  })
}

// ─── GET /api/flights/search?action=nomad&from=MEX ────────
// Kiwi Nomad: Find cheapest destinations from a city
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, from, to, date, returnDate, adults, currency, maxPrice } = body || {}
    
    if (action === 'nomad') {
      if (!from || !date) {
        return NextResponse.json({ error: 'Missing from, date' }, { status: 400 })
      }
      const { searchKiwiNomad } = await import('@/lib/nexa-core/kiwi')
      const results = await searchKiwiNomad({
        from,
        departDate: date,
        returnDate,
        maxPrice: maxPrice || 500,
        currency: currency || 'USD',
      })
      return NextResponse.json({ success: true, destinations: results })
    }
    
    // Custom multi-city search
    if (action === 'multi' && body.legs) {
      const allResults = await Promise.all(
        body.legs.map(async (leg: any) => {
          const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://nexa-ai.dev'}/api/flights/search?from=${leg.from}&to=${leg.to}&date=${leg.date}&adults=${adults || 1}&currency=${currency || 'USD'}`)
          return res.json()
        })
      )
      return NextResponse.json({ success: true, legs: allResults })
    }
    
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
