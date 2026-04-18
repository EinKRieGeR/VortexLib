import { getDb } from '../../utils/db'
import { hashPassword, requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const id = parseInt(getRouterParam(event, 'id') as string)
  if (!id) throw createError({ statusCode: 400, message: 'Invalid ID' })
  
  const body = await readBody(event)
  const { role, username, password } = body

  const db = getDb()
  
  if (role) {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  }
  
  if (username) {
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id)
  }

  if (password && password.length >= 4) {
    const pwHash = hashPassword(password)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(pwHash, id)
  }
  
  return { success: true }
})
