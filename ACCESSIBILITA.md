# ♿ ACCESSIBILITÀ — PAROLE CHIAVE SORGENTE

Misure di accessibilità e inclusività (DSA / BES / ipovisione / screen reader)
portate dall'app di riferimento **QUIZ-INTERATTIVO-SENZA-AUDIO-SHAKESPEARE**
(github.com/andreakeating1982/QUIZ-INTERATTIVO-SENZA-AUDIO-SHAKESPEARE) e
adattate alla palette plum/gold dell'app PAROLE CHIAVE.

---

## 0. Sintesi

| Misura | File chiave |
|---|---|
| Font **OpenDyslexic** (UI + PDF) | `client/public/fonts/` + `@font-face` in `client/src/index.css` |
| **Barra accessibilità** 5 moduli (FONT / INTERLINEA / RIGHELLO / MODALITÀ / ASCOLTO) | `client/src/components/AccessibilityToolbar.tsx` + `client/src/contexts/AccessibilityContext.tsx` |
| **Lettura ad alta voce (TTS)** italiano | `client/src/hooks/useReadAloud.ts` |
| **Screen reader** (ARIA) | `AccessibilityToolbar.tsx` (aria-label, role, sr-only, live region) |
| **Focus visibile** | classi `focus-visible` |
| **`prefers-reduced-motion`** | `client/src/index.css` |
| **Alto contrasto** | classe `lf-hc` su `<html>` + CSS |
| **Banda di lettura (righello)** | classe `lf-ruler` + `AccessibilityContext` |
| **Altezza dinamica embed** | `client/src/lib/heightSync.ts` + classi `lf-embedded` |
| **CORS font** | middleware `/fonts` in `server/_core/index.ts` |
| **PDF accessibili** (report + quiz in bianco) | `client/src/lib/reportPdf.ts` |

---

## 1. Font OpenDyslexic

- File auto-ospitati in `client/public/fonts/`: TTF/OTF per la UI + **WOFF2** (`OpenDyslexic-Regular-v2.woff2`, `OpenDyslexic-Bold-v2.woff2`) per la cornice dinamica Blogger, tutti serviti da `/fonts/*`.
- `@font-face` in `client/src/index.css`; `font-display: swap`.
- Applicato a tutta la UI con fallback su `Cambria, Georgia, "Times New Roman", serif`.
- **Incorporato anche nei PDF** via `jsPDF.addFont` (base64) in `reportPdf.ts`,
  con fallback automatico su `times` se il fetch del font fallisce.

## 2. Barra di accessibilità (5 moduli)

Fissa su tutte le pagine (`App.tsx` → `AccessibilityProvider` + `AccessibilityToolbar`):

- **FONT** — A− / A+ (scala 80%–160%, variabile `--lf-scale`).
- **INTERLINEA** — cicla 1,5 → 1,65 → 1,9 → 2,2 → 2,6 (variabile `--lf-lh`).
- **RIGHELLO** — banda di lettura che segue il puntatore (`lf-ruler`).
- **MODALITÀ** — Normale / Alto contrasto (`lf-hc`).
- **ASCOLTO** — avvia/interrompe la lettura ad alta voce.

Impostazioni salvate in `localStorage` (chiave `sq_access`) e riapplicate all'avvio.

## 3. Lettura ad alta voce (TTS)

`useReadAloud.ts` usa l'API Web Speech (`speechSynthesis`):

- seleziona la migliore voce italiana disponibile;
- legge tutta la pagina (incluse le opzioni di risposta dei `<button>`);
- converte le parole MAIUSCOLE in minuscolo (lettura naturale);
- legge le date in forma naturale («01/09/2026» → «primo settembre duemilaventisei»);
- esclude toolbar, canvas, svg e script.

## 4. Screen reader (ARIA)

Nella barra di accessibilità:

- icone `aria-hidden="true"` (decorative);
- capsule `role="group"` con `aria-label` descrittivo;
- pulsante ASCOLTO con nome accessibile «Ascolto» + `aria-pressed`;
- descrizione introduttiva `sr-only`;
- live region `role="status"` all'avvio.

## 5. Focus, movimento, contrasto

- `:focus-visible` con outline 3px ad alto contrasto.
- `prefers-reduced-motion: reduce` disattiva animazioni e transizioni.
- `::selection` ad alto contrasto.
- `html.lf-hc` attiva il filtro alto contrasto + fondo bianco.
- `html.lf-ruler` mostra la banda di lettura.

## 6. Embed (altezza dinamica) + CORS font

- `heightSync.ts` inizializzato in `main.tsx`: quando l'app è in iframe invia
  `labvisivo:height` (con token `cornice`, SENZA retro-compatibilità), risponde
  al ping `labvisivo:ping` e rispecchia il token `?cornice=...`.
- `html.lf-embedded` disattiva i `min-h-screen`/`100vh` (evita il loop di crescita).
- Middleware `/fonts` in `server/_core/index.ts` aggiunge
  `Access-Control-Allow-Origin: *` per il caricamento cross-origin del font.

## 7. PDF accessibili

`reportPdf.ts` (report per studente + questionario in bianco):

- **Font OpenDyslexic** incorporato, minimo **14 pt** (15 pt per i titoli).
- **Interlinea 1,5** (ridotta automaticamente a 1,15 solo se un contenuto
  eccezionale non entra in una facciata — preflight reale su documento di prova).
- **Una facciata A4 per studente** garantita dal preflight.
- **Simboli vettoriali ✔ (verde) / ✘ (rossa)** subito dopo la lettera
  dell'opzione scelta, opzione esatta in verde → il significato NON dipende
  dal solo colore; **legenda** in fondo.
- **Box PUNTEGGIO** su un'unica linea centrata, cornice **blu** con margini
  stretti (`PUNTEGGIO: X/10 — ogni risposta corretta = 1 pt — massimo 10/10`),
  mai spezzato tra due facciate; dimensione del font adattiva per restare su
  una riga.
- **Multi-risposta** (`correctAnswer` = `"opt1||opt2"`) gestita per-opzione.
