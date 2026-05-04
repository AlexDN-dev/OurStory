import { getGeocodeCache, setGeocodeCache } from './db'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = process.env.GEOCODE_USER_AGENT || 'YourStoryApp/1.0 (personal photo album)'

export type GeoPoint = { lat: number; lng: number }

export async function geocode(rawQuery: string): Promise<GeoPoint | null> {
  const query = rawQuery.trim().toLowerCase()
  if (!query) return null

  const cached = getGeocodeCache(query)
  if (cached) return cached

  try {
    const url = `${NOMINATIM_URL}?format=json&limit=1&q=${encodeURIComponent(query)}`
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, 'Accept-Language': 'fr,en' },
      signal: ctrl.signal
    }).finally(() => clearTimeout(timer))

    if (!res.ok) {
      setGeocodeCache(query, null, null)
      return null
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string }>
    if (!data.length) {
      setGeocodeCache(query, null, null)
      return null
    }
    const lat = parseFloat(data[0].lat)
    const lng = parseFloat(data[0].lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setGeocodeCache(query, null, null)
      return null
    }
    setGeocodeCache(query, lat, lng)
    return { lat, lng }
  } catch {
    return null
  }
}
