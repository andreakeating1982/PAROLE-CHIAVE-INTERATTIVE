# 🚀 RENDER — Trasferire l'app da Easy-Peasy AI a Render (via GitHub)

Questa guida spiega come pubblicare l'app su **Render** usando una repository **GitHub**. Il pacchetto include già un file `render.yaml` (Blueprint) che automatizza quasi tutto.

---

## Prerequisiti

1. Una **repository GitHub** con il contenuto di questo pacchetto (tutta la cartella, non solo i file sorgente).
2. Un account **Render** (render.com) collegato a GitHub.
3. Un **database PostgreSQL** raggiungibile da Render (puoi crearlo direttamente su Render — tipo «PostgreSQL» — oppure usare Neon/Supabase). Ti servirà la **connection string** (`postgres://...`).

---

## Metodo A — Blueprint (consigliato, automatico)

1. Carica il contenuto del pacchetto su GitHub e fai `git push`.
2. Su Render: **New → Blueprint**.
3. Seleziona la repository. Render legge `render.yaml` e crea da solo il Web Service.

Il `render.yaml` incluso imposta:
- runtime **Node**;
- build `pnpm install && pnpm build`;
- start `pnpm start`.

Dopo la creazione, apri il servizio → **Environment** e compila le variabili mancanti (sotto).

---

## Metodo B — Web Service manuale

Se non vuoi usare il Blueprint:

1. Render → **New → Web Service** → collega la repo.
2. Imposta:
   - **Runtime**: Node
   - **Build Command**: `pnpm install --no-frozen-lockfile && pnpm build`
   - **Start Command**: `pnpm start`
3. Aggiungi le variabili d'ambiente (sotto).
4. Crea e distribuisci.

---

## Variabili d'ambiente (obbligatorie)

| Variabile | Valore | Note |
|---|---|---|
| `DATABASE_URL` | `postgres://...` | connection string del database PostgreSQL |
| `BETTER_AUTH_SECRET` | stringa casuale | genera con `openssl rand -base64 32` |
| `TRUSTED_ORIGINS` | `https://tuo-dominio.onrender.com` | dominio pubblico dell'app (comma-separato per più domini) |
| `NODE_ENV` | `production` | impostato automaticamente dallo Start Command |

Variabili **opzionali** (solo se usi le relative feature): `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_MAPS_PROXY_URL`, `STORAGE_*`, `EASY_PEASY_API_KEY`, `OAUTH_PROXY_SECRET`, `PORT`.

---

## Creare le tabelle del database (prima volta)

Il database deve avere le tabelle definite in `drizzle/schema.ts`. Puoi crearle in due modi:

- **Da Render Shell**: apri il servizio → **Shell** ed esegui `pnpm db:push`; oppure
- **Localmente** puntando `DATABASE_URL` al database remoto: `pnpm db:push`.

---

## Comandi chiave

| Scopo | Comando |
|---|---|
| Installa | `pnpm install` |
| Build | `pnpm build` |
| Avvio produzione | `pnpm start` |
| Crea tabelle DB | `pnpm db:push` |
| Verifica tipi | `pnpm check` |

---

## Verifica

- Il deploy termina con stato **Live**.
- Aprendo l'URL pubblico, la Home mostra «PAROLE CHIAVE INTERATTIVE».
- Il docente crea una classe e lo studente entra con il codice classe.

Per l'**embed su Blogger** dopo il deploy, aggiorna la costante `APP_URL` nei file di `cornice-dinamica/` con il nuovo URL Render (cerca `APP_URL` e sostituisci).
