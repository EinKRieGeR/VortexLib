import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const search = (query.q as string || '').trim()
  const page = parseInt(query.page as string) || 1
  const perPage = parseInt(query.perPage as string) || 30
  const lang = (query.lang as string || '').trim()
  const genre = (query.genre as string || '').trim()
  const author = (query.author as string || '').trim()
  const series = (query.series as string || '').trim()
  const sort = (query.sort as string) || 'title'
  const order = (query.order as string) === 'desc' ? 'DESC' : 'ASC'
  const offset = (page - 1) * perPage

  const db = getDb()

  let countSql = ''
  let dataSql = ''
  const params: any[] = []
  const countParams: any[] = []

  if (search) {
    const searchTerm = search.replace(/['"]/g, '').split(/\s+/).map(w => `"${w}"*`).join(' ')

    countSql = `
      SELECT COUNT(*) as total
      FROM books_fts
      JOIN books ON books.id = books_fts.rowid
      WHERE books_fts MATCH ?
        AND books.deleted = 0
    `
    countParams.push(searchTerm)

    dataSql = `
      SELECT books.*, books_fts.rank
      FROM books_fts
      JOIN books ON books.id = books_fts.rowid
      WHERE books_fts MATCH ?
        AND books.deleted = 0
    `
    params.push(searchTerm)

    if (lang) {
      countSql += ' AND books.lang = ?'
      dataSql += ' AND books.lang = ?'
      params.push(lang)
      countParams.push(lang)
    }

    if (genre) {
      countSql += ' AND books.id IN (SELECT book_id FROM book_genres JOIN genres ON genres.id = book_genres.genre_id WHERE genres.code = ?)'
      dataSql += ' AND books.id IN (SELECT book_id FROM book_genres JOIN genres ON genres.id = book_genres.genre_id WHERE genres.code = ?)'
      params.push(genre)
      countParams.push(genre)
    }

    if (author) {
      countSql += ' AND books.id IN (SELECT book_id FROM book_authors WHERE author_id = ?)'
      dataSql += ' AND books.id IN (SELECT book_id FROM book_authors WHERE author_id = ?)'
      params.push(parseInt(author))
      countParams.push(parseInt(author))
    }

    dataSql += ` ORDER BY rank LIMIT ? OFFSET ?`
    params.push(perPage, offset)
  } else {
    countSql = `SELECT COUNT(*) as total FROM books WHERE deleted = 0`
    dataSql = `SELECT * FROM books WHERE deleted = 0`

    if (lang) {
      countSql += ' AND lang = ?'
      dataSql += ' AND lang = ?'
      params.push(lang)
      countParams.push(lang)
    }

    if (genre) {
      countSql += ' AND id IN (SELECT book_id FROM book_genres JOIN genres ON genres.id = book_genres.genre_id WHERE genres.code = ?)'
      dataSql += ' AND id IN (SELECT book_id FROM book_genres JOIN genres ON genres.id = book_genres.genre_id WHERE genres.code = ?)'
      params.push(genre)
      countParams.push(genre)
    }

    if (author) {
      countSql += ' AND id IN (SELECT book_id FROM book_authors WHERE author_id = ?)'
      dataSql += ' AND id IN (SELECT book_id FROM book_authors WHERE author_id = ?)'
      params.push(parseInt(author))
      countParams.push(parseInt(author))
    }

    if (series) {
      countSql += ' AND series = ?'
      dataSql += ' AND series = ?'
      params.push(series)
      countParams.push(series)
    }

    const sortMap: Record<string, string> = {
      title: 'title',
      date: 'date_added',
      size: 'file_size',
      id: 'id',
    }
    const sortCol = sortMap[sort] || 'title'
    dataSql += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`
    params.push(perPage, offset)
  }

  const countResult = db.prepare(countSql).get(...countParams) as any
  const total = countResult?.total || 0

  const books = db.prepare(dataSql).all(...params) as any[]
  const authorStmt = db.prepare(`
    SELECT a.id, a.last_name, a.first_name, a.middle_name
    FROM authors a
    JOIN book_authors ba ON ba.author_id = a.id
    WHERE ba.book_id = ?
  `)

  const genreStmt = db.prepare(`
    SELECT g.code, g.name
    FROM genres g
    JOIN book_genres bg ON bg.genre_id = g.id
    WHERE bg.book_id = ?
  `)

  const enrichedBooks = books.map(book => {
    const authors = authorStmt.all(book.id) as any[]
    const genres = genreStmt.all(book.id) as any[]
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
    }
  })

  return {
    books: enrichedBooks,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
})
