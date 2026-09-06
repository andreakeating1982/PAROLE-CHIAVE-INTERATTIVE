---
name: parole-chiave-sorgente
description: "Clona l'app PAROLE CHIAVE SORGENTE (in /home/user/shakespeare-quiz) in una NUOVA app identica con un set di domande diverso. Usare quando l'utente chiede una nuova app simile/uguale alla sorgente cambiando solo le domande (stesso aspetto, MAPA 1/2, codici classe, sessioni, contatore studenti, report PDF con box PUNTEGGIO su 10 e ACCESSIBILITÀ completa: font OpenDyslexic, barra accessibilità 5 moduli, TTS, alto contrasto, righello). Supporta la clonazione da repository GitHub con --source."
---

# PAROLE CHIAVE SORGENTE — Skill di Clonazione

## Overview

Il **PAROLE CHIAVE SORGENTE** è l'app full-stack per quiz in classe (docente + studenti in tempo reale, codice classe, report PDF). Vive in `/home/user/shakespeare-quiz`. Stack: Vite + React 18 + TypeScript + Tailwind + tRPC + Drizzle + PostgreSQL + pdf-lib (scaffold web-db-user).

Questa skill genera una **copia identica** dell'app in una cartella nuova, cambiando **solo il set di domande** (e opzionalmente i titoli). Tutto il resto — UI, struttura MAPA 1/2, codici classe, logica sessioni, contatore studenti, PDF, stili — resta **identico al sorgente**.

> **Nota sul nome**: «PAROLE CHIAVE SORGENTE» è come chiamiamo il SORGENTE in questa skill. Il titolo UI mostrato agli studenti è la stringa `PAROLE CHIAVE INTERATTIVE` (è questa che lo script sostituisce nei cloni), e il titolo sui PDF è `PAROLE CHIAVE DI ROSALÍA DE CASTRO`.

## Architettura — File canonici e copie mirror

