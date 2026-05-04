import { writeFile, unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { randomUUID } from 'node:crypto'
import { updateSouvenir, getSouvenir, setSouvenirCoords } from '../../utils/db'
import { uploadsDir } from '../../utils/storage'
import { geocode } from '../../utils/geocode'

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  if (!getSouvenir(id)) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const parts = await readMultipartFormData(event)
  if (!parts) throw createError({ statusCode: 400, statusMessage: 'No data' })

  const fields: Record<string, string> = {}
  const keepPhotos: string[] = []
  const newPhotos: string[] = []

  for (const part of parts) {
    if (part.name === 'photos' && part.filename) {
      const type = part.type || 'image/jpeg'
      if (!ALLOWED.has(type)) continue
      const ext = (part.filename.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '')
      const name = `${Date.now()}-${randomUUID()}.${ext}`
      await writeFile(resolve(uploadsDir, name), part.data)
      newPhotos.push(`/uploads/${name}`)
    } else if (part.name === 'keepPhotos' && !part.filename) {
      keepPhotos.push(part.data.toString('utf8'))
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
  if (keepPhotos.length + newPhotos.length === 0) {
    for (const p of newPhotos) {
      try { await unlink(resolve(uploadsDir, p.replace('/uploads/', ''))) } catch {}
    }
    throw createError({ statusCode: 400, statusMessage: 'Au moins une photo' })
  }

  const previous = getSouvenir(id)
  const { souvenir, removedPhotos } = updateSouvenir(id, { title, emoji, date, lieu, keepPhotos, newPhotos })

  for (const p of removedPhotos) {
    if (!p.startsWith('/uploads/')) continue
    const file = resolve(uploadsDir, p.replace('/uploads/', ''))
    try { await unlink(file) } catch {}
  }

  if (souvenir) {
    if (!lieu) {
      if (souvenir.lat != null || souvenir.lng != null) {
        setSouvenirCoords(id, null, null)
        souvenir.lat = null
        souvenir.lng = null
      }
    } else if (lieu !== previous?.lieu || souvenir.lat == null || souvenir.lng == null) {
      const point = await geocode(lieu)
      if (point) {
        setSouvenirCoords(id, point.lat, point.lng)
        souvenir.lat = point.lat
        souvenir.lng = point.lng
      }
    }
  }

  return souvenir
})
