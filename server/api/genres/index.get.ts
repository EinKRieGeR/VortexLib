import { getDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = getDb()

  const genres = db.prepare(`
    SELECT g.*, COUNT(bg.book_id) as book_count
    FROM genres g
    LEFT JOIN book_genres bg ON bg.genre_id = g.id
    GROUP BY g.id
    ORDER BY book_count DESC
  `).all() as any[]

  return {
    genres: genres.map(g => ({
      code: g.code,
      name: g.name,
      bookCount: g.book_count,
    })),
  }
})
