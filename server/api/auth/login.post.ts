import { getDb } from '../../utils/db'
import { verifyPassword, createSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password) {
    throw createError({ statusCode: 400, message: 'username and password are required' })
  }

  const db = getDb()
  const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username) as any

  if (!user || !verifyPassword(password, user.password_hash)) {
    throw createError({ statusCode: 401, message: 'Invalid credentials' })
  }

  createSession(event, user.id)

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }
})
