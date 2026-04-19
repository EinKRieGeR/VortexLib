import yauzl from 'yauzl'
import iconv from 'iconv-lite'
import * as cheerio from 'cheerio'
import { join } from 'path'
import { existsSync } from 'fs'
import { getLibraryPath } from './db'

export function getZipEntryBuffer(zipPath: string, fileNamePattern: string): Promise<Buffer> {
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

export function decodeFB2(buffer: Buffer): string {
  const header = buffer.subarray(0, 200).toString('ascii')
  const isWin1251 = header.toLowerCase().includes('windows-1251')

  if (isWin1251) {
    return iconv.decode(buffer, 'win1251')
  }

  return buffer.toString('utf-8')
}

export async function loadFB2(archiveFolder: string, archiveName: string, bookId: number) {
  const libraryPath = getLibraryPath()
  if (!libraryPath) {
    throw createError({ statusCode: 400, message: 'Library path not configured' })
  }

  const zipPath = join(libraryPath, archiveFolder || '', archiveName)
  if (!existsSync(zipPath)) {
    throw createError({ statusCode: 404, message: 'Archive not found' })
  }

  const buffer = await getZipEntryBuffer(zipPath, `${bookId}.fb2`)
  const xmlString = decodeFB2(buffer)
  return cheerio.load(xmlString, { xmlMode: true })
}
