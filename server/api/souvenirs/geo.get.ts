import { listGeoSouvenirs, listSouvenirsNeedingGeocode, setSouvenirCoords } from '../../utils/db'
import { geocode } from '../../utils/geocode'

let backfillRunning = false

async function backfillMissing() {
  if (backfillRunning) return
  backfillRunning = true
  try {
    const missing = listSouvenirsNeedingGeocode()
    for (const row of missing) {
      const point = await geocode(row.lieu)
      if (point) setSouvenirCoords(row.id, point.lat, point.lng)
      // Nominatim usage policy: max 1 request/second
      await new Promise(r => setTimeout(r, 1100))
    }
  } finally {
    backfillRunning = false
  }
}

export default defineEventHandler(() => {
  // Fire-and-forget: trigger background geocoding for entries created before
  // this column existed. New entries are geocoded inline at create/update.
  backfillMissing().catch(() => {})
  return { items: listGeoSouvenirs() }
})
