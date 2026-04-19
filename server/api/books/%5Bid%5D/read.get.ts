import { getDb } from '../../../utils/db'
import { loadFB2 } from '../../../utils/fb2'

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  if (!url) return '#'
  const trimmed = url.trim()
  if (trimmed.startsWith('#')) return trimmed
  if (/^(https?|mailto):/i.test(trimmed)) return trimmed
  return '#'
}

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') as string)
  if (!id) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const db = getDb()
  const book = db.prepare('SELECT archive_name, folder FROM books WHERE id = ? AND deleted = 0').get(id) as any
  if (!book) throw createError({ statusCode: 404, message: 'Book not found' })

  let $
  try {
    $ = await loadFB2(book.folder, book.archive_name, id)
  } catch (err: any) {
    if (err.message === 'File not found in archive') {
      throw createError({ statusCode: 404, message: err.message })
    }
    throw createError({ statusCode: 500, message: err.message || 'Failed to extract book' })
  }

  const title = $('title-info book-title').text()

  const images: Record<string, string> = {}
  $('binary').each((_, el) => {
    const $el = $(el)
    let imgId = $el.attr('id')
    if (imgId?.startsWith('#')) imgId = imgId.substring(1)

    const contentType = $el.attr('content-type') || 'image/jpeg'
    const base64 = $el.text().trim()

    if (imgId && base64 && contentType.startsWith('image/')) {
      images[imgId] = `data:${contentType};base64,${base64}`
    }
  })

  const body = $('body').first()
  let html = ''

  function parseNode(node: any): string {
    if (node.type === 'text') return escapeHtml(node.data || '')

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
        const link = sanitizeUrl(node.attribs['l:href'] || node.attribs['href'] || '#')
        return `<a href="${link}" rel="noopener noreferrer" target="_blank">${inner}</a>`
      default:
        return inner
    }
  }

  body.children().each((_, el) => {
    html += parseNode(el)
  })

  return { html, title }
})
