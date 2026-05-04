import Database from 'better-sqlite3'
import { mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const dataDir = resolve(process.env.DATA_DIR || resolve(process.cwd(), 'data'))
if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true })

let _db: Database.Database | null = null

function hasColumn(db: Database.Database, table: string, col: string) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as any[]
  return rows.some(r => r.name === col)
}

export function useDb() {
  if (_db) return _db
  const db = new Database(resolve(dataDir, 'app.db'))
  db.pragma('journal_mode = WAL')
  db.exec(`
    CREATE TABLE IF NOT EXISTS souvenirs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      emoji TEXT NOT NULL DEFAULT '💖',
      date TEXT NOT NULL,
      lieu TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      souvenir_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      FOREIGN KEY (souvenir_id) REFERENCES souvenirs(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_photos_souvenir ON photos(souvenir_id);
    CREATE INDEX IF NOT EXISTS idx_souvenirs_date ON souvenirs(date);
  `)
  if (!hasColumn(db, 'souvenirs', 'lieu')) {
    db.exec('ALTER TABLE souvenirs ADD COLUMN lieu TEXT')
  }
  _db = db
  return db
}

export type Souvenir = {
  id: number
  title: string
  emoji: string
  date: string
  lieu: string | null
  created_at: string
  photos: string[]
}

export function listSouvenirs(limit?: number, offset = 0): Souvenir[] {
  const db = useDb()
  const sql = limit != null
    ? 'SELECT * FROM souvenirs ORDER BY date DESC, id DESC LIMIT ? OFFSET ?'
    : 'SELECT * FROM souvenirs ORDER BY date DESC, id DESC'
  const rows = (limit != null
    ? db.prepare(sql).all(limit, offset)
    : db.prepare(sql).all()) as any[]
  const photoStmt = db.prepare('SELECT path FROM photos WHERE souvenir_id = ?')
  return rows.map(r => ({ ...r, photos: (photoStmt.all(r.id) as any[]).map(p => p.path) }))
}

export function countSouvenirs(): number {
  const db = useDb()
  return (db.prepare('SELECT COUNT(*) as c FROM souvenirs').get() as any).c
}

export function getSouvenir(id: number): Souvenir | null {
  const db = useDb()
  const row = db.prepare('SELECT * FROM souvenirs WHERE id = ?').get(id) as any
  if (!row) return null
  const photos = (db.prepare('SELECT path FROM photos WHERE souvenir_id = ?').all(id) as any[]).map(p => p.path)
  return { ...row, photos }
}

export function createSouvenir(data: { title: string; emoji: string; date: string; lieu: string | null; photos: string[] }): Souvenir {
  const db = useDb()
  const tx = db.transaction(() => {
    const info = db.prepare('INSERT INTO souvenirs (title, emoji, date, lieu) VALUES (?, ?, ?, ?)')
      .run(data.title, data.emoji, data.date, data.lieu)
    const id = info.lastInsertRowid as number
    const photoStmt = db.prepare('INSERT INTO photos (souvenir_id, path) VALUES (?, ?)')
    for (const p of data.photos) photoStmt.run(id, p)
    return id
  })
  const id = tx()
  return getSouvenir(id)!
}

export function updateSouvenir(
  id: number,
  data: { title: string; emoji: string; date: string; lieu: string | null; keepPhotos: string[]; newPhotos: string[] }
): { souvenir: Souvenir | null; removedPhotos: string[] } {
  const db = useDb()
  const tx = db.transaction(() => {
    const existing = (db.prepare('SELECT path FROM photos WHERE souvenir_id = ?').all(id) as any[]).map(r => r.path)
    const keep = new Set(data.keepPhotos)
    const removed = existing.filter(p => !keep.has(p))

    db.prepare('UPDATE souvenirs SET title = ?, emoji = ?, date = ?, lieu = ? WHERE id = ?')
      .run(data.title, data.emoji, data.date, data.lieu, id)

    if (removed.length) {
      const del = db.prepare('DELETE FROM photos WHERE souvenir_id = ? AND path = ?')
      for (const p of removed) del.run(id, p)
    }

    const ins = db.prepare('INSERT INTO photos (souvenir_id, path) VALUES (?, ?)')
    for (const p of data.newPhotos) ins.run(id, p)

    return removed
  })
  const removedPhotos = tx()
  return { souvenir: getSouvenir(id), removedPhotos }
}

export function getRandomPhoto(): string | null {
  const db = useDb()
  const row = db.prepare('SELECT path FROM photos ORDER BY RANDOM() LIMIT 1').get() as any
  return row?.path ?? null
}
