import { getDb } from '../../../utils/db'
import { loadFB2 } from '../../../utils/fb2'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') as string)
  if (!id) throw createError({ statusCode: 400, message: 'Invalid ID' })

  const db = getDb()
  const book = db.prepare('SELECT archive_name, folder FROM books WHERE id = ? AND deleted = 0').get(id) as any
  if (!book) throw createError({ statusCode: 404, message: 'Book not found' })

  try {
    const $ = await loadFB2(book.folder, book.archive_name, id)

    let coverId = $('title-info coverpage image').attr('l:href') || $('title-info coverpage image').attr('href')
    if (coverId?.startsWith('#')) coverId = coverId.substring(1)

    let binaryNode
    if (coverId) {
      binaryNode = $(`binary[id="${coverId}"]`)
    } else {
      binaryNode = $('binary').first()
    }

    if (!binaryNode || binaryNode.length === 0) {
      event.node.res.statusCode = 204
      return null
    }

    const contentType = binaryNode.attr('content-type') || 'image/jpeg'
    const base64Data = binaryNode.text().trim()
    const imgBuffer = Buffer.from(base64Data, 'base64')

    setResponseHeader(event, 'Content-Type', contentType)
    setResponseHeader(event, 'Cache-Control', 'public, max-age=86400')
    return imgBuffer

  } catch (err: any) {
    event.node.res.statusCode = 204
    return null
  }
})
