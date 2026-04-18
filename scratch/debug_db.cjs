const Database = require('better-sqlite3');
try {
    const db = new Database('data/library.db');
    db.pragma('journal_mode = WAL');
    console.log('WAL set');
    db.prepare('CREATE TABLE IF NOT EXISTS test (id INTEGER)').run();
    console.log('Table created');
    const row = db.prepare('SELECT count(*) as c FROM users').get();
    console.log('Users count:', row.c);
} catch (e) {
    console.error('Crash!', e);
}
