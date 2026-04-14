import { getDb, getLibraryPath } from '../../../utils/db'
import { join } from 'path'
import { existsSync } from 'fs'
import iconv from 'iconv-lite'
import * as cheerio from 'cheerio'
import yauzl from 'yauzl'

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
  const book = db.prepare('SELECT archive_name FROM books WHERE id = ?').get(id) as any
  if (!book) throw createError({ statusCode: 404, message: 'Book not found' })

  const libraryPath = getLibraryPath()
  if (!libraryPath) {
    throw createError({ statusCode: 400, message: 'Library path not configured in settings.' })
  }
  const zipPath = join(libraryPath, book.archive_name)

  if (!existsSync(zipPath)) {
    throw createError({ statusCode: 404, message: 'Archive not found' })
  }

  let buffer: Buffer
  try {
    buffer = await getZipEntryBuffer(zipPath, `${id}.fb2`)
  } catch (err: any) {
    if (err.message === 'File not found in archive') {
      throw createError({ statusCode: 404, message: err.message })
    }
    throw createError({ statusCode: 500, message: err.message || 'Failed to extract book' })
  }

  const header = buffer.subarray(0, 200).toString('utf-8')
  const isWin1251 = header.toLowerCase().includes('windows-1251')
  
  const xmlString = isWin1251 ? iconv.decode(buffer, 'win1251') : buffer.toString('utf-8')

  const $ = cheerio.load(xmlString, { xmlMode: true })

  const title = $('title-info book-title').text()
  
  const images: Record<string, string> = {}
  $('binary').each((_, el) => {
    const $el = $(el)
    let imgId = $el.attr('id')
    if (imgId?.startsWith('#')) imgId = imgId.substring(1)
    
    const contentType = $el.attr('content-type') || 'image/jpeg'
    const base64 = $el.text().trim()
    if (imgId && base64) {
      images[imgId] = `data:${contentType};base64,${base64}`
    }
  })

  const body = $('body').first()
  let html = ''

  function parseNode(node: any): string {
    if (node.type === 'text') return node.data || ''
    
    const tagName = node.name
    let inner = ''
    if (node.children) {
      inner = node.children.map((c: any) => parseNode(c)).join('')
    }
    
    switch (tagName) {
      case 'p': return `<p>${inner}</p>`
      case 'v': return `<p class="verse">${inner}</p>`
      case 'title': return `<h2 class="chapter-title">${inner}</h2>`
      case 'subtitle': return `<h3>${inner}</h3>`
      case 'empty-line': return `<br class="empty-line" />`
      case 'strong': return `<strong>${inner}</strong>`
      case 'emphasis': return `<em>${inner}</em>`
      case 'image': 
        const href = node.attribs['l:href'] || node.attribs['href'] || ''
        const imageId = href.replace(/^#/, '')
        return images[imageId] ? `<img src="${images[imageId]}" alt="Illustration" loading="lazy" />` : ''
      case 'section': return `<section class="book-section">${inner}</section>`
      case 'epigraph': return `<blockquote class="epigraph">${inner}</blockquote>`
      case 'text-author': return `<p class="text-author">— ${inner}</p>`
      case 'stanza': return `<div class="stanza">${inner}</div>`
      case 'poem': return `<div class="poem">${inner}</div>`
      case 'a': 
        return `<a href="${node.attribs['l:href'] || node.attribs['href'] || '#'}">${inner}</a>`
      default:
        return inner
    }
  }

  body.children().each((_, el) => {
    html += parseNode(el)
  })

  return { html, title }
})
