import { getDb } from '../utils/db'
import { getImportInProgress } from '../utils/state'

export default defineEventHandler(async () => {
  const db = getDb()

  const totalBooks = (db.prepare('SELECT count(*) as c FROM books WHERE deleted = 0').get() as any).c
  const totalAuthors = (db.prepare('SELECT count(*) as c FROM authors').get() as any).c
  const totalGenres = (db.prepare('SELECT count(*) as c FROM genres').get() as any).c

  const langStats = db.prepare(`
    SELECT lang, count(*) as count
    FROM books
    WHERE deleted = 0
    GROUP BY lang
    ORDER BY count DESC
    LIMIT 10
  `).all()

  const stats = { totalBooks, totalAuthors, totalGenres, langStats }

  const statusRow = db.prepare('SELECT * FROM import_status WHERE id = 1').get() as any
  return {
    ...stats,
    importStatus: statusRow || { status: 'not_imported', total_books: 0 },
    inProgress: await getImportInProgress()
  }
})
