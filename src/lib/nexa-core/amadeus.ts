/**
 * Amadeus Flight Search API v2
 * Free tier: 2,000 API calls/month
 * Docs: https://developers.amadeus.com/self-service/category/flights
 * 
 * Get API key: https://developers.amadeus.com/register
 */

export interface AmadeusFlight {
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
  source: 'amadeus'
  stars: number
  deepLink: string
  aircraft?: string
  cabinClass: string
  remainingSeats?: number
}

interface AmadeusToken {
  access_token: string
  expires_at: number
}

let cachedToken: AmadeusToken | null = null

async function getAmadeusToken(): Promise<string | null> {
  const key = process.env.AMADEUS_API_KEY || ''
  const secret = process.env.AMADEUS_API_SECRET || ''
  
  if (!key || !secret) {
    console.warn('Amadeus: Missing AMADEUS_API_KEY or AMADEUS_API_SECRET')
    return null
  }
  
  // Return cached token if still valid
  if (cachedToken && cachedToken.expires_at > Date.now() + 60000) {
    return cachedToken.access_token
  }
  
  try {
    const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: key,
        client_secret: secret,
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!res.ok) {
      console.warn(`Amadeus auth: HTTP ${res.status}`)
      return null
    }
    
    const data = await res.json()
    cachedToken = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in || 1800) * 1000,
    }
    return cachedToken.access_token
  } catch (e) {
    console.warn(`Amadeus auth failed: ${e}`)
    return null
  }
}

export async function searchAmadeusFlights(params: {
  from: string  // IATA code
  to: string    // IATA code
  departDate: string  // YYYY-MM-DD
  returnDate?: string
  adults?: number
  children?: number
  infants?: number
  currency?: string
  maxPrice?: number
  stopovers?: boolean
}): Promise<AmadeusFlight[]> {
  const token = await getAmadeusToken()
  if (!token) return []
  
  const from = params.from.toUpperCase()
  const to = params.to.toUpperCase()
  const currency = params.currency || 'USD'
  
  const searchParams = new URLSearchParams({
    originLocationCode: from,
    destinationLocationCode: to,
    departureDate: params.departDate,
    adults: String(params.adults || 1),
    children: String(params.children || 0),
    infants: String(params.infants || 0),
    currencyCode: currency,
    max: '25',
  })
  
  if (params.returnDate) searchParams.set('returnDate', params.returnDate)
  if (params.maxPrice) searchParams.set('maxPrice', String(params.maxPrice))
  if (!params.stopovers) searchParams.set('nonStop', 'true')
  
  try {
    const res = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-offers?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      }
    )
    
    if (!res.ok) {
      console.warn(`Amadeus search: HTTP ${res.status}`)
      return []
    }
    
    const data = await res.json()
    const flights: AmadeusFlight[] = []
    
    for (const offer of (data.data || [])) {
      const itinerary = offer.itineraries?.[0]
      const segment = itinerary?.segments?.[0]
      const lastSegment = itinerary?.segments?.[itinerary.segments.length - 1]
      
      if (!segment) continue
      
      const priceBreakdown = offer.price?.grandTotal || offer.price?.total || '0'
      
      flights.push({
        airline: segment.carrierCode || 'Unknown',
        flightNumber: `${segment.carrierCode}${segment.number}`,
        from: segment.departure?.iataCode || from,
        to: lastSegment?.arrival?.iataCode || to,
        departureTime: segment.departure?.at || '',
        arrivalTime: lastSegment?.arrival?.at || '',
        duration: parseDuration(itinerary?.duration),
        stops: (itinerary?.segments?.length || 1) - 1,
        price: parseFloat(priceBreakdown) || 0,
        currency: offer.price?.currency || currency,
        source: 'amadeus',
        stars: 0,
        deepLink: `https://www.amadeus.com/flights/${from}/${to}/${params.departDate}`,
        aircraft: segment.aircraft?.code,
        cabinClass: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
        remainingSeats: offer.numberOfBookableSeats,
      })
    }
    
    return flights
  } catch (e) {
    console.warn(`Amadeus search failed: ${e}`)
    return []
  }
}

function parseDuration(isoDuration: string): string {
  if (!isoDuration) return ''
  // Parse PT2H30M → 2h 30m
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return isoDuration
  const h = match[1] || '0'
  const m = match[2] || '0'
  return `${h}h ${m}m`
}

/**
 * Amadeus Airport/City Search — find nearest airport
 */
export async function searchAmadeusLocations(keyword: string): Promise<Array<{
  iata: string
  name: string
  city: string
  country: string
  lat: number
  lng: number
}>> {
  const token = await getAmadeusToken()
  if (!token) return []
  
  try {
    const res = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(keyword)}&page[limit]=10`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.data || []).map((loc: any) => ({
      iata: loc.iataCode || '',
      name: loc.name || '',
      city: loc.address?.cityName || loc.address?.cityCode || '',
      country: loc.address?.countryCode || '',
      lat: loc.geoCode?.latitude || 0,
      lng: loc.geoCode?.longitude || 0,
    }))
  } catch {
    return []
  }
}

/**
 * Amadeus Flight Price Calendar — cheapest dates
 */
export async function getAmadeusPriceCalendar(params: {
  from: string
  to: string
  month: string // YYYY-MM
}): Promise<Array<{ date: string; price: number }>> {
  const token = await getAmadeusToken()
  if (!token) return []
  
  try {
    const res = await fetch(
      `https://test.api.amadeus.com/v2/shopping/flight-dates?origin=${params.from.toUpperCase()}&destination=${params.to.toUpperCase()}&departureDate=${params.month}-01,${params.month}-28&oneWay=true&currencyCode=USD&maxPrice=5000`,
      {
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (!res.ok) return []
    
    const data = await res.json()
    return (data.data || []).map((d: any) => ({
      date: d.destination || d.departureDate || '',
      price: parseFloat(d.price?.total || '0') || 0,
    }))
  } catch {
    return []
  }
}
