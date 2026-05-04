import { createReadStream, statSync, existsSync } from 'node:fs'
import { resolve, extname } from 'node:path'
import { uploadsDir } from '../../utils/storage'

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.heic': 'image/heic',
  '.heif': 'image/heif'
}

export default defineEventHandler((event) => {
  const rel = (getRouterParam(event, 'path') || '').replace(/\\/g, '/')
  if (!rel || rel.includes('..')) throw createError({ statusCode: 400 })

  const filePath = resolve(uploadsDir, rel)
  if (!filePath.startsWith(uploadsDir)) throw createError({ statusCode: 400 })
  if (!existsSync(filePath)) throw createError({ statusCode: 404 })

  const stat = statSync(filePath)
  if (!stat.isFile()) throw createError({ statusCode: 404 })

  const ext = extname(filePath).toLowerCase()
  setHeader(event, 'Content-Type', MIME[ext] || 'application/octet-stream')
  setHeader(event, 'Content-Length', stat.size)
  setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
  return sendStream(event, createReadStream(filePath))
})
