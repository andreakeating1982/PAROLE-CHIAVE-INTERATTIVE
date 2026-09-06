/**
 * client/src/lib/reportPdf.ts — PDF ACCESSIBILI (DSA/BES/ipovisione)
 *
 * Aggiornato sul modello del QUIZ INTERATTIVO SENZA AUDIO:
 *   • Font OpenDyslexic (Regular + Bold) embedded da /fonts (client/public/fonts),
 *     con fallback automatico su "times" se il fetch del font fallisce.
 *   • Font minimo 14 pt (15 pt per titoli).
 *   • Interlinea 1.5 (fattore ridotto in automatico 1.5→1.15 SOLO se un
 *     contenuto eccezionale non entra in una facciata).
 *   • Scelta marcata SENZA affidarsi al solo colore: ✔ verde scuro (corretta) /
 *     ✘ rossa (errata) subito dopo la lettera dell'opzione, opzione esatta in
 *     verde, con legenda dei simboli in fondo.
 *   • Mantiene il riquadro PUNTEGGIO (cornice BLU, un'unica linea, margini
 *     stretti) mai spezzato.
 *   • Multi-risposta (correctAnswer "risp1||risp2") gestita per-opzione.
 */
import { jsPDF } from "jspdf";

// ── Geometria A4 ────────────────────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const M = 16;             // margine orizzontale (mm)
const CW = PAGE_W - 2 * M; // 178 mm
const M_TOP = 12;         // margine superiore visivo (mm)
const M_BOT = 12;         // margine inferiore (mm)
const MM_PER_PT = 0.352778;

// Fattori di interlinea candidati: parte da 1.5 (richiesto) e scende SOLO se un
// contenuto eccezionale non entra in una facciata.
const FACTORS = [1.5, 1.45, 1.4, 1.35, 1.3, 1.25, 1.2, 1.15];

// ── Colori (palette app: testo scuro + cornice BLU approvata) ────────────────
const INK: [number, number, number] = [26, 24, 22];        // testo
const BLUE: [number, number, number] = [0, 70, 160];       // cornice + accenti
const GREEN: [number, number, number] = [0, 120, 60];      // risposta esatta (testo)
const GREEN_DARK: [number, number, number] = [0, 92, 36];  // spunta ✔
const RED: [number, number, number] = [190, 40, 40];       // ✘ errata
const GREY: [number, number, number] = [120, 110, 100];    // separatori

// ── Simboli vettoriali ✔ / ✘ (OpenDyslexic NON ha i glifi U+2714/U+2718) ────
const SYMBOL_W = 4.8;
const MARK_GAP_AFTER_LETTER = 1.7;
const MARK_GAP_BEFORE_TEXT = 1.7;

// ── Font helpers (OpenDyslexic con fallback times) ──────────────────────────
interface FontState {
  name: string;
  fallback: boolean;
}
let fontState: FontState = { name: "OpenDyslexic", fallback: false };

const fontCache: Record<string, string> = {};

function mmLineHeight(sizePt: number, factor: number): number {
  return sizePt * factor * MM_PER_PT;
}

