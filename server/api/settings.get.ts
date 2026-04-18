import { getDrizzle } from '../utils/db'
import { appSettings } from '../utils/schema'
import { requireRole } from '../utils/auth'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const db = getDrizzle()
  const [settings] = await db.select().from(appSettings)
  
  if (!settings) {
    return { libraryPath: '/mnt/raid0/downloads/fb2.Flibusta.Net' }
  }
  
  return {
    libraryPath: settings.libraryPath
  }
})
