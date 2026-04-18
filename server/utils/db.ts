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
  const db = getDb()

  db.pragma('foreign_keys = OFF')

  try {
    db.transaction(() => {
      db.exec('DROP TABLE IF EXISTS book_genres')
      db.exec('DROP TABLE IF EXISTS book_authors')
      db.exec('DROP TABLE IF EXISTS books')
      db.exec('DROP TABLE IF EXISTS authors')
      db.exec('DROP TABLE IF EXISTS genres')
      db.exec('DROP TABLE IF EXISTS books_fts')
      db.exec('DROP TABLE IF EXISTS import_checkpoints')

      db.exec(`
        CREATE TABLE books (
          id INTEGER PRIMARY KEY,
          lib_id INTEGER,
          title TEXT NOT NULL,
          series TEXT,
          series_num INTEGER,
          file_size INTEGER,
          format TEXT,
          date_added TEXT,
          lang TEXT,
          deleted INTEGER DEFAULT 0,
          keywords TEXT,
          archive_name TEXT,
          folder TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db.exec(`
        CREATE TABLE authors (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          last_name TEXT NOT NULL,
          first_name TEXT DEFAULT '',
          middle_name TEXT DEFAULT '',
          UNIQUE(last_name, first_name, middle_name)
        )
      `)
      db.exec(`
        CREATE TABLE genres (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL
        )
      `)
      db.exec(`
        CREATE TABLE book_authors (
          book_id INTEGER NOT NULL REFERENCES books(id),
          author_id INTEGER NOT NULL REFERENCES authors(id),
          PRIMARY KEY (book_id, author_id)
        )
      `)
      db.exec(`
        CREATE TABLE book_genres (
          book_id INTEGER NOT NULL REFERENCES books(id),
          genre_id INTEGER NOT NULL REFERENCES genres(id),
          PRIMARY KEY (book_id, genre_id)
        )
      `)

      _createFtsTable(db)

      db.exec("UPDATE import_status SET status='pending', total_books=0, imported_at=NULL WHERE id=1")
    })()
  } finally {
    db.pragma('foreign_keys = ON')
  }
}