async function fileToBase64(buf: ArrayBuffer): Promise<string> {
  if (typeof Buffer !== "undefined") return Buffer.from(buf).toString("base64");
  return new Promise<string>((resolve, reject) => {
    const blob = new Blob([buf]);
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result);
      resolve(s.slice(s.indexOf(",") + 1));
    };
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

async function loadFontBase64(fileName: string, fontsBase: string): Promise<string> {
  if (fontCache[fileName]) return fontCache[fileName];
  const url = (fontsBase || "") + "/fonts/" + fileName;
  const res = await fetch(url);
  if (!res.ok) throw new Error("font " + fileName + " non disponibile");
  const ab = await res.arrayBuffer();
  fontCache[fileName] = await fileToBase64(ab);
  return fontCache[fileName];
}

async function ensureFonts(doc: jsPDF, fontsBase: string): Promise<void> {
  if (fontState.fallback) return;
  try {
    const reg = await loadFontBase64("OpenDyslexic-Regular.ttf", fontsBase);
    const bold = await loadFontBase64("OpenDyslexic-Bold.ttf", fontsBase);
    doc.addFileToVFS("OpenDyslexic-Regular.ttf", reg);
    doc.addFileToVFS("OpenDyslexic-Bold.ttf", bold);
    doc.addFont("OpenDyslexic-Regular.ttf", "OpenDyslexic", "normal");
    doc.addFont("OpenDyslexic-Bold.ttf", "OpenDyslexic", "bold");
    doc.setFont("OpenDyslexic", "normal");
    fontState = { name: "OpenDyslexic", fallback: false };
  } catch {
    fontState = { name: "times", fallback: true };
    doc.setFont("times", "normal");
  }
}

function setFontNormal(doc: jsPDF): void {
  doc.setFont(fontState.name, "normal");
}
function setFontBold(doc: jsPDF): void {
  doc.setFont(fontState.name, "bold");
}

// ── Tipi ────────────────────────────────────────────────────────────────────
interface Question {
  number: number;
  question: string;
  options: string[];
  correctAnswer: string;    // per domande multiple: "risp1||risp2"
}

interface StudentAnswer {
  questionNumber: number;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

interface ReportStudent {
  name: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  grade: number;
  answers: StudentAnswer[];
}

interface ReportData {
  className: string;
  schoolYear: string;
  classDate?: string;
  classCode: string;
  questions: Question[];
  students: ReportStudent[];
}

interface BlankQuestion {
  number: number;
  question: string;
  options: string[];
}

interface BlankQuestionsData {
  className: string;
  classDate?: string;
  questions: BlankQuestion[];
}

type RGB = [number, number, number];

interface SegPiece {
  kind: "text" | "symbol";
  text?: string;
  symbol?: "check" | "cross";
  bold?: boolean;
  color?: RGB;
  gapAfter?: number;
}

interface Segment {
  text?: string;
  symbol?: "check" | "cross";
  parts?: SegPiece[];
  bold?: boolean;
  color?: RGB;
}

// ── Utility testo ───────────────────────────────────────────────────────────

function fmtDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr + "T00:00:00").toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function countLines(doc: jsPDF, text: string, maxW: number): number {
  return doc.splitTextToSize(text, maxW).length;
}

function computeTotalPoints(questions: Question[]): number {
  return questions.reduce((sum, q) => {
    if (q.correctAnswer.includes("||")) {
      return sum + q.correctAnswer.split("||").filter(Boolean).length;
    }
    return sum + 1;
  }, 0);
}

function countInlineLines(doc: jsPDF, segs: Segment[], maxW: number, gap: number): number {
  let x = 0;
  let lines = 1;
  for (let i = 0; i < segs.length; i++) {
    const w = segmentWidth(doc, segs[i]);
    if (x > 0 && x + w > maxW) {
      x = 0;
      lines++;
    }
    x += w;
    if (i < segs.length - 1) x += gap;
  }
  setFontNormal(doc);
  return lines;
}

function pieceWidth(doc: jsPDF, p: SegPiece): number {
  if (p.kind === "symbol") return SYMBOL_W;
  if (p.bold) setFontBold(doc);
  else setFontNormal(doc);
  return doc.getTextWidth(p.text ?? "");
}

function segmentWidth(doc: jsPDF, s: Segment): number {
  if (s.parts) {
    let w = 0;
    for (const p of s.parts) {
      w += pieceWidth(doc, p);
      if (p.gapAfter) w += p.gapAfter;
    }
    return w;
  }
  if (s.symbol) return SYMBOL_W;
  if (s.bold) setFontBold(doc);
  else setFontNormal(doc);
  return doc.getTextWidth(s.text ?? "");
}

function drawSymbol(
  doc: jsPDF,
  kind: "check" | "cross",
  color: [number, number, number],
  x: number,
  y: number
): void {
  doc.setDrawColor(color[0], color[1], color[2]);
  doc.setLineWidth(1.0);
  try {
    if (kind === "check") doc.setLineJoin("miter");
    else doc.setLineJoin("round");
    doc.setLineCap("round");
  } catch {
    /* API non disponibile */
  }
  if (kind === "check") {
    doc.lines(
      [
        [1.0, 3.3],
        [2.7, -2.9],
      ],
      x + 0.35,
      y - 3.85,
      [1, 1],
      "S",
      false
    );
  } else {
    doc.line(x + 0.55, y - 0.7, x + 4.15, y - 3.7);
    doc.line(x + 0.55, y - 3.7, x + 4.15, y - 0.7);
  }
  try {
    doc.setLineCap("butt");
    doc.setLineJoin("miter");
  } catch {
    /* ignora */
  }
}

function drawParts(doc: jsPDF, parts: SegPiece[], xStart: number, y: number): number {
  let x = xStart;
  for (const p of parts) {
    if (p.kind === "symbol") {
      drawSymbol(doc, p.symbol!, p.color ?? GREEN_DARK, x, y);
      x += SYMBOL_W;
    } else {
      if (p.bold) setFontBold(doc);
      else setFontNormal(doc);
      if (p.color) doc.setTextColor(p.color[0], p.color[1], p.color[2]);
      else doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(p.text ?? "", x, y);
      x += doc.getTextWidth(p.text ?? "");
    }
    if (p.gapAfter) x += p.gapAfter;
  }
  return x;
}

function drawInline(
  doc: jsPDF,
  segs: Segment[],
  xStart: number,
  y: number,
  maxW: number,
  gap: number,
  lineH: number
): number {
  let x = xStart;
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const w = segmentWidth(doc, s);
    if (x > xStart && x + w > xStart + maxW) {
      x = xStart;
      y += lineH;
    }
    if (s.parts) {
      x = drawParts(doc, s.parts, x, y);
    } else if (s.symbol) {
      drawSymbol(doc, s.symbol, s.color ?? GREEN_DARK, x, y);
      x += SYMBOL_W;
    } else {
      if (s.bold) setFontBold(doc);
      else setFontNormal(doc);
      if (s.color) doc.setTextColor(s.color[0], s.color[1], s.color[2]);
      else doc.setTextColor(INK[0], INK[1], INK[2]);
      doc.text(s.text ?? "", x, y);
      x += doc.getTextWidth(s.text ?? "");
    }
    if (i < segs.length - 1) x += gap;
  }
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  return y + lineH;
}

