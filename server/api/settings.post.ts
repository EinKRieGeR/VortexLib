import { getDrizzle } from '../utils/db'
import { appSettings } from '../utils/schema'
import { eq } from 'drizzle-orm'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const db = getDrizzle()
  
  if (body.libraryPath !== undefined) {
    await db.update(appSettings)
      .set({ libraryPath: body.libraryPath })
      .where(eq(appSettings.id, 1))
  }
  
  return { success: true }
})
