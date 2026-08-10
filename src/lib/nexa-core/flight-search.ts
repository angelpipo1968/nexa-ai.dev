/**
 * NEXA Flight Search Engine v5.2
 * Searches across Bing Travel, Skyscanner, Google Travel
 * Returns cheapest fares with 5-star rating
 */

export interface FlightResult {
  airline: string
  from: string
  to: string
  departureTime: string
  arrivalTime: string
  duration: string
  stops: number
  price: number
  currency: string
  source: 'bing' | 'skyscanner' | 'google' | 'amadeus' | 'kiwi'
  stars: number  // 1-5 rating based on price
  deepLink: string
}

export interface SearchParams {
  from: string       // City name or IATA code
  to: string         // City name or IATA code
  departDate: string // YYYY-MM-DD
  returnDate?: string
  adults?: number
  currency?: string
}

// ─── CITY TO IATA CODE MAPPING ─────────────────────────────
const CITY_TO_IATA: Record<string, string> = {
  // Mexico
  'mexico city': 'MEX', 'cdmx': 'MEX', 'guadalajara': 'GDL', 'monterrey': 'MTY',
  'cancun': 'CUN', 'puerto vallarta': 'PVR', 'los cabos': 'SJD', 'tijuana': 'TIJ',
  'leon': 'BJX', 'merida': 'MID', 'oaxaca': 'OAX', 'puebla': 'PBC', 'queretaro': 'QRO',
  'hermosillo': 'HMO', 'chihuahua': 'CUU', 'culiacan': 'CUL', 'mazatlan': 'MZT',
  'acapulco': 'ACA', 'veracruz': 'VER', 'villahermosa': 'VSA', 'tuxtla': 'TGZ',
  'san luis potosi': 'SLP', 'aguascalientes': 'AGU', 'morelia': 'MLM', 'zacatecas': 'ZCL',
  'durango': 'DGO', 'torreon': 'TRC', 'ciudad victoria': 'CVM', 'pachuca': 'PCA',
  'campeche': 'CPE', 'chetumal': 'CTM', 'colima': 'CLQ', 'ensenada': 'ESE',
  'huatulco': 'HUX', 'irapuato': 'SJD', 'la paz': 'LAP', 'los mochis': 'LMM',
  'manzanillo': 'ZLO', 'minatitlan': 'MTT', 'nogales': 'NOG', 'nuevo laredo': 'NLD',
  'poza rica': 'PAZ', 'progreso': 'PBC', 'saltillo': 'SLW', 'tampico': 'TAM',
  'tapachula': 'TAP', 'tehuacan': 'PBC', 'tepic': 'TPQ', 'tlaxcala': 'TXA',
  'toluca': 'TLC', 'tula': 'CVM', 'tulancingo': 'PBC', 'tuxpan': 'PAZ',
  'umatlan': 'VER', 'zacatepec': 'PBC', 'zapopan': 'GDL', 'zinacantepec': 'TLC',
  // USA
  'new york': 'NYC', 'los angeles': 'LAX', 'chicago': 'CHI', 'miami': 'MIA',
  'houston': 'HOU', 'dallas': 'DFW', 'atlanta': 'ATL', 'seattle': 'SEA',
  'denver': 'DEN', 'boston': 'BOS', 'san francisco': 'SFO', 'las vegas': 'LAS',
  'orlando': 'MCO', 'phoenix': 'PHX', 'detroit': 'DTW', 'minneapolis': 'MSP',
  'philadelphia': 'PHL', 'san diego': 'SAN', 'tampa': 'TPA', 'portland': 'PDX',
  'honolulu': 'HNL', 'anchorage': 'ANC', 'salt lake city': 'SLC', 'kansas city': 'MCI',
  'nashville': 'BNA', 'new orleans': 'MSY', 'cleveland': 'CLE', 'cincinnati': 'CVG',
  'pittsburgh': 'PIT', 'indianapolis': 'IND', 'columbus': 'CMH', 'charlotte': 'CLT',
  'raleigh': 'RDU', 'jacksonville': 'JAX', 'milwaukee': 'MKE', 'oklahoma city': 'OKC',
  'memphis': 'MEM', 'louisville': 'SDF', 'richmond': 'RIC', 'bufalo': 'BUF',
  'hartford': 'BDL', 'albuquerque': 'ABQ', 'tucson': 'TUS', 'el paso': 'ELP',
  'omaha': 'OMA', 'wichita': 'ICT', 'des moines': 'DSM', 'little rock': 'LIT',
  'birmingham': 'BHM', 'charleston': 'CHS', 'savannah': 'SAV', 'lexington': 'LEX',
  'reno': 'RNO', 'boise': 'BOI', 'spokane': 'GEG', 'santa barbara': 'SBA',
  'monterey': 'MRY', 'sacramento': 'SMF', 'fresno': 'FAT', 'bakersfield': 'BFL',
  'stockton': 'SCK', 'modesto': 'MOD', 'oxnard': 'OXR', 'santa maria': 'SMX',
  'eugene': 'EUG', 'salem': 'SLE', 'redding': 'RDD', 'chico': 'CIC',
  'truckee': 'TRK', 'lake tahoe': 'TVL', 'south lake tahoe': 'TVL',
  // Europe
  'madrid': 'MAD', 'barcelona': 'BCN', 'paris': 'CDG', 'london': 'LHR', 'rome': 'FCO',
  'amsterdam': 'AMS', 'berlin': 'BER', 'lisbon': 'LIS', 'vienna': 'VIE',
  'zurich': 'ZRH', 'brussels': 'BRU', 'munich': 'MUC', 'milan': 'MXP',
  'prague': 'PRG', 'budapest': 'BUD', 'warsaw': 'WAW', 'athens': 'ATH',
  'istanbul': 'IST', 'dublin': 'DUB', 'copenhagen': 'CPH', 'oslo': 'OSL',
  'stockholm': 'ARN', 'helsinki': 'HEL', 'porto': 'OPO', 'seville': 'SVQ',
  'valencia': 'VLC', 'bilbao': 'BIO', 'malaga': 'AGP', 'palma': 'PMI',
  'ibiza': 'IBZ', 'menorca': 'MAH', 'tenerife': 'TFS', 'las palmas': 'LPA',
  'funchal': 'FNC', 'santorini': 'JTR', 'mykonos': 'JMK', 'nice': 'NCE',
  'marseille': 'MRS', 'lyon': 'LYS', 'toulouse': 'TLS', 'bordeaux': 'BOD',
  'cologne': 'CGN', 'hamburg': 'HAM', 'frankfurt': 'FRA', 'stuttgart': 'STR',
  'naples': 'NAP', 'venice': 'VCE', 'florence': 'FLR', 'bologna': 'BLQ',
  'turin': 'TRN', 'genoa': 'GOA', 'catania': 'CTA', 'palermo': 'PMO',
  // South America
  'buenos aros': 'EZE', 'rio de janeiro': 'GIG', 'sao paulo': 'GRU',
  'lima': 'LIM', 'bogota': 'BOG', 'santiago': 'SCL', 'caracas': 'CCS',
  'quito': 'UIO', 'guayaquil': 'GYE', 'la paz bolivia': 'LPB', 'asuncion': 'ASU',
  'montevideo': 'MVD', 'brasilia': 'BSB', 'salvador': 'SSA', 'recife': 'REC',
  'fortaleza': 'FOR', 'belo horizonte': 'CNF', 'curitiba': 'CWB',
  'porto alegra': 'POA', 'manaus': 'MAO', 'goiania': 'GYN',
  'campinas': 'CPQ', 'ribeirao preto': 'RAO', 'uberlandia': 'UDI',
  // Asia
  'tokyo': 'NRT', 'osaka': 'KIX', 'seoul': 'ICN', 'beijing': 'PEK',
  'shanghai': 'PVG', 'hong kong': 'HKG', 'singapore': 'SIN', 'bangkok': 'BKK',
  'dubai': 'DXB', 'mumbai': 'BOM', 'delhi': 'DEL', 'kuala lumpur': 'KUL',
  'jakarta': 'CGK', 'manila': 'MNL', 'taiwan': 'TPE', 'ho chi minh': 'SGN',
  'hanoi': 'HAN', 'phuket': 'HKT', 'bali': 'DPE', 'cmb': 'CMB',
  // Canada
  'toronto': 'YYZ', 'vancouver': 'YVR', 'montreal': 'YUL', 'calgary': 'YYC',
  'edmonton': 'YEG', 'ottawa': 'YOW', 'winnipeg': 'YWG', 'quebec': 'YQB',
  // Other
  'moscow': 'SVO', 'cairo': 'CAI', 'johannesburg': 'JNB',
  'nairobi': 'NBO', 'casablanca': 'CMN', 'tunis': 'TUN', 'algiers': 'ALG',
  'accra': 'ACC', 'addis ababa': 'ABE', 'dar es salaam': 'DAR', 'kampala': 'LAE',
  'auckland': 'AKL', 'sydney': 'SYD', 'melbourne': 'MEL', 'brisbane': 'BNE',
  'perth': 'PER', 'adelaide': 'ADL', 'christchurch': 'CHC', 'fiji': 'NAN',
  'tahiti': 'PPT', 'hawaii': 'HNL',
}

function cityToIATA(city: string): string {
  const lower = city.toLowerCase().trim()
  if (CITY_TO_IATA[lower]) return CITY_TO_IATA[lower]
  // If already a 3-letter code, return uppercase
  if (/^[a-zA-Z]{3}$/.test(lower)) return lower.toUpperCase()
  // Return as-is for the API to handle
  return city
}

// ─── BING TRAVEL SEARCH ────────────────────────────────────
async function searchBingFlights(params: SearchParams): Promise<FlightResult[]> {
  const from = cityToIATA(params.from)
  const to = cityToIATA(params.to)
  const date = params.departDate.replace(/-/g, '')
  const adults = params.adults || 1
  const currency = params.currency || 'USD'
  
  const url = `https://www.bing.com/travel/flights/search?from=${encodeURIComponent(params.from)}&to=${encodeURIComponent(params.to)}&depart=${date}&adults=${adults}&child=0&infant=0&cabin=economy&currency=${currency}`
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Referer': 'https://www.bing.com/travel/flights',
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!res.ok) {
      console.warn(`Bing Travel: HTTP ${res.status}`)
      return []
    }
    
    const html = await res.text()
    return parseBingResults(html, from, to)
  } catch (e) {
    console.warn(`Bing Travel failed: ${e}`)
    return []
  }
}

