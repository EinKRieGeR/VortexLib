import { getDrizzle } from '../utils/db'
import { appSettings } from '../utils/schema'

export default defineEventHandler(async () => {
  const db = getDrizzle()
  const [settings] = await db.select().from(appSettings)
  
  if (!settings) {
    return { libraryPath: '/mnt/raid0/downloads/fb2.Flibusta.Net' }
  }
  
  return {
    libraryPath: settings.libraryPath
  }
})