function drawWrapped(doc: jsPDF, lines: string[], x: number, y: number, lineH: number): number {
  for (let i = 0; i < lines.length; i++) {
    doc.text(lines[i], x, y);
    y += lineH;
  }
  return y;
}

// =============================================================================
// Segmenti opzioni / legenda / riassunto
// =============================================================================

/** Opzioni marcate: ✔/✘ subito DOPO la lettera dell'opzione scelta. Gestisce
 *  anche le multi-risposta (correctAnswer "opt1||opt2"). */
function buildOptionSegments(q: Question, selected: string | null): Segment[] {
  const correctList = q.correctAnswer.includes("||")
    ? q.correctAnswer.split("||").map((s) => s.trim()).filter(Boolean)
    : [q.correctAnswer.trim()];
  const correctIdxSet = new Set(correctList.map((c) => q.options.indexOf(c)).filter((i) => i >= 0));
  const selList = selected ? selected.split("||").map((s) => s.trim()).filter(Boolean) : [];
  const chosenIdxSet = new Set(selList.map((s) => q.options.indexOf(s)).filter((i) => i >= 0));

  const segs: Segment[] = [];
  q.options.forEach((opt, i) => {
    const letter = String.fromCharCode(65 + i);
    const isChosen = chosenIdxSet.has(i);
    const isCorrectOpt = correctIdxSet.has(i);
    const isRight = isChosen && isCorrectOpt;
    let color: RGB | undefined;
    let bold = false;
    if (isChosen) {
      color = isRight ? GREEN : RED;
      bold = true;
    } else if (isCorrectOpt) {
      color = GREEN; // opzione esatta sempre in verde
      bold = true;
    }
    if (isChosen) {
      segs.push({
        parts: [
          { kind: "text", text: `${letter})`, bold, color, gapAfter: MARK_GAP_AFTER_LETTER },
          {
            kind: "symbol",
            symbol: isRight ? "check" : "cross",
            color: isRight ? GREEN_DARK : RED,
            gapAfter: MARK_GAP_BEFORE_TEXT,
          },
          { kind: "text", text: opt, bold, color },
        ],
      });
    } else {
      segs.push({ text: `${letter}) ${opt}`, bold, color });
    }
  });
  return segs;
}

function buildLegendSegments(): Segment[] {
  return [
    {
      parts: [
        { kind: "symbol", symbol: "check", color: GREEN_DARK, gapAfter: 1.4 },
        { kind: "text", text: "risposta corretta   ·   ", color: INK },
        { kind: "symbol", symbol: "cross", color: RED, gapAfter: 1.4 },
        { kind: "text", text: "risposta errata   ·   verde = risposta esatta", color: INK },
      ],
    },
  ];
}

/** Disegna il riquadro PUNTEGGIO (cornice BLU, UN'UNICA linea, margini stretti).
 *  La dimensione del font si adatta per restare su UNA riga. Ritorna l'altezza. */
