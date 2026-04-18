import { getDb, getLibraryPath } from '../../../utils/db'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync } from 'fs'
import { join } from 'path'

const execAsync = promisify(exec)

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid book ID' })
  }

  const db = getDb()
  const libraryPath = getLibraryPath()
  if (!libraryPath) {
    throw createError({ statusCode: 400, statusMessage: 'Library path not configured in settings.' })
  }

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any
  if (!book) {
    throw createError({ statusCode: 404, statusMessage: 'Book not found' })
  }
  const archivePath = join(libraryPath, book.folder || '', book.archive_name)
  if (!existsSync(archivePath)) {
    throw createError({ statusCode: 404, statusMessage: 'Archive not found: ' + book.archive_name })
  }
  const fileName = `${book.id}.${book.format}`

  try {
    let rawBuffer: Buffer
    try {
      const { stdout } = await execAsync(`unzip -p "${archivePath}" "${fileName}"`, {
        encoding: 'buffer' as any,
        maxBuffer: 50 * 1024 * 1024,
      })
      rawBuffer = stdout as unknown as Buffer
    } catch {
      throw createError({ statusCode: 500, statusMessage: 'Не удалось извлечь файл из архива' })
    }

    const { randomUUID } = await import('crypto')
    const fs = await import('fs/promises')
    const os = await import('os')
    
    const targetFormat = (getQuery(event).format as string) || book.format
    const doConvert = targetFormat.toLowerCase() !== book.format.toLowerCase()

    let fileData = rawBuffer
    
    if (doConvert) {
      const tmpDir = os.tmpdir()
      const baseName = randomUUID()
      const sourceFile = join(tmpDir, `${baseName}.${book.format}`)
      const targetFile = join(tmpDir, `${baseName}.${targetFormat}`)

      await fs.writeFile(sourceFile, rawBuffer)

      try {
        await execAsync(`ebook-convert "${sourceFile}" "${targetFile}"`, { maxBuffer: 50 * 1024 * 1024 })
        fileData = await fs.readFile(targetFile)
      } catch (convErr: any) {
        console.error('Conversion error:', convErr.message)
        throw createError({ statusCode: 500, statusMessage: 'Ошибка при конвертации файла: возможно не установлен Calibre' })
      } finally {
        await fs.unlink(sourceFile).catch(() => {})
        await fs.unlink(targetFile).catch(() => {})
      }
    }
    const authors = db.prepare(`
      SELECT a.last_name, a.first_name
      FROM authors a
      JOIN book_authors ba ON ba.author_id = a.id
      WHERE ba.book_id = ?
      LIMIT 1
    `).all(id) as any[]

    const authorName = authors.length > 0
      ? `${authors[0].last_name} ${authors[0].first_name || ''}`.trim()
      : 'Unknown'

    const cleanTitle = book.title.replace(/[/\\?%*:|"<>]/g, '_')
    const finalFormat = doConvert ? targetFormat : book.format
    const downloadName = `${authorName} - ${cleanTitle}.${finalFormat}`

    setResponseHeaders(event, {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
      'Content-Length': fileData.length.toString(),
    })

    return fileData
  } catch (e: any) {
    if (e.statusCode) throw e
    console.error('Download error:', e.message)
    throw createError({ statusCode: 500, statusMessage: 'Внутренняя ошибка сервера при скачивании' })
  }
})
