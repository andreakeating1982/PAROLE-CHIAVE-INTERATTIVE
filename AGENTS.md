# AGENTS — Guida per agenti IA

Questa repository contiene **PAROLE CHIAVE INTERATTIVE**, un'app full-stack per quiz in classe (docente + studenti in tempo reale, codice classe, report PDF).

## Da dove partire (leggi i file giusti per il tuo compito)

| Compito | File da leggere |
|---|---|
| Ricostruire l'app identica da zero | `REBUILD.md` |
| Cambiare le domande (contenuto / numero / tipologia) | `ADATTARE.md` |
| Pubblicare su Render | `RENDER.md` (+ `render.yaml`) |
| Misure di accessibilità riusabili | `ACCESSIBILITA.md` |
| Embed su Blogger (cornice dinamica) | `cornice-dinamica/README.md` |

## Fatti essenziali

- **Package manager**: `pnpm` (non npm/yarn).
- **Stack**: Vite + React 19 + TypeScript + TailwindCSS 4 + tRPC 11 + Drizzle ORM (PostgreSQL) + Better Auth.
- **Comandi**: `pnpm check` (tipi), `pnpm build` (produzione), `pnpm start` (avvio), `pnpm db:push` (tabelle DB).
- **Domande**: `server/questions.ts`. Mantieni sincronizzata la copia mirror alla radice `questions.ts` (verifica con `diff`).
- **Variabili obbligatorie**: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `TRUSTED_ORIGINS`.

## Regole

1. Modifica sempre i file **canonici** (`server/`, `client/`); se esiste una copia mirror alla radice, tienila allineata.
2. Esegui `pnpm check` prima di concludere qualsiasi modifica.
3. Non fare deploy in produzione nella stessa risposta in cui hai scritto codice: prima preview, poi conferma esplicita dell'utente.
4. L'accessibilità (font OpenDyslexic, barra 5 moduli, TTS, alto contrasto, righello, ARIA, CORS font) è una parte **obbligatoria** dell'app: non rimuoverla quando adatti le domande.
