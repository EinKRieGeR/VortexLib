import { getDb } from '../../utils/db'
import { hashPassword, requireRole } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const admin = requireRole(event, ['admin'])
  const body = await readBody(event)
  const { username, password, role } = body

  if (!username || !password || !role) {
    throw createError({ statusCode: 400, message: 'All fields are required' })
  }

  const db = getDb()
  const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
  if (existingUser) {
    throw createError({ statusCode: 409, message: 'Username already exists' })
  }

  const pwHash = hashPassword(password)
  db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, pwHash, role)
  
  return { success: true }
})