function parseBingResults(html: string, from: string, to: string): FlightResult[] {
  const results: FlightResult[] = []
  
  // Bing embeds flight data in JSON within script tags
  try {
    // Look for the flight data JSON
    const jsonMatch = html.match(/"flights"?\s*:\s*(\[[\s\S]*?\])/i)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1])
      // Parse the flight results from JSON
      if (Array.isArray(data)) {
        for (const flight of data.slice(0, 10)) {
          results.push({
            airline: flight.airline || flight.carrier || 'Unknown',
            from: flight.origin || from,
            to: flight.destination || to,
            departureTime: flight.departureTime || flight.departTime || '',
            arrivalTime: flight.arrivalTime || flight.arriveTime || '',
            duration: flight.duration || flight.flightDuration || '',
            stops: flight.stops || flight.stopCount || 0,
            price: parseFloat(flight.price || flight.totalPrice || flight.amount || '0'),
            currency: flight.currency || 'USD',
            source: 'bing',
            stars: 0, // Calculated later
            deepLink: `https://www.bing.com/travel/flights?from=${from}&to=${to}`,
          })
        }
      }
    }
  } catch {
    // Fallback: try regex extraction
  }
  
  return results
}

// ─── SKYSCANNER SEARCH ─────────────────────────────────────
async function searchSkyscanner(params: SearchParams): Promise<FlightResult[]> {
  const from = cityToIATA(params.from)
  const to = cityToIATA(params.to)
  const date = params.departDate.replace(/-/g, '')
  
  // Skyscanner uses a different date format: YYYYMMDD
  const skyscannerDate = date
  
  const url = `https://www.skyscanner.com/transport/flights/${from.toLowerCase()}/${to.toLowerCase()}/${skyscannerDate}/?adults=${params.adults || 1}&adultsv2=${params.adults || 1}&cabinclass=economy&children=0&inboundaltsen498=false&infants=0&outboundaltsenabled=false&preferdirects=false&ref=home&rtn=0`
  
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'X-Skyscanner-ChannelId': 'website',
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!res.ok) {
      console.warn(`Skyscanner: HTTP ${res.status}`)
      return []
    }
    
    const html = await res.text()
    return parseSkyscannerResults(html, from, to)
  } catch (e) {
    console.warn(`Skyscanner failed: ${e}`)
    return []
  }
}

function parseSkyscannerResults(html: string, from: string, to: string): FlightResult[] {
  const results: FlightResult[] = []
  
  try {
    // Skyscanner embeds data in window.__INITIAL_STATE__ or similar
    const jsonMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\});/i)
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1])
      const quotes = data?.quotes?.data || data?.results?.quotes || []
      for (const q of quotes.slice(0, 10)) {
        results.push({
          airline: q?.outboundLeg?.carriers?.[0]?.name || q?.airline || 'Unknown',
          from: q?.outboundLeg?.origin?.displayCode || from,
          to: q?.outboundLeg?.destination?.displayCode || to,
          departureTime: q?.outboundLeg?.departure || '',
          arrivalTime: q?.outboundLeg?.arrival || '',
          duration: q?.outboundLeg?.duration || '',
          stops: q?.outboundLeg?.stopCount || 0,
          price: q?.price?.amount || q?.minPrice || 0,
          currency: q?.price?.currency || 'USD',
          source: 'skyscanner',
          stars: 0,
          deepLink: `https://www.skyscanner.com/transport/flights/${from}/${to}/`,
        })
      }
    }
  } catch {
    // Fallback
  }
  
  return results
}

