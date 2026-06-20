# Antonia ♥ – Satire-Dating-Plattform

Eine augenzwinkernde Dating-Plattform, auf der es genau **eine** Single gibt: Antonia.
Bewerber durchlaufen ein absurdes „Qualitäts-Gauntlet" aus Checkboxen, Uploads,
einem PayPal-Paradox, Rätseln, einem 10-teiligen Freunde-Quiz und einer
Foto-Verifizierung. Antonia sichtet die Bewerbungen im Admin-Bereich.

> ⚠️ **Satire.** Es fließt **kein echtes Geld**. Hochgeladene Dateien werden für die
> „Bewerbung" gespeichert – betreibe das nur mit klarem Hinweis an die Nutzer.

## Features

- **Mehrstufiger Wizard** (Frontend, Vanilla JS) mit Fortschrittsbalken
- **Red-Flag-Selbstauskunft** & **Bare-Minimum-Liste** (Checkboxen, inkl. Fallen)
- **4 echte Uploads**: Lohnabrechnung, eidesstattliche Erklärung der Eltern,
  Bettwäsche-Foto, Verifizierungs-Selfie (Webcam mit Datei-Fallback)
- **PayPal-Paradox** (simuliert): wer *wirklich* „zahlt", wird disqualifiziert
- **Rätsel** und **10-teiliges Freunde-Gespräch** (prüft Rückfragen)
- **Admin-Bereich** (`/admin`): Bewerberliste, Detailansicht, Datei-Download, Löschen

## Lokal starten

```bash
npm install
cp .env.example .env        # ADMIN_PASSWORD & SESSION_SECRET setzen
npm start                   # http://localhost:3000
```

- Bewerbung: <http://localhost:3000>
- Admin: <http://localhost:3000/admin> (Passwort aus `ADMIN_PASSWORD`)

## Konfiguration (`.env`)

| Variable         | Bedeutung                                          |
|------------------|----------------------------------------------------|
| `ADMIN_PASSWORD` | Passwort für den Admin-Bereich                     |
| `SESSION_SECRET` | Geheimnis zum Signieren des Login-Cookies          |
| `PORT`           | Port (Standard 3000)                               |

## Datenspeicherung & Datenschutz

- Bewerberdaten: **SQLite** unter `data/app.db`
- Uploads: `uploads/<bewerberId>/`
- Beides ist in `.gitignore` und wird **nie** committet.
- Löschen im Admin entfernt Datensatz **und** zugehörige Dateien.
- Lohnabrechnungen & eidesstattliche Erklärungen sind sensible echte Daten –
  bei öffentlichem Betrieb Impressum/Datenschutzerklärung ergänzen und die
  Seite klar als Satire kennzeichnen.

## Deploy (später, auf einen Server)

Lauffähig überall, wo Node 18+ läuft (VPS, Render, Railway …):

1. Repo klonen, `npm install --omit=dev`
2. `ADMIN_PASSWORD` und `SESSION_SECRET` als Umgebungsvariablen setzen
3. `node server.js` (z. B. via **PM2**: `pm2 start server.js --name antonia`)
4. Hinter einen Reverse-Proxy (nginx/Caddy) mit HTTPS hängen
5. **Persistente Volumes** für `uploads/` und `data/` einplanen, sonst gehen
   Bewerbungen beim Neustart verloren.

## Tech-Stack

Node.js · Express · multer · better-sqlite3 · Vanilla HTML/CSS/JS (kein Build-Step).
