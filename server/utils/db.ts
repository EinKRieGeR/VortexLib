import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'
import { eq } from 'drizzle-orm'
import { appSettings } from './schema'

let _db: Database.Database | null = null
let _drizzleDb: ReturnType<typeof drizzle> | null = null

export function getDrizzle() {
  if (_drizzleDb) return _drizzleDb
  _drizzleDb = drizzle(getDb(), { schema })
  return _drizzleDb
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

  initTables(_db)
  createFtsTable(_db)

  return _db
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY,
      lib_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      series TEXT,
      series_num INTEGER,
      file_size INTEGER NOT NULL DEFAULT 0,
      format TEXT NOT NULL DEFAULT 'fb2',
      date_added TEXT,
      lang TEXT DEFAULT 'ru',
      deleted INTEGER NOT NULL DEFAULT 0,
      keywords TEXT,
      archive_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      last_name TEXT NOT NULL,
      first_name TEXT,
      middle_name TEXT,
      UNIQUE(last_name, first_name, middle_name)
    );

    CREATE TABLE IF NOT EXISTS book_authors (
      book_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      PRIMARY KEY (book_id, author_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS genres (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT
    );

    CREATE TABLE IF NOT EXISTS book_genres (
      book_id INTEGER NOT NULL,
      genre_id INTEGER NOT NULL,
      PRIMARY KEY (book_id, genre_id),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS import_status (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_books INTEGER NOT NULL DEFAULT 0,
      imported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'pending'
    );

    CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
    CREATE INDEX IF NOT EXISTS idx_books_lang ON books(lang);
    CREATE INDEX IF NOT EXISTS idx_books_series ON books(series);
    CREATE INDEX IF NOT EXISTS idx_books_deleted ON books(deleted);
    CREATE INDEX IF NOT EXISTS idx_books_lib_id ON books(lib_id);
    CREATE INDEX IF NOT EXISTS idx_authors_last_name ON authors(last_name);
    CREATE INDEX IF NOT EXISTS idx_authors_first_name ON authors(first_name);

    CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      library_path TEXT NOT NULL
    );

    INSERT OR IGNORE INTO app_settings (id, library_path) VALUES (1, '/mnt/raid0/downloads/fb2.Flibusta.Net');
  `)
}

function createFtsTable(db: Database.Database) {
  const ftsExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='books_fts'").get()
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
  db.exec('DROP TABLE IF EXISTS book_genres')
  db.exec('DROP TABLE IF EXISTS book_authors')
  db.exec('DROP TABLE IF EXISTS books')
  db.exec('DROP TABLE IF EXISTS authors')
  db.exec('DROP TABLE IF EXISTS genres')
  db.exec('DROP TABLE IF EXISTS books_fts')
  db.exec('DROP TABLE IF EXISTS import_status')
  db.exec('DROP TABLE IF EXISTS app_settings')
  initTables(db)
  createFtsTable(db)
}

