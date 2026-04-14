import { importInpx } from '../utils/inpx-parser'
import { BackgroundState } from '../utils/state'

export default defineTask({
  meta: {
    name: 'library:import',
    description: 'Runs the INPX parsing and database generation in the background queue'
  },
  async run({ payload }) {
    const { inpxPath, chunkSize } = payload as { inpxPath: string; chunkSize?: number }
    
    BackgroundState.importInProgress = true
    BackgroundState.importProgress = { message: 'Запуск фонового воркера...', progress: 0 }
    
    try {
      const result = await importInpx(inpxPath, chunkSize || 5000, (msg, progress) => {
        BackgroundState.importProgress = { message: msg, progress }
      })
      BackgroundState.importProgress = { message: `Импорт завершён: ${result.imported} книг`, progress: 100 }
    } catch (error: any) {
      console.error('Task error:', error)
      BackgroundState.importProgress = { message: `Ошибка: ${error.message}`, progress: -1 }
    } finally {
      BackgroundState.importInProgress = false
    }

    return { result: 'Success' }
  }
})
