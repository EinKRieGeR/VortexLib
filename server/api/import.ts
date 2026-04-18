import { clearDb, getDb, getLibraryPath } from '../utils/db'
import { existsSync } from 'fs'
import { requireRole } from '../utils/auth'
import {
  getImportInProgress,
  getImportProgress,
} from '../utils/state'

export default defineEventHandler(async (event) => {
  requireRole(event, ['admin'])
  const method = getMethod(event)
  const query = getQuery(event)

  if (method === 'GET') {
    const db = getDb()
    const status = db.prepare('SELECT * FROM import_status WHERE id = 1').get() as any

    const inProgress = await getImportInProgress()
    const progress = await getImportProgress()

    return {
      inProgress,
      progress,
      status: status || { status: 'not_imported', total_books: 0 },
    }
  }

  if (method === 'POST') {
    const action = (query.action as string) || 'import'

    const inProgress = await getImportInProgress()
    if (inProgress) {
      const progress = await getImportProgress()
      return { error: 'Импорт уже выполняется', progress }
    }

    if (action === 'clear') {
      clearDb()

      const cache = useStorage('cache')
      const cacheKeys = await cache.getKeys()
      await Promise.all(cacheKeys.map(k => cache.removeItem(k)))

      const mem = useStorage('memory')
      const memKeys = await mem.getKeys()
      await Promise.all(memKeys.map(k => mem.removeItem(k)))

      return { success: true, message: 'Библиотека полностью очищена' }
    }

    const libraryPath = getLibraryPath()
    if (!libraryPath) {
      throw createError({ statusCode: 400, message: 'Путь к библиотеке не настроен.' })
    }

    if (!existsSync(libraryPath)) {
      throw createError({ statusCode: 404, statusMessage: 'Папка библиотеки не найдена: ' + libraryPath })
    }

    const chunkSize = parseInt(query.chunkSize as string) || 5000
    runTask('library:import', { payload: { libraryPath, chunkSize } })

    return { started: true, message: 'Импорт запущен' }
  }
})
