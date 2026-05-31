import { NextRequest, NextResponse } from 'next/server'
import {
  serpApiSearch, serpApiFlights, serpApiHotels, serpApiMaps,
  serpApiShopping, serpApiNews, serpApiImages, serpApiFinance,
  skyScrapperFlights, getWeather, geocodeLocation,
  getCryptoPrice, getExchangeRates, translateText,
  checkAllApis,
} from '@/lib/nexa-core/search-engine'

export const maxDuration = 60
export const runtime = 'nodejs'

// ─── Universal Search API ─────────────────────────────────
// GET /api/search?q=...&type=flights|hotels|maps|shopping|news|images|finance|weather|crypto|translate
// GET /api/search?action=status — Check all API keys

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const action = searchParams.get('action') || 'search'
  const q = searchParams.get('q') || ''
  const type = searchParams.get('type') || 'web'

  // Status check
  if (action === 'status') {
    const status = await checkAllApis()
    return NextResponse.json({ success: true, apis: status })
  }

  try {
    switch (type) {
      case 'flights': {
        const from = searchParams.get('from') || ''
        const to = searchParams.get('to') || ''
        const date = searchParams.get('date') || ''
        if (!from || !to || !date) {
          return NextResponse.json({ error: 'Missing from, to, date' }, { status: 400 })
        }
        // Try Sky Scrapper first (real-time), fallback to SerpAPI
        const [sky, serp] = await Promise.allSettled([
          skyScrapperFlights({ from, to, date, currency: searchParams.get('currency') || 'USD' }),
          serpApiFlights({ from, to, date }),
        ])
        return NextResponse.json({
          success: true,
          skyScrapper: sky.status === 'fulfilled' ? sky.value : null,
          googleFlights: serp.status === 'fulfilled' ? serp.value : null,
        })
      }

      case 'hotels': {
        const location = searchParams.get('location') || q
        const checkIn = searchParams.get('checkIn') || ''
        const checkOut = searchParams.get('checkOut') || ''
        const data = await serpApiHotels({ location, checkIn, checkOut, guests: parseInt(searchParams.get('guests') || '2') })
        return NextResponse.json({ success: true, data })
      }

      case 'maps': {
        const data = await serpApiMaps({ q })
        return NextResponse.json({ success: true, data })
      }

      case 'shopping': {
        const data = await serpApiShopping({ q, currency: searchParams.get('currency') || 'USD' })
        return NextResponse.json({ success: true, data })
      }

      case 'news': {
        const data = await serpApiNews({ q: q || undefined, topic: searchParams.get('topic') || undefined, country: searchParams.get('country') || 'mx' })
        return NextResponse.json({ success: true, data })
      }

      case 'images': {
        const data = await serpApiImages({ q, num: parseInt(searchParams.get('num') || '10') })
        return NextResponse.json({ success: true, data })
      }

      case 'finance': {
        const data = await serpApiFinance({ q })
        return NextResponse.json({ success: true, data })
      }

      case 'weather': {
        const lat = parseFloat(searchParams.get('lat') || '19.4326')
        const lon = parseFloat(searchParams.get('lon') || '-99.1332')
        const data = await getWeather({ lat, lon, days: parseInt(searchParams.get('days') || '7') })
        return NextResponse.json({ success: true, data })
      }

      case 'crypto': {
        const ids = (searchParams.get('ids') || 'bitcoin,ethereum,solana,cardano').split(',')
        const data = await getCryptoPrice(ids)
        return NextResponse.json({ success: true, data })
      }

      case 'exchange': {
        const base = searchParams.get('base') || 'USD'
        const data = await getExchangeRates(base)
        return NextResponse.json({ success: true, data })
      }

      case 'translate': {
        const text = searchParams.get('text') || q
        const from = searchParams.get('from') || 'auto'
        const to = searchParams.get('to') || 'en'
        if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })
        const data = await translateText(text, from, to)
        return NextResponse.json({ success: true, data })
      }

      case 'geocode': {
        if (!q) return NextResponse.json({ error: 'Missing q' }, { status: 400 })
        const data = await geocodeLocation(q)
        return NextResponse.json({ success: true, data })
      }

      default: {
        // General web search
        const data = await serpApiSearch({
          q,
          engine: 'google',
          hl: searchParams.get('hl') || 'es',
          gl: searchParams.get('gl') || 'mx',
          num: parseInt(searchParams.get('num') || '10'),
          location: searchParams.get('location') || undefined,
        })
        return NextResponse.json({ success: true, data })
      }
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Search failed' }, { status: 500 })
  }
}
