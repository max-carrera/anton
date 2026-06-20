'use strict';

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const store = require('./db');

// --- Konfiguration ---------------------------------------------------------
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'antonia-ist-die-beste';
const SESSION_SECRET =
  process.env.SESSION_SECRET || 'bitte-aendern-lange-zufalls-zeichenkette';

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Erlaubte Upload-Felder (müssen mit dem Frontend übereinstimmen).
const UPLOAD_FIELDS = ['lohnabrechnung', 'eltern_erklaerung', 'bettwaesche', 'selfie'];
const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf',
]);

// --- Multer (Datei-Uploads) ------------------------------------------------
// Wir speichern zunächst in einen temporären Ordner und verschieben die
// Dateien nach dem Anlegen des Datensatzes in uploads/<applicantId>/.
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const tmp = path.join(UPLOAD_DIR, '_tmp');
      if (!fs.existsSync(tmp)) fs.mkdirSync(tmp, { recursive: true });
      cb(null, tmp);
    },
    filename: (req, file, cb) => {
      const safeExt = path.extname(file.originalname).replace(/[^.a-zA-Z0-9]/g, '');
      cb(null, `${crypto.randomUUID()}${safeExt}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: UPLOAD_FIELDS.length }, // 12 MB / Datei
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Dateityp nicht erlaubt: ${file.mimetype}`));
  },
});

// --- App -------------------------------------------------------------------
const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// ---------------------------------------------------------------------------
// Bewertungs-/Disqualifikations-Logik
// ---------------------------------------------------------------------------
function bewerten(data, files) {
  const gruende = [];
  let score = 100;
  let bestanden = true;

  // 1. Job: Lohnabrechnung muss hochgeladen sein.
  if (!files.lohnabrechnung) {
    bestanden = false;
    gruende.push('Keine Lohnabrechnung hochgeladen – Job nicht nachgewiesen.');
  }

  // 2. Hobbys: mindestens 2.
  const hobbys = Array.isArray(data.hobbys) ? data.hobbys.filter(Boolean) : [];
  if (hobbys.length < 2) {
    bestanden = false;
    gruende.push('Weniger als 2 Hobbys angegeben.');
  }

  // 3. Wohnsituation: eidesstattliche Erklärung der Eltern.
  if (!files.eltern_erklaerung) {
    bestanden = false;
    gruende.push('Keine eidesstattliche Erklärung der Eltern – wohnt evtl. noch zu Hause.');
  }

  // 4. Bettwäsche-Foto.
  if (!files.bettwaesche) {
    bestanden = false;
    gruende.push('Kein Bettwäsche-Foto – Polyester-Verdacht nicht ausgeräumt.');
  }

  // 5. Selfie / Foto-Verifizierung.
  if (!files.selfie) {
    bestanden = false;
    gruende.push('Keine Foto-Verifizierung abgeschlossen.');
  }

  // 6. PayPal-Paradox: wer wirklich zahlt, geht schlecht mit Geld um.
  if (data.geld_wirklich_gezahlt) {
    bestanden = false;
    score -= 50;
    gruende.push('Hat wirklich 10 € überwiesen → geht schlecht mit Geld um. Disqualifiziert.');
  }

  // 7. Red-Flag-Fallen: angekreuzte Fallen kosten Punkte.
  const redFallen = Array.isArray(data.redflags && data.redflags.fallen)
    ? data.redflags.fallen
    : [];
  if (redFallen.length > 0) {
    score -= redFallen.length * 20;
    if (score < 50) bestanden = false;
    gruende.push(`Rote Flaggen entdeckt: ${redFallen.join(', ')}.`);
  }

  // 8. Freunde-Quiz: stellt er Rückfragen? (mindestens 3 Antworten mit "?")
  const quiz = Array.isArray(data.quiz_antworten) ? data.quiz_antworten : [];
  const rueckfragen = quiz.filter((a) => typeof a === 'string' && a.includes('?')).length;
  if (rueckfragen < 3) {
    score -= 20;
    gruende.push('Stellt kaum Rückfragen – kann schlecht mit Antonias Freund:innen reden.');
    if (score < 50) bestanden = false;
  }

  score = Math.max(0, Math.min(100, score));

  let verdict;
  if (bestanden) {
    verdict = `Bestanden mit ${score}/100. Antonia prüft persönlich. 💖`;
  } else if (data.geld_wirklich_gezahlt) {
    verdict = 'Disqualifiziert: hat tatsächlich Geld überwiesen. 💸';
  } else {
    verdict = `Leider durchgefallen (${score}/100). Bare Minimum nicht erfüllt.`;
  }

  return { score, bestanden, verdict, gruende };
}

// ---------------------------------------------------------------------------
// Öffentliche API
// ---------------------------------------------------------------------------
app.post('/api/apply', upload.fields(UPLOAD_FIELDS.map((name) => ({ name, maxCount: 1 }))), (req, res) => {
  let data;
  try {
    data = JSON.parse(req.body.payload || '{}');
  } catch (e) {
    return res.status(400).json({ error: 'Ungültige Bewerbungsdaten.' });
  }

  const id = crypto.randomUUID();
  const applicantDir = path.join(UPLOAD_DIR, id);
  fs.mkdirSync(applicantDir, { recursive: true });

  // Dateien aus dem temporären Ordner in den Bewerber-Ordner verschieben.
  const files = {};
  for (const field of UPLOAD_FIELDS) {
    const f = req.files && req.files[field] && req.files[field][0];
    if (f) {
      const dest = path.join(applicantDir, path.basename(f.path));
      fs.renameSync(f.path, dest);
      files[field] = path.relative(UPLOAD_DIR, dest);
    }
  }

  const { score, bestanden, verdict, gruende } = bewerten(data, files);

  const record = {
    id,
    created_at: new Date().toISOString(),
    name: (data.name || '').toString().slice(0, 200),
    contact: (data.contact || '').toString().slice(0, 200),
    hobbys: JSON.stringify(data.hobbys || []),
    redflags: JSON.stringify(data.redflags || {}),
    bare_minimum: JSON.stringify(data.bare_minimum || []),
    raetsel: JSON.stringify(data.raetsel || {}),
    quiz_antworten: JSON.stringify(data.quiz_antworten || []),
    geld_wirklich_gezahlt: data.geld_wirklich_gezahlt ? 1 : 0,
    score,
    bestanden: bestanden ? 1 : 0,
    verdict,
    gruende: JSON.stringify(gruende),
    files: JSON.stringify(files),
  };

  store.insertApplicant(record);

  res.json({
    id,
    bestanden,
    verdict,
    message:
      'Deine Bewerbung ist eingegangen. Wir prüfen sie sorgfältig und melden uns. ' +
      '(Voraussichtliche Bearbeitungszeit: 6–8 Monate.)',
  });
});

// ---------------------------------------------------------------------------
// Admin-Authentifizierung (einfaches signiertes Cookie)
// ---------------------------------------------------------------------------
function signToken() {
  const payload = `admin.${Date.now()}`;
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token) return false;
  const idx = token.lastIndexOf('.');
  if (idx < 0) return false;
  const payload = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function requireAdmin(req, res, next) {
  if (verifyToken(req.cookies.admin_session)) return next();
  res.status(401).json({ error: 'Nicht eingeloggt.' });
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  const a = Buffer.from(String(password || ''));
  const b = Buffer.from(ADMIN_PASSWORD);
  const ok = a.length === b.length && crypto.timingSafeEqual(a, b);
  if (!ok) return res.status(401).json({ error: 'Falsches Passwort.' });
  res.cookie('admin_session', signToken(), {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 8, // 8 Stunden
  });
  res.json({ ok: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ ok: true });
});

app.get('/api/admin/me', (req, res) => {
  res.json({ eingeloggt: verifyToken(req.cookies.admin_session) });
});

app.get('/api/admin/applicants', requireAdmin, (req, res) => {
  res.json(store.listApplicants());
});

app.get('/api/admin/applicants/:id', requireAdmin, (req, res) => {
  const row = store.getApplicant(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });
  const parse = (v, fallback) => {
    try { return JSON.parse(v); } catch { return fallback; }
  };
  res.json({
    ...row,
    hobbys: parse(row.hobbys, []),
    redflags: parse(row.redflags, {}),
    bare_minimum: parse(row.bare_minimum, []),
    raetsel: parse(row.raetsel, {}),
    quiz_antworten: parse(row.quiz_antworten, []),
    gruende: parse(row.gruende, []),
    files: parse(row.files, {}),
  });
});

app.get('/api/admin/file/:id/:field', requireAdmin, (req, res) => {
  const { id, field } = req.params;
  if (!UPLOAD_FIELDS.includes(field)) return res.status(400).end();
  const row = store.getApplicant(id);
  if (!row) return res.status(404).end();
  let files = {};
  try { files = JSON.parse(row.files); } catch { /* ignore */ }
  const rel = files[field];
  if (!rel) return res.status(404).end();

  // Pfad-Traversal verhindern: aufgelöster Pfad muss in UPLOAD_DIR liegen.
  const abs = path.resolve(UPLOAD_DIR, rel);
  if (!abs.startsWith(path.resolve(UPLOAD_DIR) + path.sep)) return res.status(400).end();
  if (!fs.existsSync(abs)) return res.status(404).end();
  res.sendFile(abs);
});

app.delete('/api/admin/applicants/:id', requireAdmin, (req, res) => {
  const row = store.getApplicant(req.params.id);
  if (!row) return res.status(404).json({ error: 'Nicht gefunden.' });
  // Hochgeladene Dateien des Bewerbers löschen (Datenschutz).
  const dir = path.join(UPLOAD_DIR, req.params.id);
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  store.deleteApplicant(req.params.id);
  res.json({ ok: true });
});

// --- Statische Dateien & Fehlerbehandlung ----------------------------------
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.use(express.static(path.join(__dirname, 'public')));

// Multer-/sonstige Fehler sauber als JSON ausgeben.
app.use((err, req, res, next) => {
  if (err) return res.status(400).json({ error: err.message || 'Fehler beim Upload.' });
  next();
});

app.listen(PORT, () => {
  console.log(`Antonia-Dating läuft auf http://localhost:${PORT}`);
  console.log(`Admin-Bereich: http://localhost:${PORT}/admin.html`);
});
