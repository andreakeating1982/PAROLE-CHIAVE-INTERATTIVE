# 🧩 ADATTARE — Creare varianti dell'app con set di domande diversi (guida per IA)

Questo documento spiega come **modificare l'app per usare un set di domande diverso**, cambiando — anche in combinazione — tre aspetti:

1. **contenuto** delle domande;
2. **numero** di domande;
3. **tipologia** delle domande: **VERO/FALSO**, **risposta multipla a 3–4 opzioni**, **fill-in-the-blanks strutturato**, **abbinamento immagine-parola**, **riordino della parola**, **risposta breve di una parola**.

Il principio è **ripartire dalla stessa app** (vedi `REBUILD.md`) e cambiare **solo la parte "domande"**, lasciando invariati: dashboard docente, codici classe, sessioni, contatore studenti attivi, report PDF e accessibilità.

---

## 1. Come funziona OGGI la domanda

Le domande vivono in `server/questions.ts` nell'array `SHAKESPEARE_QUESTIONS`. Ogni elemento ha:

```ts
{
  number: 1,
  question: "MAPA 1 - EL AUTOR",
  options: ["Realismo magico", "Romanticismo", "Rinascimento galiziano"],
  correctAnswer: "Rinascimento galiziano"      // stringa → risposta singola
  // in alternativa: correctAnswer: ["A", "B"] // array   → multi-risposta
}
```

**Non esiste un campo `type`**: il tipo è *implicito* (risposta multipla; multi-risposta se `correctAnswer` è un array). Questa è la cosa che cambia nella **Variante C**.

- **Grading** → `server/routers.ts`: la funzione `getCorrectAnswers(questionNumber)` normalizza `correctAnswer` in array; 1 risposta corretta → confronto esatto singolo; N risposte corrette → confronto esatto di insieme.
- **Rendering** → `client/src/pages/StudentQuiz.tsx`: bottoni per ogni `option`; le multi-risposta usano un `Set` e la costante `MULTI_ANSWER_COUNT`.
- **PDF** → `client/src/lib/reportPdf.ts`: stampa le opzioni con simboli ✔/✘ (le multi-risposta usano il separatore `||`).

---

## 2. Variante A — Cambiare solo il CONTENUTO (stessa struttura)

Se vuoi **solo domande diverse ma con lo stesso schema** (8 domande, MAPA 1 = 1–5, MAPA 2 = 6–8, multi-risposta sulle domande 4 e 5), modifica **solo** `server/questions.ts` mantenendo la forma attuale.

Attenzione: mantieni sincronizzata anche la **copia mirror** `questions.ts` alla radice del progetto (devono restare identiche). Verifica con:

```bash
diff questions.ts server/questions.ts
```

> In un ambiente Easy-Peasy AI esiste anche lo script `rebuild_app.py` (nella skill «parole-chiave-sorgente») che automatizza questa variante partendo da un JSON. Su una repository GitHub generica, invece, modifica direttamente `server/questions.ts`.

---

## 3. Variante B — Cambiare il NUMERO di domande

1. Aggiungi o rimuovi elementi in `server/questions.ts`.
2. In `server/routers.ts` la costante `TOTAL_QUESTIONS` è già calcolata come `SHAKESPEARE_QUESTIONS.length`, quindi **si adatta da sola**.
3. ⚠️ I **filtri MAPA sono hardcoded** in `client/src/pages/StudentQuiz.tsx` (intervalli `1–5` per MAPA 1 e `6–8` per MAPA 2). Se cambi il numero totale, aggiorna questi intervalli.
4. Se cambi il conteggio, aggiorna anche il testo del box PUNTEGGIO (`massimo X/10`) in `client/src/lib/reportPdf.ts`.

---

## 4. Variante C — Cambiare la TIPOLOGIA delle domande

Per supportare nuove tipologie serve un **campo `type` esplicito**. Ecco il pattern consigliato (in 6 passi).

### 4.1 Aggiungi il tipo `QuestionType`

In `server/questions.ts` (o in un file di tipi condiviso) definisci:

```ts
type QuestionType =
  | "multiple"     // risposta multipla 3-4 opzioni (già supportata)
  | "truefalse"    // VERO/FALSO
  | "fillblank"    // fill-in-the-blanks strutturato
  | "match"        // abbinamento immagine-parola
  | "reorder"      // riordino della parola
  | "shortanswer"; // risposta breve (una parola)
```

Ogni domanda diventa `{ number, type, question, ...campi specifici del tipo }`.

### 4.2 Forma dei dati per ciascuna tipologia

**VERO/FALSO** (`truefalse`) — due opzioni fisse:

```ts
{ number: 1, type: "truefalse", question: "Rosalía de Castro è nata a Santiago de Compostela", options: ["Vero", "Falso"], correctAnswer: "Vero" }
```

**Risposta multipla** (`multiple`) — invariata (3 o 4 opzioni):

```ts
{ number: 2, type: "multiple", question: "A quale movimento appartiene?", options: ["Romanticismo", "Realismo", "Barocco", "Verismo"], correctAnswer: "Romanticismo" }
// multi-risposta: correctAnswer: ["Romanticismo", "Rinascimento galiziano"]
```

**Fill-in-the-blanks strutturato** (`fillblank`) — una frase con segnaposto `___`; le risposte nell'ordine dei segnaposto:

```ts
{ number: 3, type: "fillblank", question: "Rosalía scrisse ___ e difese la ___", blanks: 2, correctAnswer: ["Lieders", "libertà"] }
```

**Abbinamento immagine-parola** (`match`) — coppie (immagine → parola) che lo studente deve abbinare:

```ts
{ number: 4, type: "match", question: "Abbina ogni immagine alla parola giusta", pairs: [
  { image: "/img/sole.png",  word: "sole" },
  { image: "/img/luna.png",  word: "luna" },
] }
```

**Riordino della parola** (`reorder`) — lettere (o parole) mescolate da riordinare:

```ts
{ number: 5, type: "reorder", question: "Riordina le lettere per formare la parola", scrambled: "eols", correctAnswer: "sole" }
```

**Risposta breve di una parola** (`shortanswer`) — input di testo con una sola parola:

```ts
{ number: 6, type: "shortanswer", question: "Come si intitola la raccolta poetica principale?", correctAnswer: "Follas Novas" }
```

### 4.3 Aggiorna il GRADING (server)

In `server/routers.ts` fai sì che la verifica gestisca ogni tipo:

- `truefalse` / `multiple` singola → confronto **esatto** di stringa;
- `multiple` multi / `fillblank` / `match` → confronto **esatto di insieme/ordine**;
- `reorder` / `shortanswer` → confronto **normalizzato** (`.trim().toLowerCase()`, ignorando maiuscole e spazi).

Mantieni il contratto esistente: la risposta dello studente arriva come `selectedAnswer` (stringa; per le multi-risposta separata da `||`). Per i nuovi tipi puoi estendere il payload (es. un array di risposte per `match` e `fillblank`) **e** la funzione che restituisce le risposte corrette.

### 4.4 Aggiorna il RENDERING (client)

In `client/src/pages/StudentQuiz.tsx` oggi esiste solo il ramo `multiple`. Aggiungi un ramo per ogni `type`:

- `truefalse` → due bottoni «Vero» / «Falso»;
- `fillblank` → tanti campi di input quanti sono i `blanks`;
- `match` → coppie cliccabili (o menu a tendina) immagine↔parola;
- `reorder` → blocchi/lettere trascinabili (o un campo di testo);
- `shortanswer` → un campo di testo.

### 4.5 Aggiorna il PDF

In `client/src/lib/reportPdf.ts` la stampa attuale assume `options` + `correctAnswer`. Per i nuovi tipi stampa **in forma testuale** la risposta data vs quella esatta, mantenendo i simboli vettoriali ✔/✘ e la legenda (vedi `ACCESSIBILITA.md`): il significato non deve mai dipendere solo dal colore.

### 4.6 Verifica e deploy

```bash
pnpm check     # nessun errore TypeScript
pnpm build     # build di produzione
```

Poi deploy di **preview** e test di **ogni tipologia**, infine deploy di **produzione** (solo dopo conferma esplicita).

---

## 5. Riepilogo dei file da toccare

| Cosa cambi | File |
|---|---|
| Dati domande + campo `type` | `server/questions.ts` (+ mirror radice `questions.ts`) |
| Grading / `TOTAL_QUESTIONS` | `server/routers.ts` |
| Filtri MAPA + rendering per tipologia | `client/src/pages/StudentQuiz.tsx` |
| PDF per tipologia | `client/src/lib/reportPdf.ts` |
| Titolo UI / titolo PDF | `client/index.html`, pagine in `client/src/pages/`, `reportPdf.ts` |

**Regola d'oro**: modifica i file *canonici* (dentro `server/` e `client/`) e mantieni sempre allineate le eventuali copie mirror alla radice con `diff`.
