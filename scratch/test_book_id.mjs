import Database from 'better-sqlite3';
const db = new Database('data/library.db');
const row = db.prepare('SELECT id, archive_name FROM books LIMIT 1').get();
console.log(JSON.stringify(row));
