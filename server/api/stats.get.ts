import { getDrizzle } from '../utils/db'
import { books, authors, genres, importStatus } from '../utils/schema'
import { count, sql, eq } from 'drizzle-orm'

export default defineEventHandler(async () => {
  const db = getDrizzle()

  const [booksRes] = await db.select({ c: count() }).from(books).where(eq(books.deleted, 0))
  const [authorsRes] = await db.select({ c: count() }).from(authors)
  const [genresRes] = await db.select({ c: count() }).from(genres)

  const langStats = await db.select({
    lang: books.lang,
    count: count()
  }).from(books).where(eq(books.deleted, 0)).groupBy(books.lang).orderBy(sql`${count()} DESC`).limit(10)

  const [statusRes] = await db.select().from(importStatus).where(eq(importStatus.id, 1))

  return {
    totalBooks: booksRes?.c || 0,
    totalAuthors: authorsRes?.c || 0,
    totalGenres: genresRes?.c || 0,
    langStats,
    importStatus: statusRes ? {
      id: statusRes.id,
      total_books: statusRes.totalBooks,
      imported_at: statusRes.importedAt,
      status: statusRes.status
    } : { status: 'not_imported', total_books: 0 },
  }
})
