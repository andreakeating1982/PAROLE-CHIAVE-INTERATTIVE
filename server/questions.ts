/**
 * PAROLE CHIAVE DI ROSALÍA DE CASTRO — Domande del quiz
 *
 * MODIFICA: Le domande 4 e 5 del MAPA 1 ora hanno 4 opzioni ciascuna
 * e ammettono DUE risposte corrette. Il campo `correctAnswer` è un array
 * per queste due domande; per tutte le altre resta una stringa.
 */

export const SHAKESPEARE_QUESTIONS = [
  // ═══════════════════ MAPA 1 ═══════════════════
  {
    number: 1,
    question: "MAPA 1 - EL AUTOR",
    options: ["Realismo magico", "Romanticismo", "Rinascimento galiziano"],
    correctAnswer: "Rinascimento galiziano",
  },
  {
    number: 2,
    question: "MAPA 1 - LAS OBRAS PRINCIPALES",
    options: ["Teatro storico", "Tre poemari", "Romanzo picaresco"],
    correctAnswer: "Tre poemari",
  },
  {
    number: 3,
    question: "MAPA 1 - EN LAS ORILLAS DEL SAR",
    options: ["Dolore esistenziale", "Epica medievale", "Complessità poetica"],
    correctAnswer: "Dolore esistenziale",
  },
  {
    number: 4,
    question: "MAPA 1 - LIEDERS",
    options: [
      "Mitologia classica",
      "Politica nuova",
      "Condizione femminile",
      "Femminismo spagnolo",
    ],
    correctAnswer: ["Condizione femminile", "Femminismo spagnolo"],
  },
  {
    number: 5,
    question: "MAPA 1 - LENGUAJE Y ESTILO",
    options: [
      "Simbolismo naturale",
      "Oscurità",
      "Linguaggio burocratico",
      "Musicalità",
    ],
    correctAnswer: ["Simbolismo naturale", "Musicalità"],
  },

  // ═══════════════════ MAPA 2 ═══════════════════
  {
    number: 6,
    question: "MAPA 2 - PÁRRAFO 1",
    options: ["Libertà", "Gloria", "Arte"],
    correctAnswer: "Libertà",
  },
  {
    number: 7,
    question: "MAPA 2 - PÁRRAFO 2",
    options: ["Oppressione", "Purezza", "Gioventù"],
    correctAnswer: "Oppressione",
  },
  {
    number: 8,
    question: "MAPA 2 - PÁRRAFO 3",
    options: ["Rimorso", "Virtù", "Felicità"],
    correctAnswer: "Rimorso",
  },
];
