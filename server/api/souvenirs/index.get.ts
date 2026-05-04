import { listSouvenirs, countSouvenirs } from '../../utils/db'

export default defineEventHandler((event) => {
  const q = getQuery(event)
  const limit = q.limit != null ? Math.min(100, Math.max(1, Number(q.limit))) : undefined
  const offset = q.offset != null ? Math.max(0, Number(q.offset)) : 0
  const items = listSouvenirs(limit, offset)
  return {
    items,
    total: countSouvenirs(),
    nextOffset: limit != null ? offset + items.length : null
  }
})
