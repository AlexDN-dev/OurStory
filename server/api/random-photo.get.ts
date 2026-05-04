import { useDb } from '../utils/db'

export default defineEventHandler(() => {
  const db = useDb()
  const row = db.prepare(`
    SELECT p.path, s.id, s.title, s.emoji, s.date, s.lieu
    FROM photos p
    JOIN souvenirs s ON s.id = p.souvenir_id
    ORDER BY RANDOM() LIMIT 1
  `).get() as any
  if (!row) return { path: null, souvenir: null }
  return {
    path: row.path,
    souvenir: { id: row.id, title: row.title, emoji: row.emoji, date: row.date, lieu: row.lieu }
  }
})
