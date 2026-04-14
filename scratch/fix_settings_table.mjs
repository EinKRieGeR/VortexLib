import Database from 'better-sqlite3';
const db = new Database('data/library.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    library_path TEXT NOT NULL
  );
  INSERT OR IGNORE INTO app_settings (id, library_path) VALUES (1, '/mnt/raid0/downloads/fb2.Flibusta.Net');
`);
console.log('Table app_settings created/verified.');
