# 🔧 REBUILD — Ricostruzione identica dell'app (guida per IA e umani)

Questo documento spiega come **ricostruire esattamente la stessa app** partendo da una repository GitHub. È scritto per un agente IA che può eseguire i comandi, ma è leggibile anche da un umano.

---

## Cos'è questa app

**PAROLE CHIAVE INTERATTIVE** è un'app full-stack per quiz in classe (docente + studenti in tempo reale, codice classe, report PDF):

- **Frontend** — Vite + React 19 + TypeScript + TailwindCSS 4 (cartella `client/`)
- **Backend** — Express + tRPC 11 + Drizzle ORM + Better Auth (cartella `server/`)
- **Database** — PostgreSQL (schema in `drizzle/schema.ts`)
- **PDF** — generati lato client con `jspdf`/`pdf-lib` (`client/src/lib/reportPdf.ts`)
- **Cornice dinamica** per embed su Blogger — cartella `cornice-dinamica/`

Il server Express serve anche il client compilato (deploy single-process: una sola porta).

---

## Requisiti

- **Node.js 20+** (consigliato 22)
- **pnpm 10** (package manager dichiarato in `package.json` → campo `packageManager`)
- **PostgreSQL** raggiungibile via `DATABASE_URL` (Neon, Supabase, Render PostgreSQL, ecc.)

---

## Passi di ricostruzione

### 1. Clona la repository

```bash
git clone https://github.com/TUO-UTENTE/TUA-REPO.git
cd TUA-REPO
```

### 2. Installa le dipendenze

```bash
pnpm install
```

### 3. Configura le variabili d'ambiente

Crea un file `.env` alla radice del progetto (vedi `.env.example`):

```
DATABASE_URL=postgres://...                          # OBBLIGATORIO
BETTER_AUTH_SECRET=...                               # OBBLIGATORIO — genera con: openssl rand -base64 32
TRUSTED_ORIGINS=https://tuo-dominio.example.com      # OBBLIGATORIO in produzione (comma-separato)
PORT=3000                                            # opzionale (default 3000)
```

Variabili **opzionali** (servono solo se usi quelle feature): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_PROXY_URL`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_PUBLIC_URL`, `STORAGE_KEY_PREFIX`, `EASY_PEASY_API_KEY`, `OAUTH_PROXY_SECRET`.

### 4. Crea le tabelle del database (solo la prima volta)

```bash
pnpm db:push
```

(equivale a `drizzle-kit generate && drizzle-kit migrate`; richiede il file `drizzle.config.ts` alla radice, già incluso nel pacchetto.)

### 5. Verifica la compilazione TypeScript

```bash
pnpm check
```

### 6. Build di produzione

```bash
pnpm build
```

Produce:
- `dist/public/` → client compilato (Vite)
- `dist/index.js` → server compilato (esbuild di `server/_core/index.ts`)

### 7. Avvio

```bash
pnpm start
```

(equivale a `NODE_ENV=production node dist/index.js`). L'app è servita su `http://localhost:3000` (o sulla porta in `PORT`).

---

## Struttura dei file chiave

| Ruolo | Percorso |
|---|---|
| Domande del quiz | `server/questions.ts` |
| Logica server (grading, sessioni, classi) | `server/routers.ts` |
| UI docente | `client/src/pages/TeacherPage.tsx` |
| UI studente | `client/src/pages/StudentQuiz.tsx` |
| Report PDF | `client/src/lib/reportPdf.ts` |
| Barra accessibilità | `client/src/components/AccessibilityToolbar.tsx` |
| Stato accessibilità | `client/src/contexts/AccessibilityContext.tsx` |
| Lettura ad alta voce (TTS) | `client/src/hooks/useReadAloud.ts` |
| Audio docente (player auto-stop) | `client/src/components/AudioPlayer.tsx` + `client/src/lib/audioData.ts` |
| Embed altezza dinamica | `client/src/lib/heightSync.ts` |
| Font OpenDyslexic (TTF + WOFF2) | `client/public/fonts/` |
| Cornice dinamica (embed Blogger) | `cornice-dinamica/` |
| Documento accessibilità | `ACCESSIBILITA.md` |

---

## Verifica che l'app sia identica

- `pnpm check` termina **senza errori**.
- `pnpm build` termina **senza errori**.
- Avviando `pnpm start`, la Home mostra «PAROLE CHIAVE INTERATTIVE»; il docente può creare una classe e lo studente entra con il codice classe.

Per **cambiare le domande** (contenuto, numero o tipologia) → vedi **ADATTARE.md**.
Per **pubblicare su Render** → vedi **RENDER.md**.
Per le **misure di accessibilità riusabili** → vedi **ACCESSIBILITA.md**.
