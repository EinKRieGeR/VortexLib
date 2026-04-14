import { createReadStream } from 'fs'
import { createInterface } from 'readline'
import { createUnzip } from 'zlib'
import { Writable, PassThrough } from 'stream'
import { exec } from 'child_process'
import { promisify } from 'util'
import { existsSync, mkdirSync, createWriteStream, readFileSync } from 'fs'
import { join, basename } from 'path'
import { getDb } from './db'
import { getGenreName } from './genres'

const execAsync = promisify(exec)

interface ParsedBook {
  authors: Array<{ lastName: string; firstName: string; middleName: string }>
  genres: string[]
  title: string
  series: string
  seriesNum: number
  bookId: number
  fileSize: number
  libId: number
  deleted: boolean
  format: string
  dateAdded: string
  lang: string
  keywords: string
  archiveName: string
}

function parseLine(line: string, archiveName: string): ParsedBook | null {
  const fields = line.split('\x04')
  if (fields.length < 12) return null

  const authorStr = fields[0] || ''
  const genreStr = fields[1] || ''
  const title = fields[2] || ''
  const series = fields[3] || ''
  const seriesNum = parseInt(fields[4] || '') || 0
  const bookId = parseInt(fields[5] || '') || 0
  const fileSize = parseInt(fields[6] || '') || 0
  const libId = parseInt(fields[7] || '') || 0
  const deleted = fields[8] === '1'
  const format = fields[9] || 'fb2'
  const dateAdded = fields[10] || ''
  const lang = fields[11] || 'ru'
  const keywords = fields[12] || ''

  if (!title || !bookId) return null
  const authors = authorStr.split(':').filter(Boolean).map(a => {
    const parts = a.split(',')
    return {
      lastName: (parts[0] || '').trim(),
      firstName: (parts[1] || '').trim(),
      middleName: (parts[2] || '').trim(),
    }
  }).filter(a => a.lastName)
  const genres = genreStr.split(':').filter(Boolean)

  return {
    authors,
    genres,
    title,
    series,
    seriesNum,
    bookId,
    fileSize,
    libId,
    deleted,
    format,
    dateAdded,
    lang,
    keywords,
    archiveName,
  }
}

export async function importInpx(inpxPath: string, chunkSize: number = 5000, progressCallback?: (msg: string, progress: number) => void): Promise<{ total: number; imported: number }> {
  const db = getDb()
  const tmpDir = join(process.cwd(), 'data', 'tmp_inpx')
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  progressCallback?.('Распаковка INPX файла...', 0)
  try {
    await execAsync(`unzip -o "${inpxPath}" -d "${tmpDir}"`, { maxBuffer: 50 * 1024 * 1024 })
  } catch (e: any) {
    console.error('Error extracting INPX:', e.message)
    throw new Error('Не удалось распаковать INPX файл')
  }
  const { stdout } = await execAsync(`find "${tmpDir}" -name "*.inp" -type f`)
  const inpFiles = stdout.trim().split('\n').filter(Boolean)

  progressCallback?.(`Найдено ${inpFiles.length} файлов индекса`, 5)
  let totalImported = 0
  let totalParsed = 0
  const insertBook = db.prepare(`
    INSERT OR REPLACE INTO books (id, lib_id, title, series, series_num, file_size, format, date_added, lang, deleted, keywords, archive_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

  const insertAuthor = db.prepare(`
    INSERT OR IGNORE INTO authors (last_name, first_name, middle_name)
    VALUES (?, ?, ?)
  `)

  const getAuthorId = db.prepare(`
    SELECT id FROM authors WHERE last_name = ? AND first_name = ? AND middle_name = ?
  `)

  const insertBookAuthor = db.prepare(`
    INSERT OR IGNORE INTO book_authors (book_id, author_id)
    VALUES (?, ?)
  `)

  const insertGenre = db.prepare(`
    INSERT OR IGNORE INTO genres (code, name)
    VALUES (?, ?)
  `)

  const getGenreId = db.prepare(`
    SELECT id FROM genres WHERE code = ?
  `)

  const insertBookGenre = db.prepare(`
    INSERT OR IGNORE INTO book_genres (book_id, genre_id)
    VALUES (?, ?)
  `)

  const insertFts = db.prepare(`
    INSERT OR REPLACE INTO books_fts (rowid, title, authors, series)
    VALUES (?, ?, ?, ?)
  `)
  for (let fileIdx = 0; fileIdx < inpFiles.length; fileIdx++) {
    const inpFile = inpFiles[fileIdx] || ''
    const archiveName = basename(inpFile, '.inp') + '.zip'
    const content = readFileSync(inpFile as string, 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())

    const batchSize = chunkSize
    for (let i = 0; i < lines.length; i += batchSize) {
      await new Promise(resolve => setTimeout(resolve, 5))

      const batch = lines.slice(i, i + batchSize)

      const insertBatch = db.transaction((books: ParsedBook[]) => {
        for (const book of books) {
          try {
            insertBook.run(
              book.bookId,
              book.libId,
              book.title,
              book.series || null,
              book.seriesNum || null,
              book.fileSize,
              book.format,
              book.dateAdded || null,
              book.lang,
              book.deleted ? 1 : 0,
              book.keywords || null,
              book.archiveName,
            )
            const authorNames: string[] = []
            for (const author of book.authors) {
              insertAuthor.run(author.lastName, author.firstName || '', author.middleName || '')
              const row = getAuthorId.get(author.lastName, author.firstName || '', author.middleName || '') as any
              if (row) {
                insertBookAuthor.run(book.bookId, row.id)
              }
              const fullName = [author.lastName, author.firstName, author.middleName].filter(Boolean).join(' ')
              authorNames.push(fullName)
            }
            for (const genreCode of book.genres) {
              const genreName = getGenreName(genreCode)
              insertGenre.run(genreCode, genreName)
              const row = getGenreId.get(genreCode) as any
              if (row) {
                insertBookGenre.run(book.bookId, row.id)
              }
            }
            insertFts.run(
              book.bookId,
              book.title,
              authorNames.join(', '),
              book.series || '',
            )

            totalImported++
          } catch (e: any) {
            if (!e.message?.includes('UNIQUE constraint')) {
            }
          }
        }
      })

      const parsedBooks: ParsedBook[] = []
      for (const line of batch) {
        const book = parseLine(line.replace(/\r$/, ''), archiveName)
        if (book) {
          parsedBooks.push(book)
          totalParsed++
        }
      }

      insertBatch(parsedBooks)
    }

    const progress = 5 + ((fileIdx + 1) / inpFiles.length) * 95
    progressCallback?.(`Импортировано ${totalImported} книг из ${fileIdx + 1}/${inpFiles.length} файлов`, Math.round(progress))
  }
  db.prepare(`
    INSERT OR REPLACE INTO import_status (id, total_books, imported_at, status)
    VALUES (1, ?, CURRENT_TIMESTAMP, 'done')
  `).run(totalImported)
  await execAsync(`rm -rf "${tmpDir}"`).catch(() => {})

  return { total: totalParsed, imported: totalImported }
}
