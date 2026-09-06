/**
 * client/src/pages/StudentQuiz.tsx — MODIFICATO
 *
 * Cambiamenti:
 * 1. Le domande 4 e 5 del MAPA 1 supportano la SELEZIONE MULTIPLA (checkbox)
 *    invece della selezione singola (radio button)
 * 2. Aggiunto messaggio di istruzione che avvisa lo studente quando la domanda
 *    corrente richiede DUE risposte
 * 3. Il submit per domande multiple invia le risposte separate da "||"
 */

import { useState, useMemo, useEffect, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check, XCircle, Loader2, BookOpen, Clock, Info, Home
} from "lucide-react";
import { toast } from "sonner";

type Question = {
  number: number;
  question: string;
  options: string[];
};

// ── Domande che richiedono DUE risposte (MAPA 1, domande 4 e 5) ──────
const MULTI_ANSWER_QUESTIONS = new Set([4, 5]);
const MULTI_ANSWER_COUNT = 2; // quante risposte selezionare

// =============================================================================
// StudentGroupQuiz
// =============================================================================

function StudentGroupQuiz({
  group,
  classId,
  studentId,
  questions,
}: {
  group: 1 | 2;
  classId: string;
  studentId: string;
  questions: Question[];
}) {
  const minQ = group === 1 ? 1 : 6;
  const maxQ = group === 1 ? 5 : 8;
  const groupLabel = `MAPA ${group}`;

  const submitAnswer = trpc.answers.submit.useMutation();

  // Recupera le risposte già date in sessioni precedenti
  const { data: myAnswers } = trpc.answers.getMyAnswers.useQuery(
    { studentId, classId },
    { enabled: !!studentId && !!classId }
  );

  // Per domande multiple: selectedAnswers è un Set di stringhe
  // Per domande singole: usiamo selectedAnswer (stringa)
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [selectedAnswers, setSelectedAnswers] = useState<Set<string>>(new Set());
  const [answerSubmitted, setAnswerSubmitted] = useState(false);
  const [groupAnswers, setGroupAnswers] = useState<Record<number, string>>({});
  const [groupResults, setGroupResults] = useState<Record<number, boolean>>({});
  const answersLoaded = useRef(false);
  const justSubmittedRef = useRef(false);

  // Popola groupAnswers/groupResults dalle risposte già salvate (da sessioni precedenti)
  useEffect(() => {
    if (!myAnswers || answersLoaded.current) return;
    const ga: Record<number, string> = {};
    const gr: Record<number, boolean> = {};
    for (const a of myAnswers) {
      ga[a.questionNumber] = a.selectedAnswer;
      gr[a.questionNumber] = !!a.isCorrect;
    }
    setGroupAnswers(ga);
    setGroupResults(gr);

    // Se la domanda corrente ha già una risposta, mostrala subito
    const existingAnswer = ga[currentQClass];
    if (existingAnswer !== undefined) {
      if (isMulti) {
        setSelectedAnswers(new Set(existingAnswer.split("||").filter(Boolean)));
      } else {
        setSelectedAnswer(existingAnswer);
      }
      setAnswerSubmitted(true);
    }

    answersLoaded.current = true;
  }, [myAnswers]);

  const { data: currentClass } = trpc.classes.getById.useQuery(
    { id: classId },
    { enabled: !!classId, refetchInterval: 2000 }
  );

  const currentQClass = group === 1 ? (currentClass?.currentQuestion || 0) : ((currentClass as any)?.currentQuestion2 || 0);
  const displayQNumber = group === 1 ? currentQClass : currentQClass - 5;
  const displayQMin = 1;
  const displayQMax = group === 1 ? 5 : 3;
  const revealedData = useMemo(() => {
    try { return JSON.parse(currentClass?.revealedQuestions || "[]") as Array<{ q: number; a: string }>; } catch { return []; }
  }, [currentClass?.revealedQuestions]);
  const currentRevealed = revealedData.find(r => r.q === currentQClass);

  const currentQ = questions.find((q) => q.number === currentQClass);
  const isMulti = group === 1 && MULTI_ANSWER_QUESTIONS.has(displayQNumber);

  // Reset answer when teacher moves to a new question
  useEffect(() => {
    justSubmittedRef.current = false;
    const prevAnswer = groupAnswers[currentQClass];
    if (prevAnswer !== undefined) {
      if (isMulti) {
        setSelectedAnswers(new Set(prevAnswer.split("||").filter(Boolean)));
      } else {
        setSelectedAnswer(prevAnswer);
      }
      setAnswerSubmitted(true);
    } else {
      setSelectedAnswer("");
      setSelectedAnswers(new Set());
      setAnswerSubmitted(false);
    }
  }, [currentQClass]);

  // ── Single-answer handler ──────────────────────────────────────────
  const handleSelectAnswer = async (option: string) => {
    if (!currentQ || answerSubmitted || currentRevealed) return;
    setSelectedAnswer(option);
    setAnswerSubmitted(true);
    justSubmittedRef.current = true;
    try {
      const result = await submitAnswer.mutateAsync({
        studentId,
        classId,
        questionNumber: currentQClass,
        selectedAnswer: option,
      });
      setGroupResults((prev) => ({ ...prev, [currentQClass]: result.isCorrect }));
      setGroupAnswers((prev) => ({ ...prev, [currentQClass]: option }));
    } catch (err: any) {
      toast.error(err?.message || "Errore nell'invio della risposta");
    }
  };

  // ── Multi-answer handler ───────────────────────────────────────────
  const toggleMultiAnswer = (option: string) => {
    if (answerSubmitted || !!currentRevealed) return;
    setSelectedAnswers((prev) => {
      const next = new Set(prev);
      if (next.has(option)) {
        next.delete(option);
      } else {
        if (next.size >= MULTI_ANSWER_COUNT) return prev; // max reached
        next.add(option);
      }
      return next;
    });
  };

  const handleSubmitMulti = async () => {
    if (!currentQ || answerSubmitted || currentRevealed) return;
    if (selectedAnswers.size !== MULTI_ANSWER_COUNT) {
      toast.error(`Seleziona esattamente ${MULTI_ANSWER_COUNT} risposte.`);
      return;
    }
    setAnswerSubmitted(true);
    justSubmittedRef.current = true;
    const joined = Array.from(selectedAnswers).join("||");
    try {
      const result = await submitAnswer.mutateAsync({
        studentId,
        classId,
        questionNumber: currentQClass,
        selectedAnswer: joined,
      });
      setGroupResults((prev) => ({ ...prev, [currentQClass]: result.isCorrect }));
      setGroupAnswers((prev) => ({ ...prev, [currentQClass]: joined }));
    } catch (err: any) {
      toast.error(err?.message || "Errore nell'invio della risposta");
    }
  };

  if (!studentId) return null;

  return (
    <div className="space-y-3">
      {/* Group label */}
      <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
        <div className="flex items-center gap-2">
          <BookOpen className="size-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">{groupLabel}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">
          Domande {displayQMin}–{displayQMax}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
        <div
          className="h-full rounded-full bg-plum transition-all duration-500 ease-in-out"
          style={{ width: `${((displayQNumber || displayQMin) - displayQMin + 1) / (displayQMax - displayQMin + 1) * 100}%` }}
        />
      </div>



      {/* Waiting / Active / Completed */}
      {currentQClass < minQ ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Clock className="size-6 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            In attesa che il docente avvii {groupLabel}.
          </p>
        </div>
      ) : currentQClass > maxQ ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Clock className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Domande completate.
          </p>
        </div>
      ) : !currentQ ? (
        <div className="flex flex-col items-center gap-3 py-6">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">Caricamento...</p>
        </div>
      ) : (
        <>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground tracking-widest mb-1.5">
              DOMANDA {displayQNumber}
            </p>
            <h3 className="text-sm sm:text-base font-bold text-foreground leading-relaxed">
              {currentQ.question}
            </h3>
          </div>



          {/* ── Opzioni (single-select) ───────────────────────────── */}
          {!isMulti && (
            <div className="space-y-1.5">
              {currentQ.options.map((option, idx) => {
                let optClass = "border-border/60 hover:border-plum/40 hover:bg-plum/5 cursor-pointer";
                let letterClass = "bg-muted text-muted-foreground";
                let showIcon = null;

                if (currentRevealed && option === currentRevealed.a) {
                  // Risposta corretta: nessun highlight, solo neutro
                  optClass = "cursor-default border-border/30 text-muted-foreground";
                  letterClass = "bg-muted text-muted-foreground";
                } else if (currentRevealed && selectedAnswer === option && answerSubmitted && option !== currentRevealed.a) {
                  // Risposta sbagliata: nessun highlight rosso, solo neutro
                  optClass = "cursor-default border-border/30 text-muted-foreground";
                  letterClass = "bg-muted text-muted-foreground";
                } else if (selectedAnswer === option && answerSubmitted) {
                  optClass = "border-plum/50 bg-plum/5 text-plum cursor-default";
                  letterClass = "bg-plum/60 text-white";
                }

                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectAnswer(option)}
                    disabled={answerSubmitted || submitAnswer.isPending || !!currentRevealed}
                    className={`w-full py-3.5 px-3 rounded-lg border text-left transition-all ${optClass} ${answerSubmitted ? "cursor-default" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`size-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${letterClass}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="text-xs sm:text-sm font-medium leading-snug">{option}</span>
                      {showIcon}
                      {submitAnswer.isPending && selectedAnswer === option && (
                        <Loader2 className="size-3 animate-spin ml-auto text-muted-foreground shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Opzioni (multi-select) ─────────────────────────────── */}
          {isMulti && (
            <>
              <div className="space-y-1.5">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedAnswers.has(option);
                  let optClass = "border-border/60 hover:border-plum/40 hover:bg-plum/5 cursor-pointer";
                  let letterClass = "bg-muted text-muted-foreground";
                  let showIcon = null;

                  if (isSelected && !answerSubmitted) {
                    optClass = "border-plum/50 bg-plum/5 text-plum";
                    letterClass = "bg-plum/60 text-white";
                    showIcon = <Check className="size-3.5 ml-auto text-plum shrink-0" />;
                  } else if (isSelected && answerSubmitted) {
                    optClass = "cursor-default border-border/30 text-muted-foreground";
                    showIcon = <Check className="size-3.5 ml-auto text-muted-foreground shrink-0" />;
                  } else if (answerSubmitted) {
                    optClass = "cursor-default border-border/30 text-muted-foreground";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => toggleMultiAnswer(option)}
                      disabled={answerSubmitted || !!currentRevealed}
                      className={`w-full py-3.5 px-3 rounded-lg border text-left transition-all ${optClass}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`size-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${letterClass}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="text-xs sm:text-sm font-medium leading-snug">{option}</span>
                        {showIcon}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottone "Invia risposte" per multi-select */}
              {!answerSubmitted && (
                <button
                  onClick={handleSubmitMulti}
                  disabled={selectedAnswers.size !== MULTI_ANSWER_COUNT || submitAnswer.isPending || !!currentRevealed}
                  style={{
                    width:"100%",height:"40px",fontSize:"14px",fontWeight:600,
                    borderRadius:"8px",border:"none",
                    fontFamily:"Cambria, Georgia, 'Times New Roman', serif",
                    letterSpacing:"0.02em",
                    transition:"all 0.15s ease",
                    ...(selectedAnswers.size !== MULTI_ANSWER_COUNT
                      ? {background:"#A0A0A0",color:"#fff",cursor:"not-allowed"}
                      : {background:"#5c3d2e",color:"#fff"}
                    )
                  }}
                >
                  {submitAnswer.isPending ? (
                    <Loader2 className="size-4 animate-spin mr-1" style={{display:"inline"}} />
                  ) : null}
                  Invia {MULTI_ANSWER_COUNT} risposte ({selectedAnswers.size}/{MULTI_ANSWER_COUNT})
                </button>
              )}

              {/* Contatore selezioni */}
              {!answerSubmitted && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Selezionate {selectedAnswers.size} di {MULTI_ANSWER_COUNT} risposte richieste
                </p>
              )}
            </>
          )}

          {currentRevealed && (
            <div className="w-full p-2.5 rounded-lg text-center text-[11px] font-medium bg-green-50 text-green-700 border border-green-200">
              ✅ Risposta esatta: <strong>{currentRevealed.a.includes("||") ? currentRevealed.a.split("||").join(" + ") : currentRevealed.a}</strong>
            </div>
          )}

          {answerSubmitted && !currentRevealed && (
            <p className="text-[10px] text-muted-foreground text-center">
              {justSubmittedRef.current
                ? "Risposta inviata. Attendi che il docente riveli la risposta esatta."
                : "Hai già risposto a questa domanda."}
            </p>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// STUDENT QUIZ (MAIN) — invariato rispetto all'originale
// =============================================================================

export default function StudentQuiz() {
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const code = params.get("code") || "";

  const [, navigate] = useLocation();

  const [studentSurname, setStudentSurname] = useState("");
  const [studentGivenName, setStudentGivenName] = useState("");
  const [joined, setJoined] = useState(false);

  const [studentId1, setStudentId1] = useState("");
  const [classId1, setClassId1] = useState("");
  const [classInfo1, setClassInfo1] = useState<any>(null);
  const [studentId2, setStudentId2] = useState("");
  const [classId2, setClassId2] = useState("");
  const [classInfo2, setClassInfo2] = useState<any>(null);

  const [classClosed, setClassClosed] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const joinClass = trpc.classes.join.useMutation({
    onSuccess: (data: any) => {
      if (data.classes && data.classes.length >= 2 && data.students && data.students.length >= 2) {
        setClassInfo1(data.classes[0]);
        setClassId1(data.classes[0].id);
        setStudentId1(data.students[0].id);
        setClassInfo2(data.classes[1]);
        setClassId2(data.classes[1].id);
        setStudentId2(data.students[1].id);
      } else if (data.class && data.student) {
        setClassInfo1(data.class);
        setClassId1(data.class.id);
        setStudentId1(data.student.id);
      }
      if (data.isReturning) setIsReturning(true);
      setJoined(true);
      toast.success("Sei entrato nella classe!");
    },
    onError: (err) => { toast.error(err.message); },
  });

  const questionsQuery = trpc.questions.list.useQuery();
  const allQuestions: Question[] = questionsQuery.data || [];
  const questions1 = allQuestions.filter(q => q.number >= 1 && q.number <= 5);
  const questions2 = allQuestions.filter(q => q.number >= 6 && q.number <= 8);

  const { data: currentClass1 } = trpc.classes.getById.useQuery(
    { id: classId1 },
    { enabled: !!classId1, refetchInterval: 2000 }
  );
  const { data: currentClass2 } = trpc.classes.getById.useQuery(
    { id: classId2 },
    { enabled: !!classId2, refetchInterval: 2000 }
  );

  // MAPA 2 condivide la stessa classe di MAPA 1 — leggiamo currentQuestion2 da currentClass1
  const isActive1 = currentClass1?.isActive ?? true;
  const cq1 = currentClass1?.currentQuestion ?? 0;
  const cq2 = (currentClass1 as any)?.currentQuestion2 ?? 0;
  const mapa1InRange = cq1 >= 1 && cq1 <= 5;
  const mapa2InRange = cq2 >= 6 && cq2 <= 8;
  const bothWaiting = isReturning || (!mapa1InRange && !mapa2InRange);

  // Quando il docente avvia un MAPA, sblocca lo studente in attesa
  // (solo se il MAPA passa da inattivo → attivo; NON al mount)
  const prevAnyInRange = useRef<boolean | null>(null);
  useEffect(() => {
    const anyInRange = mapa1InRange || mapa2InRange;
    if (isReturning && anyInRange && prevAnyInRange.current === false) {
      setIsReturning(false);
    }
    prevAnyInRange.current = anyInRange;
  }, [mapa1InRange, mapa2InRange, isReturning]);

  // Chiudi quando la classe viene disattivata
  useEffect(() => {
    if (!classClosed && !isActive1 && joined) {
      setClassClosed(true);
    }
  }, [isActive1, joined, classClosed]);

  // Riapri quando il docente riattiva la classe
  useEffect(() => {
    if (classClosed && isActive1) {
      setClassClosed(false);
    }
  }, [isActive1, classClosed]);

  const fullName = `${studentGivenName.trim()} ${studentSurname.trim()}`.trim();

  const handleJoin = async () => {
    if (!fullName) { toast.error("Inserisci cognome e nome"); return; }
    if (!code) { toast.error("Codice classe non valido"); return; }
    joinClass.mutate({ code, studentName: fullName });
  };

  // ── Ping periodico per mantenere lo studente attivo ──
  const pingMutation = trpc.classes.ping.useMutation();
  useEffect(() => {
    if (!joined || !studentId1) return;
    const ping = () => {
      pingMutation.mutate({ studentId: studentId1 });
      if (studentId2) pingMutation.mutate({ studentId: studentId2 });
    };
    ping(); // ping immediato
    const interval = setInterval(ping, 30000);
    return () => clearInterval(interval);
  }, [joined, studentId1, studentId2]);

  // ========== RENDER ==========

  if (!code) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-4">
        <BookOpen className="size-16 text-plum/50" />
        <h1 className="text-2xl font-bold text-foreground">CODICE NON VALIDO</h1>
        <p className="text-muted-foreground text-sm">Nessun codice classe fornito.</p>
        <Button onClick={() => navigate("/")} className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6">TORNA ALLA HOME</Button>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="min-h-screen bg-background paper-grain flex flex-col">
        {/* Header */}
        <header className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-9">
          <div className="flex flex-col items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight text-foreground text-center">
              PAROLE CHIAVE INTERATTIVE
            </h1>
            <button
              onClick={() => navigate("/")}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-plum/40 hover:text-plum mb-4"
            >
              <Home className="size-4" />
              HOME
            </button>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 flex items-start justify-center px-4 pb-16">
          <div className="w-full max-w-md animate-pop-in">
            <div className="bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-lg transition-shadow animate-pop-in">
              <div className="p-6 sm:p-8 flex flex-col items-center gap-5">
                {/* Book icon */}
                <div className="size-14 rounded-2xl bg-plum/10 flex items-center justify-center">
                  <BookOpen className="size-7 text-plum" />
                </div>

                <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                  ENTRA NELLA CLASSE
                </h2>

                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm text-center">
                  CODICE CLASSE: <strong className="tracking-widest text-plum">{code}</strong>
                </p>

                <div className="w-full space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Cognome"
                      value={studentSurname}
                      onChange={(e) => setStudentSurname(e.target.value)}
                      className="h-12 text-base text-center border-gray-300 focus-visible:ring-plum focus-visible:border-plum"
                    />
                    <Input
                      placeholder="Nome"
                      value={studentGivenName}
                      onChange={(e) => setStudentGivenName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                      className="h-12 text-base text-center border-gray-300 focus-visible:ring-plum focus-visible:border-plum"
                    />
                  </div>
                  <Button
                    onClick={handleJoin}
                    disabled={joinClass.isPending || !fullName}
                    className="w-full h-12 rounded-xl bg-plum hover:bg-plum/90 text-white font-bold tracking-wider"
                  >
                    {joinClass.isPending ? <Loader2 className="size-4 animate-spin" /> : "ENTRA"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (classClosed) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-sm w-full border-border/40 shadow-none">
          <CardContent className="p-8 flex flex-col items-center gap-5">
            <div className="size-16 rounded-2xl bg-red-50 flex items-center justify-center">
              <XCircle className="size-8 text-red-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">IL DOCENTE HA CHIUSO LA CLASSE</h2>
            <p className="text-sm text-muted-foreground text-center">La sessione è terminata. Grazie per aver partecipato!</p>
            <Button onClick={() => navigate("/")} className="w-full h-11 text-sm bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">HOME</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (bothWaiting) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="max-w-sm w-full border-border/40 shadow-none">
          <CardContent className="p-8 flex flex-col items-center gap-4">
            <div className="size-16 rounded-2xl bg-amber-50 flex items-center justify-center animate-pulse">
              <Clock className="size-8 text-amber-500" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-foreground text-center">IN ATTESA DEL DOCENTE</h2>
            <p className="text-sm text-muted-foreground text-center">
              Ciao <strong>{fullName}</strong>, la sessione non è ancora iniziata.
              Attendi che il docente avvii le domande.
            </p>
            <div className="flex items-center gap-2 mt-1">
              <div className="size-1.5 rounded-full bg-plum animate-pulse" />
              <span className="text-xs text-muted-foreground">In ascolto...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-bold leading-tight text-foreground">
            PAROLE CHIAVE INTERATTIVE
          </h1>
          <span className="text-[11px] text-muted-foreground shrink-0 ml-2">
            {fullName} · {classInfo1?.code}
          </span>
        </div>
      </div>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-6">
        {questions1.length > 0 && questions2.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card className="border-border/40 shadow-none bg-card">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <StudentGroupQuiz group={1} classId={classId1} studentId={studentId1} questions={questions1} />
              </CardContent>
            </Card>
            <Card className="border-border/40 shadow-none bg-card">
              <CardContent className="p-4 sm:p-5 space-y-3">
                <StudentGroupQuiz group={2} classId={classId2 || classId1} studentId={studentId2 || studentId1} questions={questions2} />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        )}
      </main>
    </div>
  );
}
