import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { createSouvenir, setSouvenirCoords } from '../../utils/db'
import { uploadsDir } from '../../utils/storage'
import { geocode } from '../../utils/geocode'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])

export default defineEventHandler(async (event) => {
  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'No data' })

  const fields: Record<string, string> = {}
  const photoPaths: string[] = []

  for (const part of parts) {
    if (part.name === 'photos' && part.filename) {
      const type = part.type || 'image/jpeg'
      if (!ALLOWED.has(type)) continue
      const ext = (part.filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const name = `${Date.now()}-${randomUUID()}.${ext}`
      await writeFile(resolve(uploadsDir, name), part.data)
      photoPaths.push(`/uploads/${name}`)
    } else if (part.name && !part.filename) {
      fields[part.name] = part.data.toString('utf8')
    }
  }

  const title = (fields.title || '').trim()
  const emoji = (fields.emoji || '💖').trim() || '💖'
  const date = (fields.date || '').trim()
  const lieu = (fields.lieu || '').trim() || null

  if (!title) throw createError({ statusCode: 400, statusMessage: 'Titre requis' })
  if (!date) throw createError({ statusCode: 400, statusMessage: 'Date requise' })
  if (photoPaths.length === 0) throw createError({ statusCode: 400, statusMessage: 'Au moins une photo' })

  const created = createSouvenir({ title, emoji, date, lieu, photos: photoPaths })

  if (lieu) {
    const point = await geocode(lieu)
    if (point) {
      setSouvenirCoords(created.id, point.lat, point.lng)
      created.lat = point.lat
      created.lng = point.lng
    }
  }

  return created
})
