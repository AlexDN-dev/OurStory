import { unlink } from 'node:fs/promises'
import { resolve } from 'node:path'
import { useDb, getSouvenir } from '../../utils/db'
import { uploadsDir } from '../../utils/storage'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })

  const souvenir = getSouvenir(id)
  if (!souvenir) throw createError({ statusCode: 404, statusMessage: 'Not found' })

  const db = useDb()
  db.prepare('DELETE FROM photos WHERE souvenir_id = ?').run(id)
  db.prepare('DELETE FROM souvenirs WHERE id = ?').run(id)

  for (const p of souvenir.photos) {
    if (!p.startsWith('/uploads/')) continue
    const file = resolve(uploadsDir, p.replace('/uploads/', ''))
    try { await unlink(file) } catch {}
  }

  return { ok: true }
})
