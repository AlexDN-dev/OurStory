import { mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

export const uploadsDir = resolve(
  process.env.UPLOADS_DIR || resolve(process.cwd(), 'uploads-data')
)

if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })
