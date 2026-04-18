/**
 * Import Worker — runs in a dedicated Node.js Worker Thread.
 *
 * This file is intentionally plain ESM (.mjs), with no Nuxt/Nitro dependencies,
 * because worker threads do not inherit the parent's module loaders or auto-imports.
 * All communication with the parent task happens via parentPort.postMessage().
 */

import { workerData, parentPort } from 'node:worker_threads'
import { createReadStream } from 'node:fs'
import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { join, basename, relative, dirname } from 'node:path'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import Database from 'better-sqlite3'

const execAsync = promisify(exec)

function post(type, payload) {
  parentPort?.postMessage({ type, ...payload })
}

function progress(message, pct) {
  post('progress', { message, progress: pct })
}

// ──────────────────────────────────────────────
// Genre map (inlined — no Nuxt imports allowed)
// ──────────────────────────────────────────────
const GENRE_MAP = {
  sf_history: 'Альтернативная история', sf_action: 'Боевая фантастика',
  sf_epic: 'Эпическая фантастика', sf_heroic: 'Героическая фантастика',
  sf_detective: 'Детективная фантастика', sf_cyberpunk: 'Киберпанк',
  sf_space: 'Космическая фантастика', sf_social: 'Социальная фантастика',
  sf_horror: 'Ужасы и мистика', sf_humor: 'Юмористическая фантастика',
  sf_fantasy: 'Фэнтези', sf: 'Научная фантастика', sf_stimpank: 'Стимпанк',
  sf_postapocalyptic: 'Постапокалипсис', sf_etc: 'Прочая фантастика', sf_litrpg: 'ЛитРПГ',
  det_classic: 'Классический детектив', det_police: 'Полицейский детектив',
  det_action: 'Боевик', det_irony: 'Иронический детектив', det_history: 'Исторический детектив',
  det_espionage: 'Шпионский детектив', det_crime: 'Криминальный детектив',
  det_political: 'Политический детектив', det_maniac: 'Маньяки', det_hard: 'Крутой детектив',
  detective: 'Детектив', det_su: 'Советский детектив', det_cozy: 'Уютный детектив', det: 'Детектив',
  prose_classic: 'Классическая проза', prose_history: 'Историческая проза',
  prose_contemporary: 'Современная проза', prose_counter: 'Контркультура',
  prose_rus_classic: 'Русская классическая проза', prose_su_classics: 'Советская классика',
  prose_military: 'Военная проза', prose: 'Проза', prose_abs: 'Абсурдистская проза',
  prose_magic: 'Магический реализм',
  love_contemporary: 'Современные любовные романы', love_history: 'Исторические любовные романы',
  love_detective: 'Остросюжетные любовные романы', love_short: 'Короткие любовные романы',
  love_erotica: 'Эротика', love_sf: 'Любовное фэнтези', love: 'Любовные романы',
  adv_western: 'Вестерн', adv_history: 'Исторические приключения',
  adv_indian: 'Приключения про индейцев', adv_maritime: 'Морские приключения',
  adv_geo: 'Путешествия и география', adv_animal: 'Природа и животные',
  adventure: 'Приключения', adv: 'Приключения', adv_modern: 'Современные приключения',
  adv_story: 'Рассказы о приключениях',
  child_det: 'Детские детективы', child_prose: 'Детская проза', child_adv: 'Детские приключения',
  child_education: 'Детская образовательная', child_sf: 'Детская фантастика',
  child_tale: 'Сказки', child_verse: 'Детские стихи', children: 'Детская литература',
  poetry: 'Поэзия', dramaturgy: 'Драматургия',
  antique_ant: 'Античная литература', antique_european: 'Европейская старинная',
  antique_russian: 'Древнерусская', antique_east: 'Восточная литература',
  antique_myths: 'Мифы и легенды', antique: 'Старинная литература',
  sci_history: 'История', sci_psychology: 'Психология', sci_culture: 'Культурология',
  sci_religion: 'Религиоведение', sci_philosophy: 'Философия', sci_politics: 'Политика',
  sci_business: 'Бизнес', sci_juris: 'Юриспруденция', sci_linguistic: 'Языкознание',
  sci_medicine: 'Медицина', sci_phys: 'Физика', sci_math: 'Математика',
  sci_chem: 'Химия', sci_biology: 'Биология', sci_tech: 'Технические науки',
  sci_ecology: 'Экология', sci_geo: 'Геология', science: 'Наука', sci_economy: 'Экономика',
  sci_pedagogy: 'Педагогика', sci_cosmos: 'Астрономия', sci_philology: 'Филология',
  sci_social_studies: 'Обществознание', sci_state: 'Госуправление',
  sci_veterinary: 'Ветеринария', sci_popular: 'Научпоп', sci: 'Наука',
  comp_db: 'Базы данных', comp_hard: 'Компьютерное железо', comp_osnet: 'ОС и сети',
  comp_programming: 'Программирование', comp_soft: 'Программы', comp_www: 'Интернет',
  computers: 'Компьютеры', comp: 'Компьютеры',
  ref_encyc: 'Энциклопедии', ref_dict: 'Словари', ref_ref: 'Справочники',
  reference: 'Справочная литература', ref_guide: 'Руководства', ref: 'Справочники',
  nonf_biography: 'Биографии', nonf_publicism: 'Публицистика', nonf_criticism: 'Критика',
  nonfiction: 'Документальная литература', design: 'Искусство и дизайн',
  geo_guides: 'Путеводители', nonf_military: 'Военное дело', nonf: 'Документальное',
  religion_rel: 'Религия', religion_esoterics: 'Эзотерика', religion_self: 'Самосовершенствование',
  religion: 'Религия', religion_budda: 'Буддизм', religion_christianity: 'Христианство',
  religion_islam: 'Ислам', religion_paganism: 'Язычество', religion_judaism: 'Иудаизм',
  religion_hinduism: 'Индуизм', religion_orthodoxy: 'Православие', religion_catholicism: 'Католицизм',
  humor_prose: 'Юмористическая проза', humor_verse: 'Юмористические стихи',
  humor_anecdote: 'Анекдоты', humor: 'Юмор', humor_satire: 'Сатира',
  home_cooking: 'Кулинария', home_pets: 'Домашние животные', home_crafts: 'Хобби и ремёсла',
  home_entertain: 'Развлечения', home_health: 'Здоровье', home_garden: 'Сад и огород',
  home_diy: 'Сделай сам', home_sport: 'Спорт', home_sex: 'Эротика, секс', home: 'Дом и семья',
  other: 'Прочее', periodic: 'Периодика', job_interview: 'Интервью',
  music: 'Музыка', cine: 'Кино', fanfiction: 'Фанфик', unrecognised: 'Неопознанное',
}

