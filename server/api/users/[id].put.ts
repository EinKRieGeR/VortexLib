import { getDb } from '../../utils/db'
import { requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const id = parseInt(getRouterParam(event, 'id') as string)
  if (!id) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const body = await readBody(event)
  const { role, username, password } = body

  const db = getDb()

  if (role) {
    const ALLOWED_ROLES = ['admin', 'user']
    if (!ALLOWED_ROLES.includes(role)) {
      throw createError({ statusCode: 400, message: 'Недопустимая роль' })
    }
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, id)
  }

  if (username) {
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id)
    if (existing) {
      throw createError({ statusCode: 409, message: 'Этот логин уже занят другим пользователем' })
    }
    db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, id)
  }

  if (password) {
    if (password.length < 4) {
      throw createError({ statusCode: 400, message: 'Пароль слишком короткий (минимум 4 символа)' })
    }
    const pwHash = await hashPassword(password)
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(pwHash, id)
  }

  return { success: true }
})
