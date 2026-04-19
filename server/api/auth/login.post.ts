import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event)
    const { username, password } = body

    if (!username || !password) {
      throw createError({ statusCode: 400, message: 'Введите логин и пароль' })
    }

    const db = getDb()
    const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username) as any

    if (!user) {
      throw createError({ statusCode: 401, message: 'Пользователь не найден' })
    }

    let isCorrect = false
    try {
      isCorrect = await verifyPassword(user.password_hash, password)
    } catch (e: any) {
      throw createError({
        statusCode: 401,
        message: 'Старый аккаунт. Пожалуйста, зарегистрируйтесь заново.'
      })
    }

    if (!isCorrect) {
      throw createError({ statusCode: 401, message: 'Неверный пароль' })
    }

    await setUserSession(event, {
      user: { id: user.id, username: user.username, role: user.role },
    })

    return { user: { id: user.id, username: user.username, role: user.role } }
  } catch (error: any) {
    if (error.statusCode) throw error
    throw createError({ statusCode: 500, message: 'Ошибка сервера: ' + error.message })
  }
})
