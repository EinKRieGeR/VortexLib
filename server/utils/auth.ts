import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'
import { getDb } from './db'
import { getCookie, setCookie, deleteCookie, createError, type H3Event } from 'h3'

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64)
  return `${salt}:${derivedKey.toString('hex')}`
}

export function verifyPassword(password: string, hash: string): boolean {
  const [salt, key] = hash.split(':')
  if (!salt || !key) return false
  
  const keyBuffer = Buffer.from(key, 'hex')
  const derivedKey = scryptSync(password, salt, 64)
  
  try {
    return timingSafeEqual(keyBuffer, derivedKey)
  } catch {
    return false
  }
}

export function generateSessionId(): string {
  return randomBytes(32).toString('hex')
}

export function createSession(event: H3Event, userId: number) {
  const sessionId = generateSessionId()
  const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  
  const db = getDb()
  db.prepare('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)').run(sessionId, userId, expiresAt)
  
  setCookie(event, 'vortex_session', sessionId, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })
  
  return sessionId
}

export function removeVortexSession(event: H3Event) {
  const sessionId = getCookie(event, 'vortex_session')
  if (sessionId) {
    const db = getDb()
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
  }
  deleteCookie(event, 'vortex_session', { path: '/' })
}

export function requireUser(event: H3Event) {
  const sessionId = getCookie(event, 'vortex_session')
  if (!sessionId) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const db = getDb()
  const session = db.prepare('SELECT user_id, expires_at FROM sessions WHERE id = ?').get(sessionId) as any
  
  if (!session) {
    deleteCookie(event, 'vortex_session', { path: '/' })
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }
  
  const now = Math.floor(Date.now() / 1000)
  if (session.expires_at < now) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
    deleteCookie(event, 'vortex_session', { path: '/' })
    throw createError({ statusCode: 401, message: 'Session expired' })
  }
  
  const user = db.prepare('SELECT id, username, role FROM users WHERE id = ?').get(session.user_id) as any
  if (!user) {
    throw createError({ statusCode: 401, message: 'User not found' })
  }
  
  event.context.user = {
    id: user.id,
    username: user.username,
    role: user.role
  }
  
  return event.context.user
}

export function requireRole(event: H3Event, requiredRoles: string[]) {
  const user = requireUser(event)
  if (!requiredRoles.includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return user
}
