# 📚 PAROLE CHIAVE SORGENTE — Quiz Interattivo

> **App sorgente** per quiz didattici in classe con tempo reale, sessioni docente, report PDF e doppia mappa (MAPA 1 / MAPA 2). Da questa app si generano **copie identiche** che cambiano **solo il set delle domande**, tramite la skill [`parole-chiave-sorgente`](./skills/parole-chiave-sorgente/SKILL.md).

---

## 🎯 Cosa fa

L'app è un quiz interattivo completo, pensato per la didattica in aula. Gli studenti entrano con un **codice classe a 4 cifre**, inseriscono nome e cognome e rispondono in tempo reale; il docente crea e avvia le classi, scorre le domande, mostra la risposta corretta e genera **report PDF** individuali. Tutto ruota attorno a **otto domande** organizzate in due mappe concettuali: **MAPA 1** (domande 1–5) e **MAPA 2** (domande 6–8).

Le caratteristiche principali:

| Funzionalità | Descrizione |
|---|---|
| **Schermata studente** | Input del codice classe a 4 cifre, nome e cognome; domande a risposta singola e multipla (checkbox); feedback immediato corretto/errato |
| **Schermata docente** | Creazione classi con codice, avvio/sessione, scorrimento domande con AVANTI/INDIETRO, pulsante **MOSTRA** per rivelare la risposta esatta (blocca l'invio degli studenti), monitoraggio in tempo reale, pulsante **STOP** |
| **Dashboard riepilogativa** | Tutte le classi con stato attivo/inattivo (🟢 luce verde), nome, codice e cestino con conferma |
| **Report PDF** | Statistiche per ogni studente con **box PUNTEGGIO** su base 10 |
| **PDF domande vuote** | Questionario stampabile con tutte le domande e il box PUNTEGGIO vuoto da compilare |
| **Rientro studenti** | Stesso nome = stesso utente, risposte già date preservate |
| **Doppia mappa** | Supporto per MAPA 1 e MAPA 2 indipendenti |
| **Embeddabile** | Incorporabile in Blogger o qualsiasi sito tramite iframe con auto-resize |
| **Audio docente** | Riproduzione audio topic-specifico (in `client/public/audio/`) |

---

## 🧱 Struttura del progetto

```
.
├── README.md                            ← Questo file
├── ISTRUZIONI-GITHUB.txt                ← Guida rapida per GitHub
├── skills/
│   └── parole-chiave-sorgente/          ← Skill di clonazione (Marky)
│       ├── SKILL.md
│       ├── scripts/rebuild_app.py       ← Script che genera una nuova app
│       └── templates/questions_example.json
├── package.json                         ← Dipendenze e script (pnpm)
├── pnpm-lock.yaml
├── tsconfig.json / vite.config.ts / vitest.config.ts
├── drizzle.config.ts
├── patches/wouter@3.7.1.patch
├── drizzle/
│   ├── schema.ts                        ← Schema database (classi, studenti, risposte)
│   └── *.sql / meta/                    ← Migrazioni
├── shared/
│   ├── const.ts / types.ts              ← Tipi e costanti condivise
│   └── _core/
├── server/
│   ├── questions.ts                     ← ⭐ LE DOMANDE DEL QUIZ (file canonico)
│   ├── routers.ts                       ← Procedure tRPC (API + punteggio)
│   ├── db.ts / storage.ts               ← Helper database
│   └── _core/                           ← Framework (auth, trpc, vite, etc.)
└── client/
    ├── index.html
    ├── public/audio/                    ← File audio topic-specifico
    └── src/
        ├── pages/
        │   ├── Home.tsx                 ← Schermata iniziale (codice classe)
        │   ├── StudentQuiz.tsx          ← Quiz per lo studente
        │   └── TeacherPage.tsx          ← Pannello docente completo
        ├── lib/
        │   ├── reportPdf.ts             ← ⭐ Generazione PDF report (canonico)
        │   └── audioData.ts / trpc.ts
        └── index.css                    ← Stili globali (Cambria, uppercase)
```

### File canonici vs copie mirror

L'app usa davvero solo **quattro file canonici** per le parti personalizzabili:

| Ruolo | Percorso canonico |
|---|---|
| Domande | `server/questions.ts` |
| Report PDF | `client/src/lib/reportPdf.ts` |
| UI studente | `client/src/pages/StudentQuiz.tsx` |
| UI docente | `client/src/pages/TeacherPage.tsx` |

Quando lo script di clonazione genera una nuova app, crea **una copia mirror alla radice** del clone (`questions.ts`, `reportPdf.ts`, `StudentQuiz.tsx`, `TeacherPage.tsx`) solo per comodità di consultazione. Le copie radice **non sono importate dall'app**: ogni modifica va fatta sui percorsi canonici, e lo script mantiene poi le copie radice allineate (verifica con `diff`).

---

## ✏️ Formato delle domande

Il file `server/questions.ts` contiene tutte le domande. Il formato è:

```ts
export const SHAKESPEARE_QUESTIONS = [
  // ═══ MAPA 1 ═══
  {
    number: 1,
    question: "MAPA 1 - EL AUTOR",
    options: ["Realismo magico", "Romanticismo", "Rinascimento galiziano"],
    correctAnswer: "Rinascimento galiziano",      // risposta singola: stringa
  },
  // ...
  {
    number: 4,                                    // multi-risposta
    question: "MAPA 1 - LIEDERS",
    options: ["Condizione femminile", "Femminismo spagnolo", "Epica", "Teatro"],
    correctAnswer: ["Condizione femminile", "Femminismo spagnolo"],  // array di 2
  },
  // ═══ MAPA 2 ═══
  {
    number: 6,
    question: "MAPA 2 - PÁRRAFO 1",
    options: ["Libertà", "Gloria", "Arte"],
    correctAnswer: "Libertà",
  },
  // ...
];
```

Regole fisse della struttura:

- **8 domande**: MAPA 1 = `number` 1–5, MAPA 2 = `number` 6–8.
- **Multi-risposta SOLO su domande 4 e 5**: `correctAnswer` è un array di 2 stringhe (2 opzioni corrette su 4).
- Tutte le altre domande hanno `correctAnswer` come stringa singola.
- Il numero totale è parametrizzato in `server/routers.ts` (`TOTAL_QUESTIONS = SHAKESPEARE_QUESTIONS.length`), ma i **filtri MAPA in `StudentQuiz.tsx`** (righe 432-433 e 448-449) sono fissi su 1–5 / 6–8: se servono più/meno domande va modificato anche lì.

---

## 🎯 Punteggio (box PUNTEGGIO su 10)

Il punteggio è calcolato su **base 10**:

- Domande a risposta singola (1, 2, 3, 6, 7, 8): **1 punto** ciascuna → 6 punti.
- Domande a multi-risposta (4 e 5): **2 punti** ciascuna (1 per ogni opzione corretta selezionata) → 4 punti.
- **Totale massimo = 10/10**.

Sia il **report PDF** dello studente sia il **PDF domande vuote** riportano un riquadro blu **PUNTEGGIO** in fondo:

- Testata: `Voto: X/10`
- Riquadro: `Punteggio ottenuto: X/10` · `Ogni risposta corretta = 1 pt` · `Punteggio massimo = 10/10`

---

## 🔁 La skill di clonazione (`parole-chiave-sorgente`)

Per generare una **nuova app identica** a questa sorgente cambiando **solo il set delle domande**, si usa la skill [`parole-chiave-sorgente`](./skills/parole-chiave-sorgente/SKILL.md) e il suo script `rebuild_app.py`.

### Passo 1 — Prepara il JSON delle domande

Usa il modello in `skills/parole-chiave-sorgente/templates/questions_example.json`:

```json
{
  "app_title": "PAROLE CHIAVE IL SISTEMA SOLARE",
  "pdf_title": "IL SISTEMA SOLARE",
  "questions": [
    { "number": 1, "question": "MAPA 1 - IL SOLE", "options": ["È una stella", "È un pianeta", "È un satellite"], "correctAnswer": "È una stella" },
    { "number": 4, "question": "MAPA 1 - I GIGANTI GASSOSI", "options": ["Giove", "Mercurio", "Saturno", "Venere"], "correctAnswer": ["Giove", "Saturno"] }
  ]
}
```

- `questions` (obbligatorio): esattamente **8** domande.
- `app_title` / `pdf_title` (opzionali): titolo UI e titolo sui PDF; se omessi restano quelli del sorgente.

### Passo 2 — Lancia lo script

```bash
python skills/parole-chiave-sorgente/scripts/rebuild_app.py \
  --name parole-chiave-sistema-solare \
  --questions percorso/domande.json \
  --app-title "PAROLE CHIAVE IL SISTEMA SOLARE" \
  --pdf-title "IL SISTEMA SOLARE"
```

Lo script copia il progetto (escludendo `node_modules`, `.git`, `dist`, `.env`, log, ZIP e database), scrive le 8 domande, aggiorna i titoli PDF/UI, rinomina `package.json`, inizializza git, esegue `pnpm install` + `pnpm check`, e verifica che le coppie mirror siano identiche.

Flag utili: `--force` (sovrascrivi), `--no-install` (salta install/check), `--source` (sorgente diverso, vedi sotto).

### Passo 3 — Verifica e deploy

1. Verifica mirror (`diff`).
2. `pnpm check` nella nuova cartella.
3. Deploy **preview** e test visivo.
4. Checkpoint.
5. Deploy **produzione** solo dopo conferma esplicita.

**Cosa resta identico:** struttura MAPA 1/2, multi-risposta su 4-5, audio docente, layout docente/studente, codici classe e password, logica sessioni e contatore studenti, report PDF con box PUNTEGGIO, stili CSS. **Cambia solo:** array domande, titoli PDF/UI, `package.json` name, `<title>` browser.

---

## 🌐 Usare la repository GitHub come sorgente

Il flusso pensato per generare nuove app a partire da questo progetto caricato su GitHub:

1. **Carica questo pacchetto su GitHub** (vedi `ISTRUZIONI-GITHUB.txt`): estrai lo ZIP e fai push in una repository **pubblica**.
2. **Chiedi a Marky una nuova app** indicando l'URL della repository.
3. Marky clona direttamente da GitHub e lavora su quella versione:

```bash
python skills/parole-chiave-sorgente/scripts/rebuild_app.py \
  --name parole-chiave-sistema-solare \
  --questions percorso/domande.json \
  --app-title "PAROLE CHIAVE IL SISTEMA SOLARE" \
  --source https://github.com/TUO-USERNAME/TUO-REPO.git
```

In questo modo la nuova app nasce **direttamente dalla versione pubblicata** su GitHub, senza dipendere dai file locali del sandbox.

---

## 🛠️ Sviluppo locale

```bash
# Installa dipendenze
pnpm install

# Avvia in sviluppo (con hot reload)
pnpm dev

# Push migrazioni database
pnpm db:push

# TypeScript check
pnpm check
```

### Variabili d'ambiente

Copia `.env.example` in `.env` e configura:

- `DATABASE_URL` — Connessione al database
- `BETTER_AUTH_SECRET` — Segreto per sessioni/auth (genera con `openssl rand -base64 32`)
- `TRUSTED_ORIGINS` — Origini consentite per CORS/cookie (domini del deploy)
- `EASY_PEASY_API_KEY` — Chiave API Easy-Peasy.AI (per funzionalità AI opzionali)

---

## 📦 Build di produzione

```bash
pnpm build
```

I file generati in `dist/` includono il bundle ottimizzato della SPA e il server Node.js di produzione. Il deploy avviene tramite Easy-Peasy (preview e produzione).

---

## 📄 Licenza

Progetto open source (MIT). Libero di usarlo, modificarlo e adattarlo alle esigenze didattiche.

---

Realizzato da **Andrea Centinaro** · App sorgente **PAROLE CHIAVE SORGENTE**
