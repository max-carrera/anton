# node:20-bookworm-slim liefert prebuilt better-sqlite3 (kein Compiler nötig).
FROM node:20-bookworm-slim

WORKDIR /app

# Abhängigkeiten zuerst (besseres Layer-Caching).
COPY package*.json ./
RUN npm ci --omit=dev

# Anwendungscode.
COPY . .

# Laufzeit-Ordner; werden im Betrieb über Volumes persistiert.
RUN mkdir -p uploads data

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