function drawScoreBox(
  doc: jsPDF,
  scoreLine: string,
  y: number
): number {
  let boxFont = 14;
  doc.setFontSize(boxFont);
  setFontBold(doc);
  let textW = doc.getTextWidth(scoreLine);
  while (textW > CW - 6 && boxFont > 10) {
    boxFont -= 0.5;
    doc.setFontSize(boxFont);
    textW = doc.getTextWidth(scoreLine);
  }
  const boxW = textW + 6;
  const boxX = (PAGE_W - boxW) / 2;
  const boxH = boxFont * MM_PER_PT + 3;

  doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.setLineWidth(0.4);
  doc.rect(boxX, y, boxW, boxH);
  doc.setFontSize(boxFont);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  doc.text(scoreLine, PAGE_W / 2, y + boxH / 2 + boxFont * MM_PER_PT * 0.25, { align: "center" });
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  return boxH;
}

// =============================================================================
// REPORT PDF — una facciata A4 per studente (simboli ✔/✘ + legenda)
// =============================================================================

function drawReportPage(
  doc: jsPDF,
  data: ReportData,
  student: ReportStudent,
  factor: number
): number {
  const lh14 = mmLineHeight(14, factor);
  const lh15 = mmLineHeight(15, factor);
  let y = M_TOP + lh14 * 0.72;

  // ── Titolo
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  const titleLines = doc.splitTextToSize("PAROLE CHIAVE DI ROSALÍA DE CASTRO", CW);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * lh15 + 2.4;

  // ── Studente
  doc.setTextColor(INK[0], INK[1], INK[2]);
  const nameLines = doc.splitTextToSize(`Studente: ${student.name}`, CW);
  doc.text(nameLines, PAGE_W / 2, y, { align: "center" });
  y += nameLines.length * lh15 + 1.8;

  // ── Classe · Data · Voto
  doc.setFontSize(14);
  setFontNormal(doc);
  const info = `Classe: ${data.className}   ·   Data: ${fmtDate(data.classDate)}   ·   Voto: ${Math.round(student.grade)}/${student.totalQuestions}`;
  const infoLines = doc.splitTextToSize(info, CW);
  doc.text(infoLines, PAGE_W / 2, y, { align: "center" });
  y += infoLines.length * lh14 + 2.6;

  // ── Filetto sottile
  doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
  doc.setLineWidth(0.35);
  doc.line(M, y - 1.4, PAGE_W - M, y - 1.4);
  y += 4.3;

  // ── Domande (con ✔/✘ dopo la lettera dell'opzione scelta)
  for (const q of data.questions) {
    const ans = student.answers.find((a) => a.questionNumber === q.number);
    const sel = ans?.selectedAnswer ?? null;

    doc.setFontSize(14);
    setFontBold(doc);
    doc.setTextColor(INK[0], INK[1], INK[2]);
    const qLines = doc.splitTextToSize(`${q.number}. ${q.question}`, CW - 4);
    y = drawWrapped(doc, qLines, M, y, lh14) + 0.4;

    doc.setFontSize(14);
    const segs = buildOptionSegments(q, sel);
    y = drawInline(doc, segs, M, y, CW, 3, lh14) + 1.6;
  }

  // ── Legenda con simboli vettoriali ✔/✘
  y += 1.5;
  setFontNormal(doc);
  doc.setTextColor(INK[0], INK[1], INK[2]);
  y = drawInline(doc, buildLegendSegments(), M, y, CW, 3, lh14) + 2.2;

  // ── Box PUNTEGGIO (una linea, cornice blu, mai spezzato)
  const scoreLine = `PUNTEGGIO: ${Math.round(student.grade)}/${student.totalQuestions} — ogni risposta corretta = 1 pt — massimo ${student.totalQuestions}/${student.totalQuestions}`;
  const boxH = drawScoreBox(doc, scoreLine, y);
  return y + boxH;
}

export async function buildReportPdfDoc(data: ReportData, fontsBase = ""): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await ensureFonts(doc, fontsBase);

  const bottomLimit = PAGE_H - M_BOT;

  // Preflight reale: disegna la pagina su un documento di prova e tiene il
  // fattore di interlinea solo se l'ultima riga (box PUNTEGGIO compreso) resta
  // dentro il margine inferiore. Garanzia: ogni studente sta su UNA facciata.
  async function pickFactor(data: ReportData, student: ReportStudent): Promise<number> {
    for (const f of FACTORS) {
      const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      await ensureFonts(probe, fontsBase);
      probe.setLineHeightFactor(f);
      const endY = drawReportPage(probe, data, student, f);
      if (endY <= bottomLimit) return f;
    }
    return FACTORS[FACTORS.length - 1];
  }

  let factor = FACTORS[0];
  for (const student of data.students) {
    const needed = await pickFactor(data, student);
    if (needed < factor) factor = needed;
  }
  doc.setLineHeightFactor(factor);

  data.students.forEach((student, si) => {
    if (si > 0) doc.addPage();
    drawReportPage(doc, data, student, factor);
  });

  return doc;
}