function getGenreName(code) {
  return GENRE_MAP[code] || code
}

// ──────────────────────────────────────────────
// Parser
// ──────────────────────────────────────────────
function parseLine(line, archiveName) {
  const fields = line.split('\x04')
  if (fields.length < 12) return null

  const title = fields[2] || ''
  const bookId = parseInt(fields[5] || '') || 0
  if (!title || !bookId) return null

  // Skip deleted books
  const deleted = fields[8] === '1'
  if (deleted) return null

  return {
    authors: (fields[0] || '').split(':').filter(Boolean).map(a => {
      const parts = a.split(',')
      return {
        lastName: (parts[0] || '').trim(),
        firstName: (parts[1] || '').trim(),
        middleName: (parts[2] || '').trim(),
      }
    }).filter(a => a.lastName),
    genres: (fields[1] || '').split(':').filter(Boolean),
    title,
    series: fields[3] || '',
    seriesNum: parseInt(fields[4] || '') || 0,
    bookId,
    fileSize: parseInt(fields[6] || '') || 0,
    libId: parseInt(fields[7] || '') || 0,
    format: fields[9] || 'fb2',
    dateAdded: fields[10] || '',
    lang: fields[11] || 'ru',
    keywords: fields[12] || '',
    archiveName,
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function run() {
  const { libraryPath, chunkSize = 5000, dbPath } = workerData

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -64000')
  db.pragma('foreign_keys = ON')

  const tmpDir = join(process.cwd(), 'data', 'tmp_inpx')
  if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })

  progress('Поиск файлов индексации (INPX)...', 0)

  let inpxFiles = []
  try {
    const { stdout } = await execAsync(`find "${libraryPath}" -name "*.inpx" -type f`)
    inpxFiles = stdout.trim().split('\n').filter(Boolean)
  } catch (e) {
    throw new Error(`Ошибка поиска INPX: ${e.message}`)
  }

  if (inpxFiles.length === 0) {
    throw new Error(`В директории ${libraryPath} не найдено .inpx файлов`)
  }

  const totalBooks = (db.prepare('SELECT count(*) as c FROM books').get()).c
  progress(`Найдено ${inpxFiles.length} INPX файлов. Уже в базе: ${totalBooks} книг`, 1)

  db.exec(`
    CREATE TABLE IF NOT EXISTS import_checkpoints (
      file_path TEXT PRIMARY KEY,
      processed_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)
  const isProcessed = db.prepare('SELECT 1 FROM import_checkpoints WHERE file_path = ?')
  const markProcessed = db.prepare(
    'INSERT OR REPLACE INTO import_checkpoints (file_path) VALUES (?)'
  )

  const insertBook = db.prepare(`
    INSERT OR REPLACE INTO books (id, lib_id, title, series, series_num, file_size, format, date_added, lang, deleted, keywords, archive_name, folder)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `)
  const insertAuthor = db.prepare(`INSERT OR IGNORE INTO authors (last_name, first_name, middle_name) VALUES (?, ?, ?)`)
  const getAuthorId = db.prepare(`SELECT id FROM authors WHERE last_name = ? AND first_name = ? AND middle_name = ?`)
  const insertBookAuthor = db.prepare(`INSERT OR IGNORE INTO book_authors (book_id, author_id) VALUES (?, ?)`)
  const insertGenre = db.prepare(`INSERT OR IGNORE INTO genres (code, name) VALUES (?, ?)`)
  const getGenreId = db.prepare(`SELECT id FROM genres WHERE code = ?`)
  const insertBookGenre = db.prepare(`INSERT OR IGNORE INTO book_genres (book_id, genre_id) VALUES (?, ?)`)
  const insertFts = db.prepare(`INSERT OR REPLACE INTO books_fts (rowid, title, authors, series) VALUES (?, ?, ?, ?)`)

  let totalImported = 0

  for (let inpxIdx = 0; inpxIdx < inpxFiles.length; inpxIdx++) {
    const inpxPath = inpxFiles[inpxIdx]
    const relativeFolder = relative(libraryPath, dirname(inpxPath)) || ''

    await execAsync(`rm -rf "${tmpDir}"/*`).catch(() => { })
    try {
      await execAsync(`unzip -o "${inpxPath}" -d "${tmpDir}"`, { maxBuffer: 50 * 1024 * 1024 })
    } catch (e) {
      console.warn(`[worker] Error extracting ${inpxPath}:`, e.message)
      continue
    }

    const { stdout } = await execAsync(`find "${tmpDir}" -name "*.inp" -type f`)
    const inpFiles = stdout.trim().split('\n').filter(Boolean)

    for (let fileIdx = 0; fileIdx < inpFiles.length; fileIdx++) {
      const inpFile = inpFiles[fileIdx] || ''

      if (isProcessed.get(inpFile)) {
        const overallProgress = (inpxIdx / inpxFiles.length) * 100
          + ((fileIdx + 1) / inpFiles.length) * (100 / inpxFiles.length)
        progress(
          `Пропуск (уже обработан): ${basename(inpFile)} (${fileIdx + 1}/${inpFiles.length})`,
          Math.min(99, Math.round(overallProgress))
        )
        continue
      }

      const archiveName = basename(inpFile, '.inp') + '.zip'
      const content = readFileSync(inpFile, 'utf-8')
      const lines = content.split('\n').filter(l => l.trim())

      for (let i = 0; i < lines.length; i += chunkSize) {
        const batch = lines.slice(i, i + chunkSize)
        const parsedBooks = []
        for (const line of batch) {
          const book = parseLine(line.replace(/\r$/, ''), archiveName)
          if (book) parsedBooks.push(book)
        }

        const insertBatch = db.transaction((books) => {
          for (const book of books) {
            try {
              insertBook.run(
                book.bookId, book.libId, book.title, book.series || null,
                book.seriesNum || null, book.fileSize, book.format,
                book.dateAdded || null, book.lang,
                book.keywords || null, book.archiveName, relativeFolder
              )
              const authorNames = []
              for (const author of book.authors) {
                insertAuthor.run(author.lastName, author.firstName || '', author.middleName || '')
                const row = getAuthorId.get(author.lastName, author.firstName || '', author.middleName || '')
                if (row) insertBookAuthor.run(book.bookId, row.id)
                authorNames.push([author.lastName, author.firstName, author.middleName].filter(Boolean).join(' '))
              }
              for (const genreCode of book.genres) {
                insertGenre.run(genreCode, getGenreName(genreCode))
                const row = getGenreId.get(genreCode)
                if (row) insertBookGenre.run(book.bookId, row.id)
              }
              insertFts.run(book.bookId, book.title, authorNames.join(', '), book.series || '')
              totalImported++
            } catch (_) { }
          }
        })

        insertBatch(parsedBooks)

        await new Promise(r => setTimeout(r, 0))
      }

      markProcessed.run(inpFile)

      const overallProgress = (inpxIdx / inpxFiles.length) * 100
        + ((fileIdx + 1) / inpFiles.length) * (100 / inpxFiles.length)
      progress(
        `Импортировано ${totalImported.toLocaleString('ru')} книг (файл ${fileIdx + 1}/${inpFiles.length}, архив ${inpxIdx + 1}/${inpxFiles.length})`,
        Math.min(99, Math.round(overallProgress))
      )
    }
  }

  db.prepare(`
    INSERT OR REPLACE INTO import_status (id, total_books, imported_at, status)
    VALUES (1, ?, CURRENT_TIMESTAMP, 'done')
  `).run(totalImported)

  await execAsync(`rm -rf "${tmpDir}"`).catch(() => { })
  db.close()

  post('done', { imported: totalImported })
}

run().catch(err => {
  post('error', { message: err.message })
  process.exit(1)
})
