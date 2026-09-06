import { z } from "zod";
import { nanoid } from "nanoid";
import { publicProcedure, router } from "./_core/trpc";
import { systemRouter } from "./_core/systemRouter";
import { SHAKESPEARE_QUESTIONS } from "./questions";
import {
  createClass, getClassById, getClassByCode, getAllClasses,
  updateClass, deleteClass,
  addStudent, getStudentsByClass, getStudentByNameAndClass, getStudentByNameAndClassIncludingRemoved, getAllStudentsByClassIncludingRemoved,
  getStudentById, deleteStudent, reactivateStudent,
  saveAnswer, getAnswersByClass, getAnswerByStudentAndQuestion,
  touchStudent,
} from "./db";

// ── Helpers ─────────────────────────────────────────────────────────────────

// Punteggio parziale per domande a risposta multipla (Q4, Q5)
// Restituisce {correct, total}: es. {correct:1, total:2} = 1 opzione giusta su 2
function getPartialScore(questionNumber: number, selectedAnswer: string): { correct: number; total: number } {
  const correctAnswers = getCorrectAnswers(questionNumber);
  if (correctAnswers.length === 0) return { correct: 0, total: 0 };
  const selectedList = selectedAnswer.split("||").map((s) => s.trim()).filter(Boolean);
  if (correctAnswers.length === 1) {
    const isCorrect = selectedList.length === 1 && selectedList[0] === correctAnswers[0];
    return { correct: isCorrect ? 1 : 0, total: 1 };
  }
  // Multi-answer: conta quante opzioni corrette sono state selezionate
  let correctCount = 0;
  for (const sel of selectedList) {
    if (correctAnswers.includes(sel)) correctCount++;
  }
  return { correct: correctCount, total: correctAnswers.length };
}

function getCorrectAnswers(questionNumber: number): string[] {
  const q = SHAKESPEARE_QUESTIONS.find((q) => q.number === questionNumber);
  if (!q) return [];
  return Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer as string];
}

function checkAnswer(questionNumber: number, selectedAnswer: string): boolean {
  const correctAnswers = getCorrectAnswers(questionNumber);
  if (correctAnswers.length === 0) return false;
  const selectedList = selectedAnswer.split("||").map((s) => s.trim()).filter(Boolean);
  if (correctAnswers.length === 1) {
    return selectedList.length === 1 && selectedList[0] === correctAnswers[0];
  }
  if (selectedList.length !== correctAnswers.length) return false;
  return correctAnswers.every((ca) => selectedList.includes(ca));
}

const TOTAL_QUESTIONS = SHAKESPEARE_QUESTIONS.length; // 8

// ═══════════════════════════════════════════════════════════════════════════
//  QUESTIONS
// ═══════════════════════════════════════════════════════════════════════════

export const questionsRouter = router({
  list: publicProcedure.query(() => {
    return SHAKESPEARE_QUESTIONS.map(({ number, question, options }) => ({
      number, question, options,
    }));
  }),

  listWithAnswers: publicProcedure.query(() => {
    return SHAKESPEARE_QUESTIONS.map((q) => ({
      ...q,
      correctAnswer: Array.isArray(q.correctAnswer)
        ? q.correctAnswer.join("||")
        : q.correctAnswer,
    }));
  }),
});

// ═══════════════════════════════════════════════════════════════════════════
//  ANSWERS
// ═══════════════════════════════════════════════════════════════════════════

