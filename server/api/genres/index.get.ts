import { getDb } from '../../utils/db'
import { getImportInProgress } from '../../utils/state'

export default defineCachedEventHandler(async () => {
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
}, {
  maxAge: 60 * 30,
  name: 'genres-list',
  getKey: () => 'all',

  shouldBypassCache: async () => {
    const db = getDb()
    const count = (db.prepare('SELECT count(*) as c FROM genres').get() as any).c
    if (count === 0) return true
    const inProgress = await getImportInProgress()
    return !!inProgress
  },
})