// ─── GOOGLE TRAVEL SEARCH ───────────────────────────────────
async function searchGoogleFlights(params: SearchParams): Promise<FlightResult[]> {
  // Google Travel is harder to scrape, use their internal API
  const from = cityToIATA(params.from)
  const to = cityToIATA(params.to)
  
  try {
    // Google Flights API-like endpoint
    const url = `https://www.google.com/travel/flights/search?tfs=CBwQAhooagcIARID${from.toUpperCase()}CgcIARID${to.toUpperCase()}cAGCAQsI____________AUAB&curr=${params.currency || 'USD'}`
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    })
    
    if (!res.ok) return []
    
    const html = await res.text()
    return parseGoogleResults(html, from, to)
  } catch (e) {
    console.warn(`Google Flights failed: ${e}`)
    return []
  }
}

function parseGoogleResults(html: string, from: string, to: string): FlightResult[] {
  const results: FlightResult[] = []
  
  try {
    // Google embeds flight data in JSON-LD or embedded scripts
    const jsonMatches = html.matchAll(/"price":\s*(\d+).*?"airline":\s*"([^"]+)".*?"departure":\s*"([^"]+)".*?"arrival":\s*"([^"]+)"/g)
    for (const match of jsonMatches) {
      results.push({
        airline: match[2] || 'Unknown',
        from, to,
        departureTime: match[3] || '',
        arrivalTime: match[4] || '',
        duration: '',
        stops: 0,
        price: parseFloat(match[1]) || 0,
        currency: 'USD',
        source: 'google',
        stars: 0,
        deepLink: `https://www.google.com/travel/flights/search?tfs=CBwQAhopagcIARID${from}CgcIARID${to}cAGCAQsI____________AUAB`,
      })
    }
  } catch {}
  
  return results
}

// ─── STAR RATING CALCULATION ───────────────────────────────
function calculateStars(allFlights: FlightResult[]): FlightResult[] {
  if (allFlights.length === 0) return []
  
  const prices = allFlights.map(f => f.price).filter(p => p > 0).sort((a, b) => a - b)
  if (prices.length === 0) return allFlights
  
  const min = prices[0]
  const max = prices[prices.length - 1]
  const range = max - min || 1
  
  return allFlights.map(f => {
    if (f.price <= 0) return { ...f, stars: 1 }
    // Cheaper = more stars
    const normalized = 1 - ((f.price - min) / range)
    const stars = Math.max(1, Math.min(5, Math.round(normalized * 4 + 1)))
    return { ...f, stars }
  }).sort((a, b) => b.stars - a.stars || a.price - b.price)
}

// ─── MAIN EXPORT ──────────────────────────────────────────
export async function searchAllFlights(params: SearchParams): Promise<{
  flights: FlightResult[]
  meta: { total: number; sources: string[]; cheapest: number; best: number }
}> {
  const [bing, skyscanner, google] = await Promise.allSettled([
    searchBingFlights(params),
    searchSkyscanner(params),
    searchGoogleFlights(params),
  ])
  
  const allFlights: FlightResult[] = []
  const sources: string[] = []
  
  if (bing.status === 'fulfilled' && bing.value.length > 0) {
    allFlights.push(...bing.value)
    sources.push('bing')
  }
  if (skyscanner.status === 'fulfilled' && skyscanner.value.length > 0) {
    allFlights.push(...skyscanner.value)
    sources.push('skyscanner')
  }
  if (google.status === 'fulfilled' && google.value.length > 0) {
    allFlights.push(...google.value)
    sources.push('google')
  }
  
  const rated = calculateStars(allFlights)
  const validPrices = rated.map(f => f.price).filter(p => p > 0)
  
  return {
    flights: rated,
    meta: {
      total: rated.length,
      sources,
      cheapest: validPrices.length > 0 ? Math.min(...validPrices) : 0,
      best: validPrices.length > 0 ? Math.max(...validPrices) : 0,
    },
  }
}

export { cityToIATA }
