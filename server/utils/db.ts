import Database from 'better-sqlite3'
import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import * as schema from './schema'
import { existsSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { eq } from 'drizzle-orm'
import { appSettings } from './schema'

let _db: Database.Database | null = null
let _orm: BetterSQLite3Database<typeof schema> | null = null

export function getDrizzle() {
  if (_orm) return _orm
  getDb()
  return _orm!
}

export function getLibraryPath(): string | null {
  const db = getDrizzle()
  const result = db.select().from(appSettings).where(eq(appSettings.id, 1)).get()
  return result?.libraryPath || null
}

export function getDb(): Database.Database {
  if (_db) return _db

  const config = useRuntimeConfig()
  const dbPath = config.dbPath as string
  const dir = dirname(dbPath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  _db = new Database(dbPath)

  _db.pragma('journal_mode = WAL')
  _db.pragma('synchronous = NORMAL')
  _db.pragma('cache_size = -64000')
  _db.pragma('foreign_keys = ON')

  _db.function('lower_unicode', (text: any) => {
    if (typeof text !== 'string') return text
    return text.toLowerCase()
  })

  _orm = drizzle(_db, { schema })

  const migrationsFolder = resolve('./server/database/migrations')
  migrate(_orm, { migrationsFolder })

  if (process.env.DOCKERIZED === 'true') {
    _orm.insert(appSettings)
      .values({ id: 1, libraryPath: '/library' })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { libraryPath: '/library' }
      })
      .run()
  }

  _createFtsTable(_db)

  return _db
}


function _createFtsTable(db: Database.Database) {
  const ftsExists = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books_fts'")
    .get()
  if (!ftsExists) {
    db.exec(`
      CREATE VIRTUAL TABLE books_fts USING fts5(
        title,
        authors,
        series,
        content='',
        tokenize='unicode61'
      );
    `)
  }
}

export function clearDb() {
  const orm = getDrizzle()
  const db = getDb()

  db.pragma('foreign_keys = OFF')

  try {
    orm.transaction((tx) => {
      tx.delete(schema.bookGenres).run()
      tx.delete(schema.bookAuthors).run()
      tx.delete(schema.books).run()
      tx.delete(schema.authors).run()
      tx.delete(schema.genres).run()

      db.exec('DELETE FROM books_fts')

      tx.update(schema.importStatus)
        .set({
          status: 'pending',
          totalBooks: 0,
          importedAt: null
        })
        .where(eq(schema.importStatus.id, 1))
        .run()
    })
  } finally {
    db.pragma('foreign_keys = ON')
  }
}