export const answersRouter = router({
  getMyAnswers: publicProcedure
    .input(z.object({
      studentId: z.string(),
      classId: z.string(),
    }))
    .query(async ({ input }) => {
      const allAnswers = await getAnswersByClass(input.classId);
      return allAnswers.filter((a: any) => a.studentId === input.studentId);
    }),

  submit: publicProcedure
    .input(z.object({
      studentId: z.string(),
      classId: z.string(),
      questionNumber: z.number().int().min(1).max(TOTAL_QUESTIONS),
      selectedAnswer: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Touch student activity
      await touchStudent(input.studentId).catch(() => {});

      // ⛔ Se il docente ha già rivelato la risposta, blocca l'invio
      const cls = await getClassById(input.classId);
      if (cls) {
        let revealed: Array<{ q: number; a: string }> = [];
        try { revealed = JSON.parse(cls.revealedQuestions || "[]"); } catch {}
        if (revealed.find(r => r.q === input.questionNumber)) {
          throw new Error("Il docente ha già rivelato la risposta esatta. Non puoi più rispondere a questa domanda.");
        }
      }

      const isCorrect = checkAnswer(input.questionNumber, input.selectedAnswer);
      const existing = await getAnswerByStudentAndQuestion(input.studentId, input.questionNumber);
      if (existing) throw new Error("Hai già risposto a questa domanda.");
      const result = await saveAnswer({
        id: nanoid(),
        studentId: input.studentId,
        classId: input.classId,
        questionNumber: input.questionNumber,
        selectedAnswer: input.selectedAnswer,
        isCorrect,
      });
      return { ...result, isCorrect: !!isCorrect };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════
//  CLASSES
// ═══════════════════════════════════════════════════════════════════════════

export const classesRouter = router({
  create: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      password: z.string().min(1),
      date: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const code = String(Math.floor(1000 + Math.random() * 9000));
      const cls = await createClass({
        id: nanoid(),
        name: input.name,
        code,
        password: input.password,
        date: input.date,
      });
      return cls;
    }),

  reopen: publicProcedure
    .input(z.object({ code: z.string().length(4), password: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const cls = await getClassByCode(input.code);
      if (!cls) throw new Error("Classe non trovata");
      if (cls.password !== input.password) throw new Error("Password errata");
      return await updateClass(cls.id, { isActive: true, sessionStarted: false, currentQuestion: 0, currentQuestion2: 0, revealedQuestions: "[]" } as any);
    }),

  close: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await updateClass(input.id, { isActive: false });
    }),

  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteClass(input.id);
      return { success: true };
    }),

  removeStudent: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      await deleteStudent(input.id);
      return { success: true };
    }),

  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await getClassById(input.id);
    }),

  getByCode: publicProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ input }) => {
      return await getClassByCode(input.code);
    }),

  listAll: publicProcedure.query(async () => {
    return await getAllClasses();
  }),

  join: publicProcedure
    .input(z.object({
      code: z.string().length(4),
      studentName: z.string().min(1),
    }))
    .mutation(async ({ input }) => {
      const cls = await getClassByCode(input.code);
      if (!cls) throw new Error("Codice classe non valido");
      if (!cls.isActive) throw new Error("Questa classe non è più attiva");

      // Check if student already exists (including removed ones)
      let isReturning = false;
      let student = await getStudentByNameAndClassIncludingRemoved(input.studentName, cls.id);
      if (!student) {
        student = await addStudent({
          id: nanoid(),
          name: input.studentName,
          classId: cls.id,
        });
      } else {
        // Reactivate if previously removed (cleanup timeout or teacher expulsion)
        if ((student as any).removed) {
          await reactivateStudent(student.id);
          student = { ...student, removed: false };
        }
        isReturning = true;
      }

      // Check if this is a dual-MAPA class (we need to handle both MAPA 1 and MAPA 2)
      const allClasses = await getAllClasses();
      const pairedClass = allClasses.find(
        (c) => c.id !== cls.id && c.isActive && c.code === cls.code
      );

      if (pairedClass) {
        let student2 = await getStudentByNameAndClassIncludingRemoved(input.studentName, pairedClass.id);
        if (!student2) {
          student2 = await addStudent({
            id: nanoid(),
            name: input.studentName,
            classId: pairedClass.id,
          });
        } else if ((student2 as any).removed) {
          await reactivateStudent(student2.id);
          student2 = { ...student2, removed: false };
        }
        return {
          classes: [cls, pairedClass],
          students: [student, student2],
          isReturning,
        };
      }

      return { class: cls, student, isReturning };
    }),

  getStudents: publicProcedure
    .input(z.object({ classId: z.string() }))
    .query(async ({ input }) => {
      // Nessun cleanup automatico; solo studenti non rimossi manualmente
      const students = await getStudentsByClass(input.classId);
      const cls = await getClassById(input.classId);
      const cq1 = cls?.currentQuestion || 0;
      const cq2 = (cls as any)?.currentQuestion2 || 0;
      
      // Arricchisci con hasAnsweredCurrent (entrambi i MAPA)
      const enriched = await Promise.all(students.map(async (s: any) => {
        let hasAnsweredCurrent = true;
        if (cq1 > 0) {
          const a1 = await getAnswerByStudentAndQuestion(s.id, cq1);
          if (!a1) hasAnsweredCurrent = false;
        }
        if (cq2 > 0) {
          const a2 = await getAnswerByStudentAndQuestion(s.id, cq2);
          if (!a2) hasAnsweredCurrent = false;
        }
        if (cq1 === 0 && cq2 === 0) hasAnsweredCurrent = true;
        return { ...s, hasAnsweredCurrent };
      }));
      
      return enriched;
    }),

  ping: publicProcedure
    .input(z.object({ studentId: z.string() }))
    .mutation(async ({ input }) => {
      await touchStudent(input.studentId).catch(() => {});
      return { ok: true };
    }),

  startSession: publicProcedure
    .input(z.object({ id: z.string(), group: z.number().int().min(1).max(2) }))
    .mutation(async ({ input }) => {
      const startQ = input.group === 1 ? 1 : 6;
      const field: any = { sessionStarted: true, revealedQuestions: "[]" };
      if (input.group === 1) field.currentQuestion = startQ;
      else field.currentQuestion2 = startQ;
      return await updateClass(input.id, field);
    }),

  nextQuestion: publicProcedure
    .input(z.object({ id: z.string(), group: z.number().int().min(1).max(2) }))
    .mutation(async ({ input }) => {
      const cls = await getClassById(input.id);
      if (!cls) throw new Error("Classe non trovata");
      const cur = input.group === 1 ? cls.currentQuestion : (cls as any).currentQuestion2 || 0;
      const maxQ = input.group === 1 ? 5 : 8;
      const next = cur + 1;
      if (next > maxQ) throw new Error("Ultima domanda raggiunta");
      return await updateClass(input.id, input.group === 1 ? { currentQuestion: next } : { currentQuestion2: next } as any);
    }),

  prevQuestion: publicProcedure
    .input(z.object({ id: z.string(), group: z.number().int().min(1).max(2) }))
    .mutation(async ({ input }) => {
      const cls = await getClassById(input.id);
      if (!cls) throw new Error("Classe non trovata");
      const cur = input.group === 1 ? cls.currentQuestion : (cls as any).currentQuestion2 || 0;
      const minQ = input.group === 1 ? 1 : 6;
      const prev = Math.max(minQ, cur - 1);
      return await updateClass(input.id, input.group === 1 ? { currentQuestion: prev } : { currentQuestion2: prev } as any);
    }),

  revealAnswer: publicProcedure
    .input(z.object({
      id: z.string(),
      questionNumber: z.number(),
      correctAnswer: z.string(),
    }))
    .mutation(async ({ input }) => {
      const cls = await getClassById(input.id);
      if (!cls) throw new Error("Classe non trovata");
      let revealed: Array<{ q: number; a: string }>;
      try {
        revealed = JSON.parse(cls.revealedQuestions || "[]");
      } catch { revealed = []; }
      if (!revealed.find((r) => r.q === input.questionNumber)) {
        revealed.push({ q: input.questionNumber, a: input.correctAnswer });
      }
      const updated = await updateClass(input.id, { revealedQuestions: JSON.stringify(revealed) });

      // Conta risposte esatte solo degli studenti ATTIVI nella sessione
      const activeStudents = await getAllStudentsByClassIncludingRemoved(input.id);
      const activeStudentIds = new Set(activeStudents.map((s: any) => s.id));
      const allAnswers = await getAnswersByClass(input.id);
      const questionAnswers = allAnswers.filter((a: any) =>
        a.questionNumber === input.questionNumber && activeStudentIds.has(a.studentId)
      );
      const correctCount = questionAnswers.filter((a: any) => a.isCorrect === 1 || a.isCorrect === true).length;

      return { ...updated, correctCount };
    }),

  endSession: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      return await updateClass(input.id, { isActive: false, sessionStarted: false });
    }),

  reset: publicProcedure
    .input(z.object({ id: z.string(), group: z.number().int().min(1).max(2) }))
    .mutation(async ({ input }) => {
      const cls = await getClassById(input.id);
      const otherCur = input.group === 1 ? ((cls as any)?.currentQuestion2 || 0) : cls?.currentQuestion || 0;
      const stillActive = otherCur > 0;
      const field: any = { revealedQuestions: "[]" };
      if (input.group === 1) field.currentQuestion = 0;
      else field.currentQuestion2 = 0;
      if (!stillActive) field.sessionStarted = false;
      return await updateClass(input.id, field);
    }),

  stats: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const students = await getAllStudentsByClassIncludingRemoved(input.id);
      const allAnswers = await getAnswersByClass(input.id);
      const studentStats = await Promise.all(
        students.map(async (s: any) => {
          const studentAnswers = allAnswers.filter((a: any) => a.studentId === s.id);
          const ALL_Q = [1,2,3,4,5,6,7,8];
          let totalCorrect = 0;
          let totalPossible = 0;
          for (const qNum of ALL_Q) {
            const a = studentAnswers.find((x: any) => x.questionNumber === qNum);
            const ps = getPartialScore(qNum, a?.selectedAnswer || "");
            totalCorrect += ps.correct;
            totalPossible += ps.total;
          }
          const grade = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 10) : 0;
          return {
            studentId: s.id,
            name: s.name,
            correct: totalCorrect,
            total: totalPossible,
            percentage: totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0,
            grade,
            answers: studentAnswers.map((a: any) => ({
              questionNumber: a.questionNumber,
              selectedAnswer: a.selectedAnswer,
              isCorrect: !!a.isCorrect,
              correctAnswer: getCorrectAnswers(a.questionNumber).join("||"),
            })),
          };
        })
      );
      return studentStats;
    }),

  report: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const cls = await getClassById(input.id);
      if (!cls) throw new Error("Classe non trovata");
      // Esclude studenti rimossi manualmente dal docente
      const students = await getStudentsByClass(input.id);
      const allAnswers = await getAnswersByClass(input.id);
      const questions = SHAKESPEARE_QUESTIONS.map((q) => ({
        ...q,
        correctAnswer: Array.isArray(q.correctAnswer)
          ? q.correctAnswer.join("||")
          : q.correctAnswer,
      }));

      const studentReports = students.map((s: any) => {
        const studentAnswers = allAnswers
          .filter((a: any) => a.studentId === s.id)
          .map((a: any) => ({
            questionNumber: a.questionNumber,
            selectedAnswer: a.selectedAnswer,
            isCorrect: !!a.isCorrect,
          }));
        const ALL_Q = [1,2,3,4,5,6,7,8];
        let totalCorrect = 0;
        let totalPossible = 0;
        for (const qNum of ALL_Q) {
          const a = studentAnswers.find((x: any) => x.questionNumber === qNum);
          const ps = getPartialScore(qNum, a?.selectedAnswer || "");
          totalCorrect += ps.correct;
          totalPossible += ps.total;
        }
        const grade = totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 10) : 0;

        return {
          id: s.id,
          name: s.name,
          score: totalCorrect,
          totalQuestions: totalPossible,
          percentage: totalPossible > 0 ? Math.round((totalCorrect / totalPossible) * 100) : 0,
          grade,
          answers: studentAnswers,
        };
      });

      return {
        className: cls.name,
        schoolYear: new Date().getFullYear().toString(),
        classDate: cls.date || undefined,
        classCode: cls.code,
        questions,
        students: studentReports,
      };
    }),
});

// ═══════════════════════════════════════════════════════════════════════════
//  APP ROUTER
// ═══════════════════════════════════════════════════════════════════════════

export const appRouter = router({
  system: systemRouter,
  questions: questionsRouter,
  answers: answersRouter,
  classes: classesRouter,
});

export type AppRouter = typeof appRouter;
