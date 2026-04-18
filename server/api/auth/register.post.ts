import { getDb } from '../../utils/db'
import { hashPassword, createSession } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const { username, password } = body

  if (!username || !password || username.length < 3 || password.length < 4) {
    throw createError({ statusCode: 400, message: 'Invalid username or password' })
  }

  const db = getDb()
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any
  const isFirstUser = userCount.count === 0
  const role = isFirstUser ? 'admin' : 'user'

  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existingUser) {
    throw createError({ statusCode: 409, message: 'Username already exists' })
  }

  const pwHash = hashPassword(password)
  const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, pwHash, role)

  const userId = result.lastInsertRowid as number

  createSession(event, userId)

  return {
    user: {
      id: userId,
      username,
      role
    }
  }
})
