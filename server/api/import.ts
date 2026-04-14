import { BackgroundState } from '../utils/state'
import { clearDb, getDb, getLibraryPath } from '../utils/db'
import { existsSync } from 'fs'
import { join } from 'path'

export default defineEventHandler(async (event) => {
  const method = getMethod(event)
  const query = getQuery(event)

  if (method === 'GET') {
    const db = getDb()
    const status = db.prepare('SELECT * FROM import_status WHERE id = 1').get() as any
    return {
      inProgress: BackgroundState.importInProgress,
      progress: BackgroundState.importProgress,
      status: status || { status: 'not_imported', total_books: 0 },
    }
  }

  if (method === 'POST') {
    const action = (query.action as string) || 'import'

    if (BackgroundState.importInProgress) {
      return { error: 'Импорт уже выполняется', progress: BackgroundState.importProgress }
    }

    if (action === 'clear') {
      clearDb()
      return { success: true, message: 'Библиотека очищена' }
    }

    const libraryPath = getLibraryPath()
    if (!libraryPath) {
      throw createError({ statusCode: 400, message: 'Library path not configured in settings.' })
    }
    const inpxPath = join(libraryPath, 'flibusta_fb2_local.inpx')

    if (!existsSync(inpxPath)) {
      throw createError({ statusCode: 404, statusMessage: 'INPX файл не найден: ' + inpxPath })
    }

    const chunkSize = parseInt(query.chunkSize as string) || 5000
    runTask('library:import', { payload: { inpxPath, chunkSize } })

    return { started: true, message: 'Импорт запущен' }
  }
})