export async function generateReportPdf(data: ReportData): Promise<void> {
  const doc = await buildReportPdfDoc(data);
  const safeName = data.className.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Report_Quiz_${safeName}_${data.classCode}.pdf`);
}

// =============================================================================
// BLANK QUESTIONNAIRE PDF — una facciata A4
// =============================================================================

function drawBlankPage(doc: jsPDF, data: BlankQuestionsData, factor: number): number {
  const lh14 = mmLineHeight(14, factor);
  const lh15 = mmLineHeight(15, factor);
  let y = M_TOP + lh14 * 0.72;

  // ── Titolo
  doc.setFontSize(15);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  const titleLines = doc.splitTextToSize("PAROLE CHIAVE DI ROSALÍA DE CASTRO", CW);
  doc.text(titleLines, PAGE_W / 2, y, { align: "center" });
  y += titleLines.length * lh15 + 2.6;

  // ── Campi: COGNOME / NOME / CLASSE / DATA
  doc.setFontSize(14);
  setFontBold(doc);
  doc.setTextColor(BLUE[0], BLUE[1], BLUE[2]);
  const fields = ["COGNOME", "NOME", "CLASSE", "DATA"];
  const colW = CW / 4;
  fields.forEach((label, i) => {
    const x = M + i * colW;
    doc.text(label + ":", x, y);
    const lw = doc.getTextWidth(label + ":");
    const lineX = x + lw + 2;
    const lineEnd = x + colW - 2;
    doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
    doc.setLineWidth(0.3);
    doc.line(lineX, y + 1.3, lineEnd, y + 1.3);
  });
  y += lh14 + 2.6;

  // ── Filetto
  doc.setDrawColor(GREY[0], GREY[1], GREY[2]);
  doc.setLineWidth(0.35);
  doc.line(M, y - 1.4, PAGE_W - M, y - 1.4);
  y += 7.6;

  // ── Domande (casella quadrata per la lettera-risposta accanto al numero)
  for (const q of data.questions) {
    doc.setFontSize(14);
    setFontBold(doc);
    doc.setTextColor(INK[0], INK[1], INK[2]);

    const boxSide = 7;
    const boxX = M;
    const boxY = y - lh14 * 0.78;
    doc.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
    doc.setLineWidth(0.35);
    doc.rect(boxX, boxY, boxSide, boxSide);

    const qLines = doc.splitTextToSize(`${q.number}. ${q.question}`, CW - 4 - 12);
    y = drawWrapped(doc, qLines, M + boxSide + 3, y, lh14) + 0.4;

    doc.setFontSize(14);
    const segs = q.options.map((opt, i) => ({
      text: `${String.fromCharCode(65 + i)}) ${opt}`,
    }));
    y = drawInline(doc, segs, M, y, CW, 3, lh14) + 1.6;
  }

  // ── Box PUNTEGGIO (una linea, cornice blu, mai spezzato)
  y += 1;
  const totalPoints = computeTotalPoints(data.questions as Question[]);
  const scoreLine = `PUNTEGGIO — ogni risposta corretta = 1 pt — massimo ${totalPoints}/${totalPoints}`;
  const boxH = drawScoreBox(doc, scoreLine, y);
  return y + boxH;
}

export async function buildBlankQuestionsPdfDoc(
  data: BlankQuestionsData,
  fontsBase = ""
): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  await ensureFonts(doc, fontsBase);

  const bottomLimit = PAGE_H - M_BOT;
  let factor = FACTORS[0];
  for (const f of FACTORS) {
    const probe = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    await ensureFonts(probe, fontsBase);
    probe.setLineHeightFactor(f);
    const endY = drawBlankPage(probe, data, f);
    if (endY <= bottomLimit) {
      factor = f;
      break;
    }
  }
  doc.setLineHeightFactor(factor);
  drawBlankPage(doc, data, factor);
  return doc;
}

export async function generateBlankQuestionsPdf(data: BlankQuestionsData): Promise<void> {
  const doc = await buildBlankQuestionsPdfDoc(data);
  const safeName = data.className.replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`Questionario_${safeName}.pdf`);
}
