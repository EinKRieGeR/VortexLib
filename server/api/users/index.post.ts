import { getDb } from '../../utils/db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = await requireRole(event, ['admin'])
  const body = await readBody(event)
  const { username, password, role } = body

  if (!username || !password || !role) {
    throw createError({ statusCode: 400, message: 'Все поля обязательны' })
  }

  const ALLOWED_ROLES = ['admin', 'user']
  if (!ALLOWED_ROLES.includes(role)) {
    throw createError({ statusCode: 400, message: 'Недопустимая роль пользователя' })
  }

  const db = getDb()
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existingUser) {
    throw createError({ statusCode: 409, message: 'Этот логин уже занят' })
  }

  const pwHash = await hashPassword(password)
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, pwHash, role)

  return { success: true }
})
