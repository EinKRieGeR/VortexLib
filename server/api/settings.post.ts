import { getDrizzle } from '../utils/db'
import { appSettings } from '../utils/schema'
import { eq } from 'drizzle-orm'
import { requireRole } from '../utils/auth'

export default defineEventHandler(async (event) => {
  await requireRole(event, ['admin'])
  const body = await readBody(event)
  const db = getDrizzle()
  
  if (body.libraryPath !== undefined) {
    await db.insert(appSettings)
      .values({ id: 1, libraryPath: body.libraryPath })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { libraryPath: body.libraryPath }
      })
  }
  
  return { success: true }
})
