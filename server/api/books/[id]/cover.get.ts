import { getDb, getLibraryPath } from '../../../utils/db'
import { join } from 'path'
import { existsSync } from 'fs'
import yauzl from 'yauzl'
import * as cheerio from 'cheerio'

function getZipEntryBuffer(zipPath: string, fileNamePattern: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err)
      if (!zipfile) return reject(new Error('Failed to open zip file'))

      zipfile.readEntry()

      zipfile.on('entry', (entry) => {
        if (entry.fileName.endsWith(fileNamePattern)) {
          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) return reject(err)
            if (!readStream) return reject(new Error('Failed to open stream'))

            const chunks: Buffer[] = []
            readStream.on('data', chunk => chunks.push(chunk))
            readStream.on('end', () => resolve(Buffer.concat(chunks)))
            readStream.on('error', reject)
          })
        } else {
          zipfile.readEntry()
        }
      })

      zipfile.on('end', () => {
        reject(new Error('File not found in archive'))
      })

      zipfile.on('error', reject)
    })
  })
}

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') as string)
  if (!id) throw createError({ statusCode: 400, message: 'Invalid ID' })
  
  const db = getDb()
  const book = db.prepare('SELECT archive_name, folder FROM books WHERE id = ?').get(id) as any
  if (!book) throw createError({ statusCode: 404, message: 'Book not found' })

  const libraryPath = getLibraryPath()
  if (!libraryPath) throw createError({ statusCode: 400, message: 'Library path not configured' })
  const zipPath = join(libraryPath, book.folder || '', book.archive_name)

  if (!existsSync(zipPath)) throw createError({ statusCode: 404, message: 'Archive not found' })

  try {
    const buffer = await getZipEntryBuffer(zipPath, `${id}.fb2`)
    const xml = buffer.toString('utf-8')
    const $ = cheerio.load(xml, { xmlMode: true })
    let coverId = $('title-info coverpage image').attr('l:href') || $('title-info coverpage image').attr('href')
    if (coverId?.startsWith('#')) coverId = coverId.substring(1)
    let binaryNode
    if (coverId) {
      binaryNode = $(`binary[id="${coverId}"]`)
    } else {
      binaryNode = $('binary').first()
    }

    if (!binaryNode || binaryNode.length === 0) {
      throw createError({ statusCode: 404, message: 'Cover image not found in FB2' })
    }

    const contentType = binaryNode.attr('content-type') || 'image/jpeg'
    const base64Data = binaryNode.text().trim()
    const imgBuffer = Buffer.from(base64Data, 'base64')

    setResponseHeader(event, 'Content-Type', contentType)
    setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
    return imgBuffer

  } catch (err: any) {
    throw createError({ statusCode: err.statusCode || 500, message: err.message })
  }
})
