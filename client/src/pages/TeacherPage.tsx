import { useState, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import AudioPlayer from "@/components/AudioPlayer";
import { AUDIO_TRACKS, getTrackForGroup } from "@/lib/audioData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft, ArrowRight, Eye, StopCircle, Trash2, Loader2,
  Clock, Play, Flag, FileText, UserX, BookOpen, Users,
  Plus, Hash, EyeOff, Key, LogOut, Check, XCircle, CheckCircle2,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { generateReportPdf, generateBlankQuestionsPdf } from "@/lib/reportPdf";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/* ═══════════════════════ GROUP PANEL ═══════════════════════ */

function GroupPanel({
  group, classId, questions,
}: {
  group: 1 | 2; classId: string;
  questions: Array<{ number: number; question: string; options: string[] }>;
}) {
  const minQ = group === 1 ? 1 : 6; const maxQ = group === 1 ? 5 : 8; const dMax = group === 1 ? 5 : 3;

  const { data: cls, refetch } = trpc.classes.getById.useQuery(
    { id: classId }, { enabled: !!classId, refetchInterval: 2000 });
  const { data: qwa } = trpc.questions.listWithAnswers.useQuery();

  const start  = trpc.classes.startSession.useMutation({ onSuccess: () => refetch() });
  const next   = trpc.classes.nextQuestion.useMutation({ onSuccess: () => refetch() });
  const prev   = trpc.classes.prevQuestion.useMutation({ onSuccess: () => refetch() });
  const reveal = trpc.classes.revealAnswer.useMutation({ onSuccess: () => refetch() });
  const reset  = trpc.classes.reset.useMutation({ onSuccess: () => refetch() });

  const started = cls?.sessionStarted ?? false;
  const curQ = group === 1 ? (cls?.currentQuestion ?? 0) : ((cls as any)?.currentQuestion2 ?? 0);
  const active = cls?.isActive ?? true;
  const inRange = curQ >= minQ && curQ <= maxQ;
  const dispQ = group === 1 ? curQ : curQ - 5;

  const revealed = useMemo(() => {
    try { return JSON.parse(cls?.revealedQuestions || "[]") as Array<{q:number;a:string}>; } catch { return []; }
  }, [cls?.revealedQuestions]);
  const curRev = revealed.find(r => r.q === curQ);
  const isRev = !!curRev;
  const curQst = questions.find(q => q.number === curQ);

  const [revealStats, setRevealStats] = useState<{ q: number; correctCount: number } | null>(null);

  const handleReveal = async () => {
    if (!curQ || !qwa) return;
    const fq = qwa.find(qa => curQ === qa.number);
    if (!fq) return;
    try {
      const result = await reveal.mutateAsync({ id: classId, questionNumber: curQ, correctAnswer: fq.correctAnswer });
      setRevealStats({ q: curQ, correctCount: (result as any).correctCount ?? 0 });
    } catch { /* gestito dal mutation */ }
  };

  if (!active) return (
    <div className="flex flex-col items-center gap-2 py-5 text-muted-foreground">
      <StopCircle size={22} className="text-muted-foreground/50"/>
      <span className="text-sm font-serif">Sessione terminata</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5 mr-auto shrink-0">
          <BookOpen size={14} className="text-foreground"/>
          <span className="text-[11px] font-bold text-foreground uppercase tracking-wider font-serif">MAPA {group}</span>
        </div>
        {started && inRange && <span className="text-[10px] text-muted-foreground">Domanda {dispQ}/{dMax}</span>}
        {/* AVVIA — sempre visibile (disabilitato quando la MAPA è già in corso) */}
        <button onClick={()=>start.mutate({id:classId, group})} disabled={start.isPending || inRange}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-foreground text-primary-foreground text-[10px] font-semibold uppercase tracking-wider hover:bg-foreground/80 transition-colors disabled:opacity-40">
          <Play size={11}/>AVVIA
        </button>
        {started && inRange && (<>
          <button onClick={()=>prev.mutate({id:classId, group})} disabled={curQ<=minQ}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-40">
            <ArrowLeft size={13}/></button>
          <button onClick={()=>next.mutate({id:classId, group})} disabled={curQ>=maxQ}
            className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-border bg-card hover:bg-secondary transition-colors disabled:opacity-40">
            <ArrowRight size={13}/></button>
          {!isRev && (
            <button onClick={handleReveal}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-accent text-accent-foreground text-[10px] font-semibold uppercase tracking-wider hover:bg-accent/80 transition-colors">
              <Eye size={11}/>MOSTRA
            </button>
          )}
          <button onClick={()=>reset.mutate({id:classId, group})}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-red-50 text-red-700 border border-red-200 text-[10px] font-semibold uppercase tracking-wider hover:bg-red-100 transition-colors">
            <Flag size={11}/>FINE
          </button>
        </>)}
      </div>

      <AudioPlayer
        track={AUDIO_TRACKS[getTrackForGroup(group)]}
        activeSegment={started && inRange ? dispQ - 1 : 0}
        className="mb-1"
      />

      {started && inRange && curQst ? (
        <div className="flex flex-col gap-2.5">
          <div className="text-center py-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.15em] mb-1">DOMANDA {dispQ}</p>
            <h3 className="font-serif text-[15px] font-bold text-card-foreground">{curQst.question}</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            {curQst.options.map((opt,i)=>{
              return (
                <div key={i} className="flex items-center gap-2 p-2.5 rounded-md border border-border bg-card text-card-foreground">
                  <span className="inline-flex items-center justify-center w-5.5 h-5.5 rounded text-[9px] font-bold bg-secondary text-muted-foreground">{String.fromCharCode(65+i)}</span>
                  <span className="text-[13px] font-medium">{opt}</span>
                </div>
              );
            })}
          </div>
          {isRev && curRev && (
            <div className="text-center p-2.5 rounded-md bg-green-50 border border-green-200">
              <span className="text-[10px] font-normal text-green-700 uppercase">
                ✅ RISPOSTA ESATTA: {curRev.a.includes("||")?curRev.a.split("||").join(" + "):curRev.a}{" "}
                {revealStats && revealStats.q === curQ && `(${revealStats.correctCount} RISPOST${revealStats.correctCount !== 1 ? "E" : "A"} ESATT${revealStats.correctCount !== 1 ? "E" : "A"})`}
              </span>
            </div>
          )}
        </div>
      ) : started && !inRange ? (
        <div className="flex flex-col items-center gap-2 py-5 text-muted-foreground">
          <Clock size={18}/><span className="text-[11px]">{curQ<minQ?`In attesa... (MAPA ${group===1?"1":"2"} inizierà dopo)`:"Domande completate"}</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 py-5 text-muted-foreground">
          <Play size={18}/><span className="text-[11px]">Clicca &ldquo;AVVIA&rdquo; per iniziare</span>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════ TEACHER PAGE ═══════════════════════ */

export default function TeacherPage() {
  const [, nav] = useLocation();
  const [selId, setSelId] = useState<string|null>(null);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0,10));
  const [newPw, setNewPw] = useState("");
  const [showNewPw, setShowNewPw] = useState(false);
  const [reCode, setReCode] = useState("");
  const [rePw, setRePw] = useState("");
  const [showRePw, setShowRePw] = useState(false);

  const utils = trpc.useUtils();
  const { data: all, refetch: refetchAll } = trpc.classes.listAll.useQuery();
  const { data: detail } = trpc.classes.getById.useQuery({id:selId||""},{enabled:!!selId,refetchInterval:3000});
  const { data: questions } = trpc.questions.list.useQuery();
  const { data: students } = trpc.classes.getStudents.useQuery({classId:selId||""},{enabled:!!selId, refetchInterval: 2000});
  const { data: stats } = trpc.classes.stats.useQuery({id:selId||""},{enabled:!!selId, refetchInterval: 2000});
  const { data: report } = trpc.classes.report.useQuery({id:selId||""},{enabled:!!selId});

  const create = trpc.classes.create.useMutation({onSuccess:(d)=>{toast.success(`Classe creata! Codice: ${d.code}`);setNewName("");setNewDate("");setNewPw("");setSelId(d.id);refetchAll();},onError:(e:any)=>toast.error(e.message)});
  const reopen = trpc.classes.reopen.useMutation({onSuccess:(d)=>{toast.success("Classe riaperta!");setReCode("");setRePw("");setSelId(d.id);refetchAll();},onError:(e:any)=>toast.error(e.message)});
  const closeC = trpc.classes.close.useMutation({onSuccess:()=>{setSelId(null);refetchAll();toast.success("Classe chiusa");}});
  const del = trpc.classes.delete.useMutation({onSuccess:()=>{setSelId(null);refetchAll();toast.success("Classe eliminata");}});
  const rmStudent = trpc.classes.removeStudent.useMutation({onSuccess:()=>{utils.classes.getStudents.invalidate();toast.success("Studente rimosso");}});
  const endSession = trpc.classes.endSession.useMutation({onSuccess:()=>{refetchAll();toast.success("Sessione terminata");}});

  const q1 = (questions||[]).filter(q=>q.number>=1&&q.number<=5);
  const q2 = (questions||[]).filter(q=>q.number>=6&&q.number<=8);

  const hCreate = () => { if(!newName.trim()||!newPw.trim()){toast.error("Compila Nome classe e Password");return;} create.mutate({name:newName.trim(),password:newPw,date:newDate||undefined}); };
  const hReopen = () => { if(reCode.length!==4||!rePw.trim()){toast.error("Inserisci codice e password");return;} reopen.mutate({code:reCode,password:rePw}); };
  const hDel = (id:string) => { if(confirm("Eliminare questa classe?")){ if(selId===id)setSelId(null); del.mutate({id}); }};
  const hClose = () => { if (!selId) return; setSelId(null); closeC.mutate({ id: selId }); };
  const hTermina = () => { if (!selId) return; endSession.mutate({ id: selId }); };
  const hReport = () => { if (report) void generateReportPdf(report as any); };
  const hBlank = () => { if (detail) void generateBlankQuestionsPdf({ className: detail.name, classDate: detail.date, questions: (report as any)?.questions || questions || [] }); };

  /* ── Expand student answers ── */
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  /* ── Tooltip nome studente: su touch mostra il nome completo al tap ── */
  const [tooltipStudent, setTooltipStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!tooltipStudent) return;
    const close = () => setTooltipStudent(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [tooltipStudent]);

  /* ── Score color helper ── */
  const scoreColor = (grade: number) => {
    if (grade >= 8) return "text-green-600";
    if (grade >= 6) return "text-amber-600";
    return "text-red-500";
  };

  /* ── Completed count ── */
  const completedCount = useMemo(() => {
    if (!stats) return 0;
    return stats.filter((s: any) => s.grade > 0 || s.total > 0).length;
  }, [stats]);

  /* ── Pending students (chi non ha risposto alla domanda corrente) ── */
  const pendingStudents = useMemo(() => {
    if (!students || !detail) return [];
    const curQ = detail.currentQuestion || 0;
    const curQ2 = (detail as any).currentQuestion2 || 0;
    // Choose the active question: prefer MAPA 1 if in range, else MAPA 2
    const activeQuestion = (curQ >= 1 && curQ <= 5) ? curQ : (curQ2 >= 6 && curQ2 <= 8) ? curQ2 : 0;
    if (activeQuestion === 0) return [];
    // Find student IDs who have answered the active question
    const answeredIds = new Set(
      (stats || [])
        .filter((ss: any) => ss.answers?.some((a: any) => a.questionNumber === activeQuestion))
        .map((ss: any) => ss.studentId)
    );
    return students.filter((s: any) => !answeredIds.has(s.id));
  }, [students, stats, detail]);

  return (
    <div className="lf-docente min-h-screen bg-background paper-grain flex items-start justify-center p-3 sm:p-4 overflow-x-hidden">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-webkit-credentials-auto-fill-button {
          display: none !important;
        }
        aside input, aside input::placeholder {
          text-align: left !important;
        }
        aside input[type="date"]::-webkit-calendar-picker-indicator {
          opacity: 0 !important;
        }
      `}</style>

      <div className="lf-docente-card w-full max-w-6xl min-h-[580px] max-h-[92vh] bg-card rounded-2xl border border-border/60 shadow-xl flex flex-col overflow-hidden">

        {/* UPBAR */}
        <header className="shrink-0 border-b border-border/40 px-5 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-lg sm:text-xl font-bold leading-tight text-foreground">
                PAROLE CHIAVE INTERATTIVE
              </h1>
            </div>
            <a href="/" className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition hover:border-plum/40 hover:text-plum">
              <Users className="size-4" />
              Area studenti
            </a>
          </div>
        </header>

        {/* MIDDLE ROW: sidebar + main */}
        <div className="lf-docente-body min-h-0 flex-1 flex flex-col sm:flex-row overflow-y-auto sm:overflow-hidden">

          {/* SIDEBAR */}
          <aside className="w-full sm:w-72 shrink-0 sm:border-r sm:border-l-0 border-b sm:border-b-0 border-border/40 bg-card/40 sm:overflow-y-auto block pb-4 sm:pb-0">
            <div className="p-4 space-y-5">
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Plus className="size-3.5 text-plum" />
                  APRI UNA NUOVA CLASSE
                </h3>
                <div className="space-y-2">
                  <Input placeholder="Nome classe" value={newName} onChange={e=>setNewName(e.target.value)} className="h-9 text-sm !text-center" />
                  <div className="relative cursor-pointer" onClick={(e)=>{ const inp = e.currentTarget.querySelector('input') as HTMLInputElement | null; if (inp && typeof (inp as any).showPicker === 'function') (inp as any).showPicker(); }}>
                    <Input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} className="h-9 text-sm text-transparent" />
                    <span className={`pointer-events-none absolute inset-0 flex items-center justify-center text-sm ${newDate ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {newDate ? new Date(newDate+'T00:00:00').toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}) : 'gg/mm/aaaa'}
                    </span>
                  </div>
                  <div className="relative">
                    <Input type={showNewPw?"text":"password"} placeholder="Password" value={newPw} onChange={e=>setNewPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&hCreate()} className="h-9 text-sm pr-8 !text-center" />
                    <button type="button" onClick={()=>setShowNewPw(!showNewPw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showNewPw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <Button onClick={hCreate} disabled={create.isPending} className="w-full h-9 text-sm font-semibold" size="sm">
                    {create.isPending ? <Loader2 className="size-4 animate-spin" /> : "CREA CLASSE"}
                  </Button>
                </div>
              </div>
              <hr className="border-border/40" />
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Key className="size-3.5 text-plum" />
                  RIAPRI UNA CLASSE
                </h3>
                <div className="space-y-2">
                  <div className="relative">
                    <Hash className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                    <Input placeholder="Codice" value={reCode} onChange={e=>setReCode(e.target.value.replace(/\D/g,"").slice(0,4))} className="pl-8 h-9 text-sm !text-center" maxLength={4} />
                  </div>
                  <div className="relative">
                    <Input type={showRePw?"text":"password"} placeholder="Password" value={rePw} onChange={e=>setRePw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&hReopen()} className="h-9 text-sm pr-8 !text-center" />
                    <button type="button" onClick={()=>setShowRePw(!showRePw)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showRePw ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    </button>
                  </div>
                  <Button onClick={hReopen} disabled={reopen.isPending} className="w-full h-9 text-sm font-semibold" size="sm">RIAPRI</Button>
                </div>
              </div>
              <hr className="border-border/40" />
              <div>
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                  <BookOpen className="size-3.5 text-plum" />
                  LE TUE CLASSI
                </h3>
                {(!all||all.length===0)?(
                  <p className="text-xs text-muted-foreground text-center py-6">Nessuna classe ancora creata.</p>
                ):(
                  <div className="space-y-0.5">
                    {all.map((c:any)=>(
                      <div key={c.id}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-foreground `}
                      >
                        <div className={`size-2 rounded-full shrink-0 ${c.isActive?"bg-green-500":"bg-gray-300"}`} />
                        <span className="flex-1 truncate font-medium">{c.name}</span>
                        <span className="text-xs font-mono text-muted-foreground">{c.code}</span>

                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* MAIN */}
          <main className="flex-1 sm:overflow-y-auto">
            <div className="w-full p-4 sm:p-5">

              {!selId ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="size-20 rounded-3xl bg-muted/60 flex items-center justify-center mb-6">
                    <BookOpen className="size-10 text-muted-foreground/40" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Nessuna classe selezionata</h2>
                  <p className="text-sm text-muted-foreground max-w-sm">
                    Crea una nuova classe dalla barra laterale oppure riaprine una già esistente
                  </p>
                </div>
              ) : (
                /* ── Class selected ── */
                <div className="animate-pop-in space-y-6 max-w-[900px] mx-auto">

                  {/* ═══ INFO CARD ═══ */}
                  <Card className="bg-primary/5 border-2 border-primary/30 shadow-md">
                    <CardContent className="p-5 sm:p-6 space-y-4 sm:space-y-5">
                      {/* Riga 1: icona + nome + data */}
                      <div className="flex items-center justify-center gap-3">
                        <div className="size-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                          <BookOpen className="size-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-lg sm:text-xl font-bold text-foreground truncate">{detail?.name||"..."}</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {detail?.date && new Date(detail.date+'T00:00:00').toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'})}
                          </p>
                        </div>
                      </div>
                      {/* Riga 2: codice + CHIUDI */}
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-lg bg-card border border-border/50 px-3 py-1.5 shrink-0">
                          <Hash className="size-4 sm:size-5 text-primary" />
                          <span className="font-bold text-base sm:text-lg text-primary tracking-widest" style={{fontFamily:"Cambria,Georgia,'Times New Roman',serif"}}>{detail?.code}</span>
                        </div>
                        <Button onClick={hClose} disabled={closeC.isPending} variant="outline" className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 rounded-xl h-9 px-3 text-xs sm:text-sm">
                          {closeC.isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
                          <span>CHIUDI</span>
                        </Button>
                        <Button onClick={()=>hDel(selId!)} disabled={del.isPending} variant="outline" className="border-red-400 text-red-700 hover:bg-red-50 hover:border-red-500 rounded-xl h-9 px-3 text-xs sm:text-sm">
                          {del.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                          <span>ELIMINA CLASSE</span>
                        </Button>
                      </div>
                      {/* Riga 3: statistiche + pulsanti PDF */}
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-wrap items-center justify-center gap-2">

                          <div className="flex flex-col rounded-lg bg-card border border-emerald-300 px-3 py-2">
                            <span className="text-[10px] leading-tight text-emerald-600">NUMERO STUDENTI ATTIVI<br/>NELLA SESSIONE IN CORSO</span>
                            <span className="font-bold text-sm text-emerald-700 text-center w-full">{(students||[]).length}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <Button onClick={hReport} disabled={!report} variant="outline" className="border-plum/40 text-plum hover:bg-plum/5 hover:border-plum/60 rounded-xl h-9 px-3 text-xs sm:text-sm">
                            <FileText className="size-4" /> REPORT PDF
                          </Button>
                          <Button onClick={hBlank} variant="outline" className="border-emerald-400 text-emerald-700 hover:bg-emerald-50 hover:border-emerald-500 rounded-xl h-9 px-3 text-xs sm:text-sm">
                            <FileText className="size-4" /> QUESTIONARIO PDF
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* ═══ STUDENTI ATTIVI ═══ */}
                  <Card className="bg-card border border-border/60 shadow-sm mt-8">
                    <CardContent className="p-4 sm:p-8">
                      <div className="flex items-center gap-3 mb-3">
                        <Users className="size-6 text-plum" />
                        <h3 className="text-xl font-bold text-foreground tracking-wide">STUDENTI ATTIVI NELLA SESSIONE</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mb-6 leading-relaxed text-center">
                        Tutti gli studenti iscritti restano visibili.
                      </p>
                      {!students ? (
                        <div className="flex items-center justify-center py-12 text-muted-foreground">
                          <Loader2 className="size-5 animate-spin mr-2" /><span className="text-sm">Caricamento studenti...</span>
                        </div>
                      ) : students.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-muted/50 border border-dashed border-border/50">
                          <p className="text-muted-foreground text-sm text-center">NESSUNO STUDENTE ANCORA PRESENTE.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {students.map((s: any) => {
                            const sStats = (stats||[]).find((ss:any) => ss.studentId === s.id);
                            const studentAnswers = sStats?.answers || [];
                            const correctCount = sStats?.correct || 0;
                            const isExpanded = expandedStudent === s.id;
                            const hasAnswers = studentAnswers.length > 0;
                            // Per-MAPA status: MAPA 1 = q 1-5, MAPA 2 = q 6-8
                            const mapa1Answers = studentAnswers.filter((a:any) => a.questionNumber >= 1 && a.questionNumber <= 5);
                            const mapa2Answers = studentAnswers.filter((a:any) => a.questionNumber >= 6 && a.questionNumber <= 8);
                            const mapa1Done = mapa1Answers.length >= 5;
                            const mapa2Done = mapa2Answers.length >= 3;
                            return (
                              <div key={s.id} className="rounded-xl border border-border/50 bg-muted/10">
                                <button
                                  onClick={() => setExpandedStudent(isExpanded ? null : s.id)}
                                  className={`w-full flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 hover:bg-muted/30 transition-colors text-left ${isExpanded && hasAnswers ? 'rounded-t-xl' : 'rounded-xl'}`}
                                >
                                  <div className="size-2.5 rounded-full shrink-0 bg-gray-300"></div>
                                  <div className="flex-1 min-w-0">
                                    <span
                                      className="group relative block min-w-0 font-semibold text-sm text-foreground text-left cursor-pointer"
                                      onClick={(e: any) => {
                                        if (window.matchMedia('(hover: none)').matches) {
                                          e.stopPropagation();
                                          setTooltipStudent(tooltipStudent === s.id ? null : s.id);
                                        }
                                      }}
                                    >
                                      <span className="block truncate uppercase">{s.name}</span>
                                      <span className={`pointer-events-none absolute left-1/2 bottom-full z-[100] mb-2 -translate-x-1/2 max-w-[85vw] rounded-md bg-black px-3 py-1.5 text-xs text-white uppercase shadow-lg transition-opacity duration-150 ${tooltipStudent === s.id ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-active:opacity-100 group-focus:opacity-100"}`}>
                                        {s.name}
                                      </span>
                                    </span>
                                  </div>
                                  <div className={`text-[10px] sm:text-xs font-bold shrink-0 text-center leading-tight max-w-[70px] ${hasAnswers ? scoreColor(correctCount) : 'text-orange-500'}`}>
                                    {hasAnswers ? correctCount + '/10' : 'IN ATTESA DI INVIO'}
                                  </div>
                                  <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                                    {[{ label: 'MAPA 1', submitted: mapa1Done, count: mapa1Answers.length, total: 5, color: '#047857' }, { label: 'MAPA 2', submitted: mapa2Done, count: mapa2Answers.length, total: 3, color: '#1d4ed8' }].map((ms, i) => (
                                      <Tooltip key={i}>
                                        <TooltipTrigger asChild>
                                          <div className={`size-2.5 rounded-full cursor-default ${ms.submitted ? '' : 'border-2'}`} style={ms.submitted ? { backgroundColor: ms.color } : { borderColor: ms.color, backgroundColor: 'transparent' }}></div>
                                        </TooltipTrigger>
                                        <TooltipContent side="top" className="px-3 py-1.5">
                                          <p className="text-[10px] font-bold uppercase">{ms.label}: {ms.submitted ? ms.count + '/' + ms.total + ' inviate' : 'IN ATTESA DI INVIO'}</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    ))}
                                  </div>
                                  <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); rmStudent.mutate({ id: s.id }); }} disabled={rmStudent.isPending} className="text-red-500 hover:text-red-700 hover:bg-red-100 px-1.5 h-7 rounded-full" title="Rimuovi studente">
                                      <XCircle className="size-4" />
                                    </Button>
                                    {hasAnswers && (
                                      <div className="text-muted-foreground">
                                        {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                                      </div>
                                    )}
                                  </div>
                                </button>
                                {isExpanded && (
                                  <div className="border-t border-border/40 bg-muted/15 p-4 space-y-4 rounded-b-xl">
                                    {/* ── MAPA 1 ── */}
                                    {mapa1Answers.length > 0 && (
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: '#047857' }}>MAPA 1</p>
                                        {mapa1Answers.sort((a:any,b:any) => a.questionNumber - b.questionNumber).map((answer:any) => (
                                          <div key={answer.questionNumber} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/70 border border-border/30">
                                            <span className="text-muted-foreground font-mono text-[11px] w-5 shrink-0 leading-4">#</span>
                                            {answer.isCorrect ? (
                                              <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                                            ) : (
                                              <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                              <span className={`block text-xs font-medium break-words ${answer.isCorrect ? 'text-green-700' : 'text-red-600'}`} title={answer.selectedAnswer}>
                                                {answer.selectedAnswer || '—'}
                                              </span>
                                              {!answer.isCorrect && answer.correctAnswer && (
                                                <span className="block text-xs font-medium text-green-700 break-words" title={answer.correctAnswer}>
                                                  <span className="text-muted-foreground mr-1">→</span>{answer.correctAnswer}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {/* ── MAPA 2 ── */}
                                    {mapa2Answers.length > 0 && (
                                      <div className="space-y-1.5">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-center" style={{ color: '#1d4ed8' }}>MAPA 2</p>
                                        {mapa2Answers.sort((a:any,b:any) => a.questionNumber - b.questionNumber).map((answer:any) => (
                                          <div key={answer.questionNumber} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-white/70 border border-border/30">
                                            <span className="text-muted-foreground font-mono text-[11px] w-5 shrink-0 leading-4">#</span>
                                            {answer.isCorrect ? (
                                              <CheckCircle2 className="size-4 text-green-600 shrink-0 mt-0.5" />
                                            ) : (
                                              <XCircle className="size-4 text-red-500 shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0 space-y-0.5">
                                              <span className={`block text-xs font-medium break-words ${answer.isCorrect ? 'text-green-700' : 'text-red-600'}`} title={answer.selectedAnswer}>
                                                {answer.selectedAnswer || '—'}
                                              </span>
                                              {!answer.isCorrect && answer.correctAnswer && (
                                                <span className="block text-xs font-medium text-green-700 break-words" title={answer.correctAnswer}>
                                                  <span className="text-muted-foreground mr-1">→</span>{answer.correctAnswer}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {/* Student count summary */}
                      {students && students.length > 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-5 mt-5 border-t border-border/40">
                          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                            <Users className="size-3.5 text-plum" /> {students!.length} attivi
                          </span>
                        </div>
                      )}


                    </CardContent>
                  </Card>

                  {/* ═══ MAPA QUIZ PANELS ═══ */}
                  {q1.length>0 && q2.length>0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
                        <GroupPanel group={1} classId={selId} questions={q1}/>
                      </div>
                      <div className="bg-card rounded-2xl border border-border/60 shadow-sm p-4">
                        <GroupPanel group={2} classId={selId} questions={q2}/>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-muted-foreground"/></div>
                  )}


                </div>
              )}
            </div>
          </main>
        </div>

      </div>
    </div>
  );
}
