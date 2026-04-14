import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const id = parseInt(getRouterParam(event, 'id') || '0')
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid book ID' })
  }

  const db = getDb()

  const book = db.prepare('SELECT * FROM books WHERE id = ?').get(id) as any
  if (!book) {
    throw createError({ statusCode: 404, statusMessage: 'Book not found' })
  }
  const authors = db.prepare(`
    SELECT a.id, a.last_name, a.first_name, a.middle_name
    FROM authors a
    JOIN book_authors ba ON ba.author_id = a.id
    WHERE ba.book_id = ?
  `).all(id) as any[]
  const genres = db.prepare(`
    SELECT g.code, g.name
    FROM genres g
    JOIN book_genres bg ON bg.genre_id = g.id
    WHERE bg.book_id = ?
  `).all(id) as any[]
  let seriesBooks: any[] = []
  if (book.series) {
    seriesBooks = db.prepare(`
      SELECT id, title, series_num FROM books
      WHERE series = ? AND deleted = 0
      ORDER BY series_num ASC
      LIMIT 50
    `).all(book.series) as any[]
  }
  const authorIds = authors.map(a => a.id)
  let otherBooks: any[] = []
  if (authorIds.length > 0) {
    const placeholders = authorIds.map(() => '?').join(',')
    otherBooks = db.prepare(`
      SELECT DISTINCT b.id, b.title, b.series, b.series_num
      FROM books b
      JOIN book_authors ba ON ba.book_id = b.id
      WHERE ba.author_id IN (${placeholders})
        AND b.id != ?
        AND b.deleted = 0
      ORDER BY b.title ASC
      LIMIT 20
    `).all(...authorIds, id) as any[]
  }

  return {
    ...book,
    authors: authors.map(a => ({
      id: a.id,
      name: [a.last_name, a.first_name, a.middle_name].filter(Boolean).join(' '),
      lastName: a.last_name,
      firstName: a.first_name,
      middleName: a.middle_name,
    })),
    genres: genres.map(g => ({
      code: g.code,
      name: g.name,
    })),
    seriesBooks,
    otherBooks,
  }
})