Le **copie canoniche** (quelle che l'app usa davvero) vivono dentro `client/` e `server/`:

| Ruolo | Percorso canonico |
|-------|-------------------|
| UI docente | `client/src/pages/TeacherPage.tsx` |
| UI studente | `client/src/pages/StudentQuiz.tsx` |
| Domande | `server/questions.ts` |
| Report PDF | `client/src/lib/reportPdf.ts` |
| Barra accessibilità | `client/src/components/AccessibilityToolbar.tsx` |
| Stato accessibilità | `client/src/contexts/AccessibilityContext.tsx` |
| Lettura ad alta voce (TTS) | `client/src/hooks/useReadAloud.ts` |
| Audio docente (player auto-stop) | `client/src/components/AudioPlayer.tsx` |
| Audio docente (dati/segmenti) | `client/src/lib/audioData.ts` |
| Embed heightSync | `client/src/lib/heightSync.ts` |
| Font OpenDyslexic (TTF UI + WOFF2 cornice) | `client/public/fonts/` |
| Cornice dinamica (embed Blogger) | `cornice-dinamica/` (radice) |
| CSS accessibilità | `client/src/index.css` |
| Documentazione inclusione | `ACCESSIBILITA.md` (radice) |

Lo script di clonazione crea inoltre **una copia mirror alla radice** del clone (`questions.ts`, `reportPdf.ts`, `StudentQuiz.tsx`, `TeacherPage.tsx`) per comodità di consultazione. Le copie radice NON sono importate dall'app: modifica sempre i percorsi canonici qui sopra, poi lo script mantiene le copie radice allineate automaticamente. Verifica sempre con `diff`.

## Struttura fissa delle domande (8)

- **MAPA 1** = `number` 1-5, **MAPA 2** = `number` 6-8.
- **Multi-risposta** (2 risposte corrette su 4 opzioni) SOLO su domande 4 e 5: `correctAnswer` è un array `["A", "B"]`.
- Per tutte le altre domande `correctAnswer` è una stringa.
- Il numero di domande è parametrizzato in `server/routers.ts` (`TOTAL_QUESTIONS = SHAKESPEARE_QUESTIONS.length`), ma i filtri MAPA in `StudentQuiz.tsx` (righe 432-433 e 448-449) sono fissi su 1-5 / 6-8: se servono più/meno domande va modificato anche lì.

## Accessibilità inclusiva (inclusa automaticamente nei cloni)

L'app sorgente include **tutte** le misure di inclusione dell'app di riferimento QUIZ-INTERATTIVO-SENZA-AUDIO-SHAKESPEARE (vedi `ACCESSIBILITA.md` alla radice):

- **Font OpenDyslexic** applicato a tutta la UI (`index.css`) e **incorporato nei PDF** (`reportPdf.ts`, con fallback su times). I file del font stanno in `client/public/fonts/`.
- **Barra di accessibilità** con 5 moduli (FONT / INTERLINEA / RIGHELLO / MODALITÀ / ASCOLTO) montata in `App.tsx` tramite `AccessibilityProvider` + `AccessibilityToolbar`.
- **Lettura ad alta voce (TTS)** italiano via `useReadAloud` (pulsante ASCOLTO).
- **Alto contrasto** (`lf-hc`) e **righello di lettura** (`lf-ruler`) via classi su `<html>` + CSS.
- **Screen reader / ARIA**: icone `aria-hidden`, `role="group"`, `aria-label`, live region, `aria-pressed`.
- **Embed** altezza dinamica (`heightSync.ts`, protocollo `labvisivo:height` + token `cornice`, SENZA retro-compatibilità `shakespeare:height`) e **CORS `/fonts`** nel server (serve anche i WOFF2 per la cornice Blogger).

Questi file sono **parte del sorgente** e vengono **copiati identici** nei cloni (lo script `rebuild_app.py` non li tocca: copia l'intero progetto tranne node_modules/.git/dist/skills). **NON rimuovere** questi file né le relative righe in `App.tsx`/`main.tsx`/`server/_core/index.ts` quando si adatta un clone.

## Flusso di clonazione (in 3 passi)

### Passo 1 — Prepara il JSON delle domande

Modello: `/home/user/skills/parole-chiave-sorgente/templates/questions_example.json`

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
- `app_title` / `pdf_title` (opzionali): se omessi restano «PAROLE CHIAVE INTERATTIVE» / «PAROLE CHIAVE DI ROSALÍA DE CASTRO».

### Passo 2 — Lancia lo script

```bash
python /home/user/skills/parole-chiave-sorgente/scripts/rebuild_app.py \
  --name parole-chiave-sistema-solare \
  --questions /percorso/domande.json \
  --app-title "PAROLE CHIAVE IL SISTEMA SOLARE" \
  --pdf-title "IL SISTEMA SOLARE"
```

Lo script: copia il progetto (esclude `node_modules`, `.git`, `dist`, `.env`, log), scrive le 8 domande, aggiorna i titoli PDF/UI, rinomina `package.json`, inizializza git, esegue `pnpm install` + `pnpm check`, e verifica che le coppie mirror siano identiche.

Flag utili: `--force` (sovrascrivi), `--no-install` (salta install/check), `--source` (sorgente diverso).

### Usare la repository GitHub come sorgente

Se l'utente ha caricato il pacchetto su GitHub, passa l'URL della repository: lo script la clona da solo e ci lavora sopra (così la nuova app nasce direttamente dalla versione pubblicata):

```bash
python /home/user/skills/parole-chiave-sorgente/scripts/rebuild_app.py \
  --name parole-chiave-sistema-solare \
  --questions /percorso/domande.json \
  --app-title "PAROLE CHIAVE IL SISTEMA SOLARE" \
  --source https://github.com/UTENTE/REPO.git
```

### Passo 3 — Verifica e deploy

1. **Verifica mirror** (lo script lo fa già, ma ricontrolla con `diff`).
2. **pnpm check** nella nuova cartella.
3. **Deploy PREVIEW** (`webdev_deploy` mode=preview) e test visivo.
4. **Checkpoint** (`webdev_save_checkpoint`) e chiedi conferma esplicita.
5. **Deploy PRODUZIONE** solo dopo conferma.

## Cosa cambia vs cosa resta identico

**Cambia:** array domande, titoli PDF/UI, `package.json` name, `<title>` browser.

**Resta identico:** struttura MAPA 1/2, multi-risposta su 4-5, audio SOLO docente (player in `TeacherPage`; StudentQuiz SENZA audio, allineato al riferimento), layout docente/studente, codici classe e password, logica sessioni e contatore studenti, report PDF con **box PUNTEGGIO** su un'unica linea centrata (cornice blu con margini stretti: `PUNTEGGIO: X/10 — ogni risposta corretta = 1 pt — massimo 10/10`) presente sia nel report che nel questionario in bianco, **accessibilità completa** (font OpenDyslexic UI+PDF, barra accessibilità 5 moduli, TTS, alto contrasto, righello, ARIA, heightSync, CORS font), stili CSS.

## Backup e rollback

La clonazione NON tocca mai il sorgente (`/home/user/shakespeare-quiz`). Per ripristinare un clone, elimina la cartella `--name` e rilancia.

## Pacchetto ZIP esportabile (guida IA + GitHub + Render)

Il pacchetto ZIP (`/home/user/PAROLE-CHIAVE-SORGENTE.zip`, generato da `/home/user/build_zip.py`) include, oltre al codice, i documenti per l'IA e il deploy:

- `REBUILD.md` — ricostruzione identica della stessa app da una repository GitHub.
- `ADATTARE.md` — come cambiare le domande: contenuto, numero e tipologia (VERO/FALSO, risposta multipla 3–4 opzioni, fill-in-the-blanks, abbinamento immagine-parola, riordino della parola, risposta breve di una parola).
- `RENDER.md` + `render.yaml` — trasferimento dell'app da Easy-Peasy AI a Render via GitHub.
- `AGENTS.md` — guida rapida per agenti IA.
- `ACCESSIBILITA.md` — misure di accessibilità ben segnalate e riusabili su altre app simili.
- `cornice-dinamica/` — cornice dinamica (embed Blogger) con font WOFF2.

Se modifichi questi documenti o il sorgente, rigenera il pacchetto con `python3 /home/user/build_zip.py`.

## Storico modifiche della chat (cronologia completa)

L'app è stata rifinita in questa chat partendo dalla versione con audio (docente+studente) e convergendo alla versione **SENZA-AUDIO** del riferimento `QUIZ-INTERATTIVO-SENZA-AUDIO-SHAKESPEARE`. Riepilogo tematico (dal più recente):

- **Cornice dinamica + font**: cornice v3 impermeabile + anti-loop (`cornice-dinamica/`), font WOFF2 cross-origin con CORS, `heightSync` solo `labvisivo:height`, deploy produzione.
- **Polling + dati**: `refetchInterval` 2s/3s su `TeacherPage`; svuotate le classi (`DELETE FROM classes`).
- **Report PDF**: rimosso il riassunto «RISPOSTE CORRETTE/INCORRETTE» (resta il box PUNTEGGIO).
- **Dashboard docente**: tolta la voce «IN ATTESA», mostrato il nome, pulsanti dentro i bordi, «RESET»→«FINE», «AVVIA» sempre visibile; pulsanti MAPA con header flat flex-wrap e «FINE» dentro i bordi.
- **Margini e footer**: pareggiati i margini della Home (rimosso `min-h-screen`/`flex-1`) e rimosso il footer «REALIZZATO DA ANDREA CENTINARO».
- **Accessibilità completa**: font OpenDyslexic (UI+PDF), barra 5 moduli, TTS, alto contrasto, righello, ARIA, heightSync, CORS font, PDF 14pt con ✔/✘ e legenda.
- **Report PDF**: box PUNTEGGIO su un'unica linea centrata + voce «RISPOSTA DELLO STUDENTE».
- **Data centrata**: input `date` con overlay + `showPicker()`.
- **UI studente/docente**: card ingrandita, tooltip nero, dot colorati per-MAPA, risposte MAPA con freccia, codice classe flex-wrap, overflow mobile sistemato, titoli dimensionati, «IN ATTESA DI INVIO» solo nel riquadro studente (arancione), sezione espansa con tutte le 8 domande.
- **Versione SENZA-AUDIO (studente)**: rimosso l'`AudioPlayer` da `StudentQuiz` (resta SOLO in `TeacherPage` per l'audio del docente) e il box «ATTENZIONE 2 risposte».
- **Audio docente (tuning)**: auto-stop dei segmenti via loop `requestAnimationFrame` (~16ms) + `AUTO_STOP_MARGIN = 0` + `playingSegmentRef`; `endTime` dei segmenti «Lieders» tarati per non sconfinare nel paragrafo successivo.

## Pitfall noti

- **Mirror fuori sync**: dopo la clonazione verifica che le copie radice del clone coincidano con i percorsi canonici (es. `diff questions.ts server/questions.ts`).
- **`--name`**: solo minuscole/numeri/trattini.
- **8 domande fisse**: i filtri MAPA in `StudentQuiz.tsx` sono hardcoded su 1-5 / 6-8.
- **Riquadro PUNTEGGIO su una facciata e su un'unica linea**: in `reportPdf.ts` il box PUNTEGGIO resta su una sola pagina (logica block-height). Il riquadro è su UN'UNICA LINEA centrata, con cornice blu e margini stretti (larghezza = `scoreTextW + 3`, altezza = `scoreBoxFont * 0.352 + 2.5`, testo centrato orizzontalmente e verticalmente). NON rimuovere queste funzioni: evitano che il box venga spezzato tra due facciate o distribuito su più linee.
- **Report PDF senza riassunto CORRETTE/INCORRETTE**: il report studente NON contiene più le righe «RISPOSTE CORRETTE (n): …» / «RISPOSTE INCORRETTE (n): …». Mostra solo: titolo, studente, classe·data·voto, le domande con ✔/✘ e opzione esatta in verde, la legenda dei simboli e il box PUNTEGGIO. Il questionario in bianco non è cambiato.
- **Deploy**: mai in produzione nella stessa risposta in cui hai scritto codice o creato la preview.
- **Non clonare dentro il sorgente**: la destinazione è sempre `/home/user/<nome>`.
- **Data centrata nel docente**: l'input data in «APRI UNA NUOVA CLASSE» usa un input `type="date"` con testo trasparente (`text-transparent`) + uno `<span>` overlay che mostra la data formattata centrata; il click sul wrapper apre il picker nativo via `showPicker()`. Il fix è già nel sorgente `TeacherPage.tsx`: NON rimuovere l'overlay né riabilitare l'indicatore nativo (è nascosto con `::-webkit-calendar-picker-indicator { opacity: 0 }`).
- **Studenti attivi riconosciuti subito (polling)**: in `TeacherPage.tsx` le query `getStudents` e `stats` hanno `refetchInterval: 2000` (polling ogni 2 secondi). Così gli studenti che entrano nella sessione compaiono subito in «STUDENTI ATTIVI NELLA SESSIONE» senza ricaricare la pagina. Il fix è nel sorgente e viene ereditato dai cloni: NON rimuovere il `refetchInterval` (altrimenti la lista studenti smette di aggiornarsi dopo l'apertura della classe).
- **Svuotare «LE TUE CLASSI»**: per eliminare tutte le classi del docente usa `webdev_execute_sql` con `DELETE FROM classes;` — `students` e `answers` vengono rimosse a cascata (chiave esterna `class_id` con `ON DELETE CASCADE`). È un'operazione sui DATI, non sul codice: non serve ricompilare. (Fatto in questa chat: pulizia completa + deploy in produzione.)
- **Cornice dinamica (embed Blogger)**: la cartella `cornice-dinamica/` contiene la cornice v3 «impermeabile + anti-loop» (dedicata, lite, autosufficiente, universale + 2 pagine di test) con protocollo `labvisivo:height` + token `cornice`. **Embed su Blogger**: apri il post in «Vista HTML» e incolla l'INTERO contenuto di `cornice-dinamica/embed-shakespeare-quiz-dedicata.html` (⭐ consigliata; puoi incollarla in più post della stessa pagina, ogni istanza resta impermeabile). I font WOFF2 cross-origin stanno in `client/public/fonts/` (serviti con CORS da `/fonts` in `server/_core/index.ts`) e vanno **deployati in produzione** perché la cornice li carichi (fatto in questa chat). La cornice viene copiata nei cloni MA il suo `APP_URL` resta quello del sorgente (`https://shakespeare-quiz-2.easy-peasy.site/`): per un clone va aggiornata a mano (cerca `APP_URL` nei file HTML e sostituisci). `heightSync.ts` ora manda SOLO `labvisivo:height` (niente più `shakespeare:height` retro-compat).
- **Audio docente — auto-stop dei segmenti**: `AudioPlayer.tsx` usa un loop `requestAnimationFrame` (~16ms) + `AUTO_STOP_MARGIN = 0` + `playingSegmentRef`/`activeSegmentRef` per fermare l'audio esattamente al confine del segmento ed evitare che filtri audio del segmento successivo. NON sostituirlo con `setInterval`/`timeupdate` (già provati, meno affidabili) né toccare gli `endTime` in `audioData.ts` (tarati per non sconfinare nel paragrafo successivo).
- **Footer e margini Home**: il footer «REALIZZATO DA ANDREA CENTINARO» è stato RIMOSSO da Home e TeacherPage (allineato al riferimento); la Home NON usa più `min-h-screen`/`flex-1` (margini pareggiati). NON riaggiungere footer né `min-h-screen` nei cloni.
