import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const sessionId = getCookie(event, 'vortex_session')
  if (!sessionId) {
    return { user: null }
  }

  const db = getDb()
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(sessionId) as any

  if (!session) {
    return { user: null }
  }

  const now = Math.floor(Date.now() / 1000)
  if (session.expires_at < now) {
    return { user: null }
  }

  const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(session.user_id) as any
  if (!user) {
    return { user: null }
  }

  return {
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    }
  }
})
