'use strict';

const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(path.join(DATA_DIR, 'app.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS applicants (
    id                 TEXT PRIMARY KEY,
    created_at         TEXT NOT NULL,
    name               TEXT,
    contact            TEXT,
    hobbys             TEXT,           -- JSON array
    redflags           TEXT,           -- JSON: { gewaehlt: [...] }
    bare_minimum       TEXT,           -- JSON array
    raetsel            TEXT,           -- JSON: { frage: antwort }
    quiz_antworten     TEXT,           -- JSON array
    geld_wirklich_gezahlt INTEGER NOT NULL DEFAULT 0,
    score              INTEGER NOT NULL DEFAULT 0,
    bestanden          INTEGER NOT NULL DEFAULT 0,
    verdict            TEXT,
    gruende            TEXT,           -- JSON array von Begründungen
    files              TEXT            -- JSON: { feld: relativerPfad }
  );
`);

const stmts = {
  insert: db.prepare(`
    INSERT INTO applicants (
      id, created_at, name, contact, hobbys, redflags, bare_minimum,
      raetsel, quiz_antworten, geld_wirklich_gezahlt, score, bestanden,
      verdict, gruende, files
    ) VALUES (
      @id, @created_at, @name, @contact, @hobbys, @redflags, @bare_minimum,
      @raetsel, @quiz_antworten, @geld_wirklich_gezahlt, @score, @bestanden,
      @verdict, @gruende, @files
    )
  `),
  list: db.prepare(`
    SELECT id, created_at, name, bestanden, score, verdict
    FROM applicants ORDER BY created_at DESC
  `),
  getById: db.prepare(`SELECT * FROM applicants WHERE id = ?`),
  deleteById: db.prepare(`DELETE FROM applicants WHERE id = ?`),
};

module.exports = {
  db,
  insertApplicant(record) {
    stmts.insert.run(record);
  },
  listApplicants() {
    return stmts.list.all();
  },
  getApplicant(id) {
    return stmts.getById.get(id);
  },
  deleteApplicant(id) {
    return stmts.deleteById.run(id);
  },
};
