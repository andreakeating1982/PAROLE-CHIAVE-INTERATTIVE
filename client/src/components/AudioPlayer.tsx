import { useRef, useState, useEffect, useCallback } from "react";
import { Play, Pause, SkipBack, SkipForward, Volume2, ChevronDown, ChevronUp } from "lucide-react";
import type { AudioTrack, AudioSegment } from "@/lib/audioData";

interface Props {
  track: AudioTrack;
  /** Indice del segmento attivo (evidenziato) — di solito la domanda corrente */
  activeSegment?: number;
  /** Se true, il player è in modalità compatta (solo riproduzione senza segmenti) */
  compact?: boolean;
  className?: string;
}

export default function AudioPlayer({ track, activeSegment = 0, compact = false, className = "" }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [seekSegment, setSeekSegment] = useState<number | null>(null);

  // Ref sempre aggiornato con l'activeSegment corrente (evita stale closure in togglePlay)
  const activeSegmentRef = useRef(activeSegment);
  useEffect(() => { activeSegmentRef.current = activeSegment; }, [activeSegment]);

  // KEY FIX: Tiene traccia di QUALE segmento è stato avviato (togglePlay / skip)
  // Così l'auto-stop controlla il endTime del segmento giusto, non quello calcolato da currentTime
  const playingSegmentRef = useRef(activeSegment);

  // Quando activeSegment cambia e l'audio è in pausa, posiziona sul segmento corretto
  useEffect(() => {
    if (playing || !audioRef.current) return;
    const seg = track.segments[activeSegment];
    if (seg) {
      audioRef.current.currentTime = seg.startTime;
      setCurrentTime(seg.startTime);
    }
  }, [activeSegment, track.segments, playing]);

  // Trova il segmento corrente in base al tempo
  const currentSegmentIdx = (() => {
    for (let i = track.segments.length - 1; i >= 0; i--) {
      if (currentTime >= track.segments[i].startTime) return i;
    }
    return 0;
  })();

  // Gestisce il seek via segmento
  useEffect(() => {
    if (seekSegment === null || !audioRef.current) return;
    const seg = track.segments[seekSegment];
    if (seg) {
      playingSegmentRef.current = seekSegment;
      audioRef.current.currentTime = seg.startTime;
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
    setSeekSegment(null);
  }, [seekSegment, track.segments]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      // Usa il ref per avere sempre l'activeSegment più aggiornato
      const segIdx = activeSegmentRef.current;
      playingSegmentRef.current = segIdx;
      const seg = track.segments[segIdx] || track.segments[0];
      audioRef.current.currentTime = seg.startTime;
      audioRef.current.play().catch(() => {});
      setPlaying(true);
    }
  }, [playing, track.segments]);

  const jumpToSegment = useCallback((idx: number) => {
    setSeekSegment(idx);
  }, []);

  const prevSegment = useCallback(() => {
    const prev = Math.max(0, currentSegmentIdx - 1);
    jumpToSegment(prev);
  }, [currentSegmentIdx, jumpToSegment]);

  const nextSegment = useCallback(() => {
    const next = Math.min(track.segments.length - 1, currentSegmentIdx + 1);
    jumpToSegment(next);
  }, [currentSegmentIdx, jumpToSegment, track.segments.length]);

  // Rif per i segmenti, sempre aggiornato (evita stale closure nel listener nativo)
  const segmentsRef = useRef(track.segments);
  useEffect(() => { segmentsRef.current = track.segments; }, [track.segments]);

  // Margine (secondi) per l'auto-stop: ferma leggermente prima del confine configurato
  // per compensare la latenza del loop RAF (~16ms) evitando che filtri audio del segmento successivo
  const AUTO_STOP_MARGIN = 0;

  // AUTO-STOP con requestAnimationFrame: loop leggero (~16ms) che NON triggera re-render
  // La barra progresso è aggiornata via onTimeUpdate, non qui dentro
  useEffect(() => {
    let rafId: number;

    const check = () => {
      const audio = audioRef.current;
      if (!audio) {
        rafId = requestAnimationFrame(check);
        return;
      }

      if (!audio.paused) {
        const ct = audio.currentTime;

        const playIdx = playingSegmentRef.current;
        const segs = segmentsRef.current;
        const endTime = segs[playIdx]?.endTime;
        if (endTime !== undefined && ct >= endTime - AUTO_STOP_MARGIN) {
          audio.pause();
          // Ferma esattamente al confine configurato (non dove il RAF l'ha catturato)
          audio.currentTime = endTime;
          setCurrentTime(endTime);
          setPlaying(false);
        }
      }

      rafId = requestAnimationFrame(check);
    };

    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, []);

  // Aggiorna la barra progresso via timeupdate (naturale, ~4 eventi/sec, nessun carico React)
  const onTimeUpdate = useCallback(() => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  }, []);

  const onLoaded = useCallback(() => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  }, []);

  const onEnded = useCallback(() => {
    setPlaying(false);
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={`rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm ${className}`}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <audio
        ref={audioRef}
        src={track.src}
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoaded}
        onEnded={onEnded}
      />

      {/* Barra principale */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* Play/Pause — sempre nero, non cambia mai */}
        <button
          onClick={togglePlay}
          className="size-9 rounded-full bg-foreground text-primary-foreground flex items-center justify-center hover:bg-foreground/80 transition-colors shrink-0"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4 ml-0.5" />}
        </button>

        {/* Info traccia */}
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-foreground truncate leading-tight">
            {track.title}
          </p>
          <p className="text-[10px] text-muted-foreground truncate leading-tight">
            {track.segments[currentSegmentIdx]?.title || ""} · {formatTime(currentTime)} / {formatTime(duration)}
          </p>
          {/* Barra progresso */}
          <div className="mt-1 h-1 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground/60 transition-all duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Segment nav — nascosto in modalità compatta */}
        {!compact && (
          <div className="flex items-center gap-0.5 shrink-0">
            <button onClick={prevSegment} disabled={currentSegmentIdx <= 0}
              className="size-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
              <SkipBack className="size-3.5" />
            </button>
            <button onClick={nextSegment} disabled={currentSegmentIdx >= track.segments.length - 1}
              className="size-7 flex items-center justify-center rounded-md hover:bg-muted disabled:opacity-30 transition-colors">
              <SkipForward className="size-3.5" />
            </button>
            <button onClick={() => setExpanded(!expanded)}
              className="size-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors">
              {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Lista segmenti (espansa) — nascosta in modalità compatta */}
      {!compact && expanded && (
        <div className="border-t border-border/40 px-1 py-1 max-h-48 overflow-y-auto">
          {track.segments.map((seg: AudioSegment, idx: number) => {
            const isCurrent = idx === currentSegmentIdx;
            const isActive = idx === activeSegment;
            return (
              <button
                key={seg.id}
                onClick={() => jumpToSegment(idx)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors text-xs
                  ${isCurrent ? "bg-foreground/8" : "hover:bg-muted/50"}
                  ${isActive && !isCurrent ? "border-l-2 border-foreground/30" : "border-l-2 border-transparent"}
                `}
              >
                <span className={`size-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0
                  ${isCurrent ? "bg-foreground text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  {idx + 1}
                </span>
                <span className="flex-1 truncate font-medium">{seg.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {formatTime(seg.startTime)}–{formatTime(seg.endTime)}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
