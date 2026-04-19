import { getDb } from '../../utils/db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  
  const db = getDb()
  const users = db.prepare('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC').all() as any[]
  
  return users
})
