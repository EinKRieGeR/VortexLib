import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const books = sqliteTable('books', {
  id: integer('id').primaryKey(),
  libId: integer('lib_id').notNull(),
  title: text('title').notNull(),
  series: text('series'),
  seriesNum: integer('series_num'),
  fileSize: integer('file_size').notNull().default(0),
  format: text('format').notNull().default('fb2'),
  dateAdded: text('date_added'),
  lang: text('lang').default('ru'),
  deleted: integer('deleted').notNull().default(0),
  keywords: text('keywords'),
  archiveName: text('archive_name').notNull(),
  folder: text('folder').default(''),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const authors = sqliteTable('authors', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  lastName: text('last_name').notNull(),
  firstName: text('first_name'),
  middleName: text('middle_name'),
})

export const bookAuthors = sqliteTable('book_authors', {
  bookId: integer('book_id').notNull(),
  authorId: integer('author_id').notNull(),
})

export const genres = sqliteTable('genres', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name'),
})

export const bookGenres = sqliteTable('book_genres', {
  bookId: integer('book_id').notNull(),
  genreId: integer('genre_id').notNull(),
})

export const importStatus = sqliteTable('import_status', {
  id: integer('id').primaryKey(),
  totalBooks: integer('total_books').notNull().default(0),
  importedAt: text('imported_at').default('CURRENT_TIMESTAMP'),
  status: text('status').notNull().default('pending'),
})

export const appSettings = sqliteTable('app_settings', {
  id: integer('id').primaryKey(),
  libraryPath: text('library_path').notNull().default(''),
})

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
})

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: integer('user_id').notNull(),
  expiresAt: integer('expires_at').notNull(),
})
