import { Worker } from 'node:worker_threads'
import { resolve } from 'node:path'
import {
  setImportInProgress,
  setImportProgress,
} from '../utils/state'

export default defineTask({
  meta: {
    name: 'library:import',
    description: 'Runs INPX parsing in a dedicated Worker Thread to keep the server responsive'
  },
  async run({ payload }) {
    const { libraryPath, chunkSize } = payload as { libraryPath: string; chunkSize?: number }
    const config = useRuntimeConfig()

    await setImportInProgress(true)
    await setImportProgress({ message: 'Запуск рабочего потока...', progress: 0 })

    try {
      await runInWorker({
        libraryPath,
        chunkSize: chunkSize || 5000,
        dbPath: config.dbPath as string,
      })

      const cache = useStorage('cache')
      await cache.removeItem('library-stats')
      await cache.removeItem('nitro:handlers:genres-list:all.json')

    } catch (error: any) {
      console.error('[import task] Worker error:', error)
      await setImportProgress({ message: `Ошибка: ${error.message}`, progress: -1 })
    } finally {
      await setImportInProgress(false)
    }

    return { result: 'ok' }
  }
})

/**
 * Spawns the import worker and resolves when it finishes.
 * Progress messages from the worker are forwarded to Nitro Storage.
 */
function runInWorker(workerData: Record<string, unknown>): Promise<void> {
  return new Promise((resolve_p, reject) => {
    const workerPath = resolve(process.cwd(), 'server/workers/import.worker.mjs')

    const worker = new Worker(workerPath, { workerData })

    worker.on('message', async (msg: { type: string; message?: string; progress?: number; imported?: number }) => {
      if (msg.type === 'progress') {
        await setImportProgress({
          message: msg.message ?? '',
          progress: msg.progress ?? 0,
        })
      } else if (msg.type === 'done') {
        await setImportProgress({
          message: `Импорт завершён: ${(msg.imported ?? 0).toLocaleString('ru')} книг`,
          progress: 100,
        })
      } else if (msg.type === 'error') {
        reject(new Error(msg.message))
      }
    })

    worker.on('error', reject)

    worker.on('exit', (code) => {
      if (code === 0) resolve_p()
      else reject(new Error(`Worker завершился с кодом ${code}`))
    })
  })
}
