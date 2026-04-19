import { type H3Event } from 'h3'

export async function requireRole(event: H3Event, requiredRoles: string[]) {
  const session = await requireUserSession(event)
  const user = session.user as { id: number; username: string; role: string }
  if (!requiredRoles.includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
  return user
}
