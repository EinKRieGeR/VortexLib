import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { username, password } = body

    if (!username || !password || username.length < 3 || password.length < 4) {
      throw createError({ statusCode: 400, message: 'Логин (мин. 3) или пароль (мин. 4) слишком короткие' })
    }

    const db = getDb()
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as any
    const isFirstUser = userCount.count === 0

    const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existingUser) {
      throw createError({ statusCode: 409, message: 'Этот логин уже занят' })
    }

    const role = isFirstUser ? 'admin' : 'user'
    const pwHash = await hashPassword(password)
    const result = db.prepare('INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)').run(username, pwHash, role)
    const userId = result.lastInsertRowid as number

    await setUserSession(event, {
      user: { id: userId, username, role },
    })

    return { user: { id: userId, username, role } }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Ошибка при регистрации: ' + (error.message || 'неизвестная ошибка') })
  }
})
