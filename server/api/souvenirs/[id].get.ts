import { getSouvenir } from '../../utils/db'

export default defineEventHandler((event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isFinite(id)) throw createError({ statusCode: 400, statusMessage: 'Invalid id' })
  const souvenir = getSouvenir(id)
  if (!souvenir) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return souvenir
})
