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
      lat REAL,
      lng REAL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      souvenir_id INTEGER NOT NULL,
      path TEXT NOT NULL,
      FOREIGN KEY (souvenir_id) REFERENCES souvenirs(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS geocode_cache (
      query TEXT PRIMARY KEY,
      lat REAL,
      lng REAL,
      fetched_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_photos_souvenir ON photos(souvenir_id);
    CREATE INDEX IF NOT EXISTS idx_souvenirs_date ON souvenirs(date);
  `)
  if (!hasColumn(db, 'souvenirs', 'lieu')) {
    db.exec('ALTER TABLE souvenirs ADD COLUMN lieu TEXT')
  }
  if (!hasColumn(db, 'souvenirs', 'lat')) {
    db.exec('ALTER TABLE souvenirs ADD COLUMN lat REAL')
  }
  if (!hasColumn(db, 'souvenirs', 'lng')) {
    db.exec('ALTER TABLE souvenirs ADD COLUMN lng REAL')
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
  lat: number | null
  lng: number | null
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

export function setSouvenirCoords(id: number, lat: number | null, lng: number | null) {
  const db = useDb()
  db.prepare('UPDATE souvenirs SET lat = ?, lng = ? WHERE id = ?').run(lat, lng, id)
}

export type GeoSouvenir = {
  id: number
  title: string
  emoji: string
  date: string
  lieu: string
  lat: number
  lng: number
  cover: string | null
}

export function listGeoSouvenirs(): GeoSouvenir[] {
  const db = useDb()
  const rows = db.prepare(`
    SELECT s.id, s.title, s.emoji, s.date, s.lieu, s.lat, s.lng,
      (SELECT path FROM photos WHERE souvenir_id = s.id ORDER BY id ASC LIMIT 1) AS cover
    FROM souvenirs s
    WHERE s.lat IS NOT NULL AND s.lng IS NOT NULL
    ORDER BY s.date DESC, s.id DESC
  `).all() as any[]
  return rows
}

export function listSouvenirsNeedingGeocode(): { id: number; lieu: string }[] {
  const db = useDb()
  return db.prepare(`
    SELECT id, lieu FROM souvenirs
    WHERE lieu IS NOT NULL AND TRIM(lieu) <> '' AND (lat IS NULL OR lng IS NULL)
  `).all() as any[]
}

export function getGeocodeCache(query: string): { lat: number; lng: number } | null {
  const db = useDb()
  const row = db.prepare('SELECT lat, lng FROM geocode_cache WHERE query = ?').get(query) as any
  if (!row || row.lat == null || row.lng == null) return null
  return { lat: row.lat, lng: row.lng }
}

export function setGeocodeCache(query: string, lat: number | null, lng: number | null) {
  const db = useDb()
  db.prepare(`
    INSERT INTO geocode_cache (query, lat, lng) VALUES (?, ?, ?)
    ON CONFLICT(query) DO UPDATE SET lat = excluded.lat, lng = excluded.lng, fetched_at = datetime('now')
  `).run(query, lat, lng)
}
