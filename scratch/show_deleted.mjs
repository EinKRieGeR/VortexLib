import Database from 'better-sqlite3';
const db = new Database('data/library.db');
const rows = db.prepare(`
  SELECT id, title, deleted 
  FROM books 
  WHERE deleted = 1 
  LIMIT 5
`).all();
console.log(JSON.stringify(rows, null, 2));
