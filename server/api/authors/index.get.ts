import { getDb } from '../../utils/db'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = (query.q as string || '').trim()
  const page = parseInt(query.page as string) || 1
  const perPage = parseInt(query.perPage as string) || 50
  const offset = (page - 1) * perPage

  const db = getDb()

  if (q) {
    const searchTerm = `%${q.toLowerCase()}%`
    const total = (db.prepare(`
      SELECT COUNT(*) as total FROM authors 
      WHERE lower_unicode(last_name) LIKE ? OR lower_unicode(first_name) LIKE ?
    `).get(searchTerm, searchTerm) as any)?.total || 0

    const authors = db.prepare(`
      SELECT *
      FROM authors 
      WHERE lower_unicode(last_name) LIKE ? OR lower_unicode(first_name) LIKE ?
      ORDER BY last_name ASC, first_name ASC
      LIMIT ? OFFSET ?
    `).all(searchTerm, searchTerm, perPage, offset) as any[]

    return {
      authors: authors.map(a => ({
        id: a.id,
        name: [a.last_name, a.first_name, a.middle_name].filter(Boolean).join(' '),
        lastName: a.last_name,
        firstName: a.first_name,
        middleName: a.middle_name,
        bookCount: 0 // Count removed to speed up list
      })),
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    }
  }

  const total = (db.prepare('SELECT COUNT(*) as total FROM authors').get() as any)?.total || 0

  const authors = db.prepare(`
    SELECT *
    FROM authors
    ORDER BY last_name ASC, first_name ASC
    LIMIT ? OFFSET ?
  `).all(perPage, offset) as any[]

  return {
    authors: authors.map(a => ({
      id: a.id,
      name: [a.last_name, a.first_name, a.middle_name].filter(Boolean).join(' '),
      lastName: a.last_name,
      firstName: a.first_name,
      middleName: a.middle_name,
      bookCount: 0
    })),
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  }
})
