import { getDb } from '../../utils/db'

export default defineEventHandler(async () => {
  const db = getDb()

  const genres = db.prepare(`
    SELECT g.code, g.name
    FROM genres g
    ORDER BY g.name ASC
  `).all() as any[]

  return {
    genres: genres.map(g => ({
      code: g.code,
      name: g.name,
    })),
  }
})
