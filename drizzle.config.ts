import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './server/utils/schema.ts',
  out: './server/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DB_PATH || './data/library.db',
  },
})
