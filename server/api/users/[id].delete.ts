import { getDb } from '../../utils/db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const id = parseInt(getRouterParam(event, 'id') as string)

  if (!id) throw createError({ statusCode: 400, message: 'Invalid ID' })

  if (id === admin.id) {
    throw createError({ statusCode: 403, message: 'You cannot delete yourself' })
  }

  const db = getDb()
  db.prepare('DELETE FROM users WHERE id = ?').run(id)

  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id)

  return { success: true }
})
