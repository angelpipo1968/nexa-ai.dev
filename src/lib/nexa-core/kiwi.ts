/**
 * Kiwi / Tequila Flight Search API
 * Free tier: Limited but generous for personal use
 * Docs: https://tequila.kiwi.com/portal/docs/tequila_api
 * Get API key: https://tequila.kiwi.com/portal/signup
 * 
 * Features: Multi-city, flexible dates, "Nomad" mode,Deep Budget
 */

export interface KiwiFlight {
  airline: string
  flightNumber: string
  from: string
  to: string
  departureTime: string
  arrivalTime: string
  duration: string
  stops: number
  price: number
  currency: string
  source: 'kiwi'
  stars: number
  deepLink: string
  quality: number  // Kiwi quality score
  bookingToken: string
}

const KIWI_BASE = 'https://api.skypicker.com/flights'
const KIWI_PARTNER = 'picky'

export async function searchKiwiFlights(params: {
  from: string       // IATA code or lat,lon
  to: string         // IATA code or lat,lon
  departDate: string // YYYY-MM-DD
  returnDate?: string
  adults?: number
  children?: number
  infants?: number
  currency?: string
  maxPrice?: number
  stopovers?: boolean
  locale?: string
}): Promise<KiwiFlight[]> {
  const apiKey = process.env.KIWI_API_KEY || ''
  if (!apiKey) {
    console.warn('Kiwi: Missing KIWI_API_KEY')
    return []
  }
  
  const from = params.from.toUpperCase()
  const to = params.to.toUpperCase()
  const currency = params.currency || 'USD'
  
  const searchParams = new URLSearchParams({
    fly_from: from,
    fly_to: to,
    date_from: formatKiwiDate(params.departDate),
    date_to: formatKiwiDate(params.departDate),
    adults: String(params.adults || 1),
    children: String(params.children || 0),
    infants: String(params.infants || 0),
    curr: currency,
    locale: params.locale || 'en',
    partner: KIWI_PARTNER,
    limit: '50',
    sort: 'price',
    asc: '1',
  })
  
  if (params.returnDate) {
    searchParams.set('return_from', formatKiwiDate(params.returnDate))
    searchParams.set('return_to', formatKiwiDate(params.returnDate))
  }
  if (params.maxPrice) searchParams.set('price_to', String(params.maxPrice))
  if (!params.stopovers) searchParams.set('max_stopovers', '0')
  
  try {
    const res = await fetch(`${KIWI_BASE}?${searchParams}`, {
      headers: {
        'apikey': apiKey,
        'Accept': 'application/json',
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!res.ok) {
      console.warn(`Kiwi: HTTP ${res.status}`)
      return []
    }
    
    const data = await res.json()
    const flights: KiwiFlight[] = []
    
    for (const route of (data.data || [])) {
      const convertTime = (ts: number) => {
        if (!ts) return ''
        return new Date(ts * 1000).toISOString()
      }
      
      const durationMin = route.duration?.total || 0
      const hours = Math.floor(durationMin / 3600)
      const mins = Math.floor((durationMin % 3600) / 60)
      
      flights.push({
        airline: route.airlines?.[0] || 'Unknown',
        flightNumber: `${route.airlines?.[0] || ''}${route.route?.[0]?.flight_no || ''}`,
        from: route.flyFrom || from,
        to: route.flyTo || to,
        departureTime: convertTime(route.dTimeUTC),
        arrivalTime: convertTime(route.aTimeUTC),
        duration: `${hours}h ${mins}m`,
        stops: (route.route?.length || 1) - 1,
        price: route.price || 0,
        currency: data.currency || currency,
        source: 'kiwi',
        stars: 0,
        deepLink: `https://www.kiwi.com/en/search/results/${from}/${to}/${params.departDate}`,
        quality: route.quality || 0,
        bookingToken: route.booking_token || '',
      })
    }
    
    return flights
  } catch (e) {
    console.warn(`Kiwi search failed: ${e}`)
    return []
  }
}

function formatKiwiDate(dateStr: string): string {
  // Kiwi uses DD/MM/YYYY format
  const parts = dateStr.split('-')
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }
  return dateStr
}

/**
 * Kiwi Location Search — find airports by name or coords
 */
export async function searchKiwiLocations(keyword: string): Promise<Array<{
  id: string
  name: string
  city: string
  country: string
  lat: number
  lng: number
}>> {
  const apiKey = process.env.KIWI_API_KEY || ''
  if (!apiKey) return []
  
  try {
    const res = await fetch(
      `https://api.skypicker.com/locations?term=${encodeURIComponent(keyword)}&location_types=airport,city&limit=10&active_only=true&sort=name`,
      {
        headers: { apikey: apiKey },
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.locations || []).map((loc: any) => ({
      id: loc.id || '',
      name: loc.name || '',
      city: loc.city?.name || '',
      country: loc.country?.name || '',
      lat: loc.location?.lat || 0,
      lng: loc.location?.lon || 0,
    }))
  } catch {
    return []
  }
}

/**
 * Kiwi Nomad — find cheapest destinations from a city
 */
export async function searchKiwiNomad(params: {
  from: string
  departDate: string
  returnDate?: string
  maxPrice?: number
  currency?: string
}): Promise<Array<{
  to: string
  city: string
  country: string
  price: number
  airline: string
  deepLink: string
}>> {
  const apiKey = process.env.KIWI_API_KEY || ''
  if (!apiKey) return []
  
  const searchParams = new URLSearchParams({
    fly_from: params.from.toUpperCase(),
    date_from: formatKiwiDate(params.departDate),
    date_to: formatKiwiDate(params.departDate),
    curr: params.currency || 'USD',
    partner: KIWI_PARTNER,
    limit: '30',
    sort: 'price',
    asc: '1',
  })
  
  if (params.returnDate) {
    searchParams.set('return_from', formatKiwiDate(params.returnDate))
    searchParams.set('return_to', formatKiwiDate(params.returnDate))
  }
  if (params.maxPrice) searchParams.set('price_to', String(params.maxPrice))
  
  try {
    const res = await fetch(`${KIWI_BASE}?${searchParams}`, {
      headers: { apikey: apiKey },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!res.ok) return []
    
    const data = await res.json()
    const destinations: Array<{ to: string; city: string; country: string; price: number; airline: string; deepLink: string }> = []
    const seen = new Set<string>()
    
    for (const route of (data.data || [])) {
      const dest = route.flyTo || ''
      if (seen.has(dest)) continue
      seen.add(dest)
      
      destinations.push({
        to: dest,
        city: route.cityTo || '',
        country: route.countryTo?.name || '',
        price: route.price || 0,
        airline: route.airlines?.[0] || 'Unknown',
        deepLink: `https://www.kiwi.com/en/search/results/${params.from.toUpperCase()}/${dest}/${params.departDate}`,
      })
    }
    
    return destinations.slice(0, 20)
  } catch {
    return []
  }
}
