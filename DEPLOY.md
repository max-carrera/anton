# Deploy auf den Contabo-Server (Docker + Nginx Proxy Manager)

> 🔒 **Secrets niemals committen.** Host/User/Passwort und die `.env` bleiben
> ausschließlich auf deinem Rechner bzw. am Server. Diese Datei enthält nur
> Platzhalter (`SERVER_USER`, `SERVER_HOST`, `SUBDOMAIN`).

Die App lauscht im Container auf Port **3000**. Der Nginx Proxy Manager (NPM)
erreicht sie über den **Container-Namen `antonia`** im Docker-Netz
`nginx-reverse-proxy_default`. Der Host-Port **8093** dient nur zum Debuggen.

## 1. Projekt auf den Server bringen (vom Mac)

```bash
# einmalig SSH-Key hinterlegen → danach passwortlos:
ssh-copy-id SERVER_USER@SERVER_HOST

# Code hochladen (ohne node_modules, .git, uploads, data, .env):
rsync -av --delete \
  --exclude node_modules --exclude .git \
  --exclude uploads --exclude data --exclude .env \
  ./ SERVER_USER@SERVER_HOST:~/antonia/
```

## 2. `.env` direkt am Server anlegen (nie ins Repo!)

```bash
ssh SERVER_USER@SERVER_HOST
cd ~/antonia
cat > .env <<'EOF'
ADMIN_PASSWORD=<starkes-passwort>
SESSION_SECRET=<lange-zufalls-zeichenkette>
PORT=3000
EOF
chmod 600 .env
```

## 3. Bauen & starten

```bash
docker compose up -d --build
docker compose logs -f          # prüfen, dass der Server startet
```

## 4. Verifizieren über den **Host-Port** (nicht :3000!)

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8093/        # erwartet 200
curl -s http://localhost:8093/api/admin/me                             # {"eingeloggt":false}
```

> ⚠️ Auf `:3000` läuft auf dieser Box „Queen Larry" (SPA, beantwortet jeden Pfad
> mit 200). Immer über den Host-Port **8093** testen.

## 5. Domain anbinden (einmalig im NPM-Web-UI)

- **Proxy Host** → Domain `SUBDOMAIN.mbcontent.de`
- **Forward Hostname/Port:** `antonia` / `3000` (Container-Name + Container-Port)
- **Websockets Support:** an (Webcam/Live unkritisch, aber schadet nicht)
- **SSL-Tab** → Let's-Encrypt-Zertifikat anfordern + **„Force SSL"**

HTTPS ist Pflicht, weil die Foto-Verifizierung die **Kamera** nutzt
(`getUserMedia` läuft nur im „secure context"). Über die NPM-Domain ist das automatisch erfüllt.

## 6. Update-Workflow (jedes Mal)

```bash
rsync -av --delete \
  --exclude node_modules --exclude .git \
  --exclude uploads --exclude data --exclude .env \
  ./ SERVER_USER@SERVER_HOST:~/antonia/
ssh SERVER_USER@SERVER_HOST 'cd ~/antonia && docker compose up -d --build'
```

## Hinweise (aus der Praxis auf dieser Box)

- **Persistenz:** `uploads/` und `data/` liegen in den Docker-Volumes
  `antonia_uploads` / `antonia_data` → bleiben über Rebuilds/Neustarts erhalten,
  und das `data/`-als-root-Problem beim rsync entfällt (es wird nicht reingersynct).
- **Daten ansehen/sichern:** `docker cp antonia:/app/data/app.db ./backup-app.db`
- **better-sqlite3:** läuft dank `node:20-bookworm-slim` ohne Compiler (prebuilt).
