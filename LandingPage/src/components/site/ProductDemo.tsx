import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Mic, RotateCcw, X } from "lucide-react";
import { Waveform } from "./Waveform";
import { SAMPLE_DURATION, SAMPLE_SUGGESTIONS, SAMPLE_TRANSCRIPT } from "@/lib/content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

type Stage = "idle" | "recording" | "transcribing" | "review";
type Decision = "pending" | "approved" | "rejected";

const ALL_WORDS = SAMPLE_TRANSCRIPT.flatMap((s) =>
  s.text.split(/(\s+)/).filter(Boolean).map((w) => ({ w, taskId: s.taskId })),
);

const fmt = (s: number) => `0:${String(Math.floor(s)).padStart(2, "0")}`;

export function ProductDemo({ autoPlay = true, className }: { autoPlay?: boolean; className?: string }) {
  const [stage, setStage] = useState<Stage>("idle");
  const [secs, setSecs] = useState(0);
  const [words, setWords] = useState(0);
  const [tab, setTab] = useState<"transcript" | "tasks">("transcript");
  const [hover, setHover] = useState<number | null>(null);
  const [decisions, setDecisions] = useState<Record<number, Decision>>({});
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearInterval(t));
    timers.current = [];
  };

  const play = useCallback(() => {
    clear();
    setDecisions({});
    setTitles({});
    setEditing(null);
    setTab("transcript");
    setWords(0);
    setSecs(0);
    setStage("recording");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setSecs(SAMPLE_DURATION);
      setWords(ALL_WORDS.length);
      setStage("review");
      return;
    }
    let s = 0;
    const rec = window.setInterval(() => {
      s += 1;
      setSecs(s);
      if (s >= SAMPLE_DURATION) {
        window.clearInterval(rec);
        setStage("transcribing");
        let w = 0;
        const tx = window.setInterval(() => {
          w += 1;
          setWords(w);
          if (w >= ALL_WORDS.length) {
            window.clearInterval(tx);
            const t = window.setTimeout(() => setStage("review"), 450);
            timers.current.push(t);
          }
        }, 55);
        timers.current.push(tx);
      }
    }, 140);
    timers.current.push(rec);
  }, []);

  useEffect(() => {
    if (!autoPlay) return () => clear();
    const t = window.setTimeout(play, 900);
    return () => {
      window.clearTimeout(t);
      clear();
    };
  }, [autoPlay, play]);

  const approved = SAMPLE_SUGGESTIONS.filter((s) => decisions[s.id] === "approved");
  const decide = (id: number, d: Decision) => setDecisions((p) => ({ ...p, [id]: d }));

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-[1.6rem] border border-border bg-card text-card-foreground shadow-lift",
        className,
      )}
    >
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-border px-4 sm:px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              stage === "recording" ? "animate-pulse bg-destructive" : stage === "review" ? "bg-lime ring-1 ring-foreground/30" : "bg-foreground/25",
            )}
          />
          <span className="eyebrow min-w-0 truncate text-muted-foreground" role="status">
            {stage === "idle" && "Ready"}
            {stage === "recording" && "Recording"}
            {stage === "transcribing" && "Transcribing"}
            {stage === "review" && "Note · Today 08:42"}
          </span>
        </div>
        <Button
          onClick={play}
          variant="quiet" size="sm" className="eyebrow rounded-full"
        >
          {stage === "idle" ? <Mic className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
          {stage === "idle" ? "Play capture" : "Replay"}
        </Button>
      </div>

      {/* Recording strip */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 pt-4 sm:px-5">
        <div
          className={cn(
            "grid h-11 w-11 shrink-0 place-items-center rounded-full transition-colors duration-500",
            stage === "recording" ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground",
          )}
        >
          <Mic className="h-4.5 w-4.5" />
        </div>
        <Waveform live={stage === "recording"} progress={secs / SAMPLE_DURATION} className="h-9" />
        <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">{fmt(secs)}</span>
      </div>

      {/* Tabs */}
      <div className="mt-5 flex gap-1 px-5" role="tablist">
        {(["transcript", "tasks"] as const).map((t) => (
          <Button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            variant="ghost" size="sm" className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
            {t === "tasks" && (
              <span className={cn("ml-1.5 tabular-nums", approved.length && tab !== t && "text-primary")}>
                {approved.length}
              </span>
            )}
          </Button>
        ))}
      </div>

      <div className="min-h-64 px-4 sm:min-h-[19rem] sm:px-5 pb-5 pt-4">
        {tab === "transcript" ? (
          <>
            <p className="min-h-[5.5rem] font-display text-[1.2rem] leading-snug tracking-[-0.02em] sm:text-[1.35rem]">
              {stage === "idle" || stage === "recording" ? (
                <span className="text-muted-foreground/60">
                  {stage === "idle" ? "Press play to capture a sample thought…" : "Listening…"}
                </span>
              ) : (
                <>
                  <span className="text-muted-foreground">“</span>
                  {ALL_WORDS.slice(0, words).map((x, i) => (
                    <span
                      key={i}
                      className={cn(
                        "transition-colors duration-500",
                        stage === "review" && x.taskId && "bg-lavender/70",
                        stage === "review" && x.taskId && hover === x.taskId && "bg-lime",
                        stage === "review" && x.taskId && decisions[x.taskId] === "rejected" && "bg-transparent text-muted-foreground line-through",
                      )}
                    >
                      {x.w}
                    </span>
                  ))}
                  {stage === "transcribing" && <span className="animate-blink text-primary">▍</span>}
                  {stage === "review" && <span className="text-muted-foreground">”</span>}
                </>
              )}
            </p>

            <div className="mt-5 grid gap-2 sm:flex sm:items-center sm:justify-between">
              <span className="eyebrow text-muted-foreground">Suggested · pending your review</span>
              {stage === "transcribing" && (
                <span className="eyebrow flex items-center gap-1.5 text-primary">
                  <span className="h-1.5 w-1.5 animate-ping rounded-full bg-primary" /> Finding next steps
                </span>
              )}
            </div>
            <ul className="mt-3 space-y-2">
              <AnimatePresence>
                {stage === "review" &&
                  SAMPLE_SUGGESTIONS.map((s, i) => {
                    const d = decisions[s.id] ?? "pending";
                    return (
                      <motion.li
                        key={s.id}
                        layout
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: d === "rejected" ? 0.45 : 1, y: 0 }}
                        transition={{ delay: i * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                        onMouseEnter={() => setHover(s.id)}
                        onMouseLeave={() => setHover(null)}
                        className={cn(
                          "grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-lg border px-3 py-3 sm:flex sm:items-center transition-colors",
                          d === "approved" ? "border-foreground bg-foreground text-background" : "border-dashed border-foreground/25",
                        )}
                      >
                        <span
                          className={cn(
                            "grid h-5 w-5 shrink-0 place-items-center rounded-full border",
                            d === "approved" ? "border-lime bg-lime text-ink" : "border-foreground/30",
                          )}
                        >
                          {d === "approved" && <Check className="h-3 w-3" strokeWidth={3} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          {editing === s.id ? (
                            <input autoFocus aria-label={`Edit ${s.title}`} value={titles[s.id] ?? s.title} onChange={(e) => setTitles((prev) => ({ ...prev, [s.id]: e.target.value }))} onKeyDown={(e) => { if (e.key === "Enter") setEditing(null); if (e.key === "Escape") setEditing(null); }} onBlur={() => setEditing(null)} className="w-full min-w-0 border-b border-primary bg-transparent py-2 text-base font-medium outline-none" />
                          ) : <p className={cn("break-words text-base font-medium sm:text-sm", d === "rejected" && "line-through")}>{titles[s.id]?.trim() || s.title}</p>}
                          <p className={cn("text-xs", d === "approved" ? "text-background/60" : "text-muted-foreground")}>
                            {s.kind}
                            {s.due && ` · ${s.due}`}
                          </p>
                        </div>
                        {d === "pending" ? (
                          <div className="col-start-2 flex gap-2 sm:shrink-0">
                            <Button
                              aria-label={`Dismiss ${s.title}`}
                              onClick={() => decide(s.id, "rejected")}
                              variant="ghost" size="icon" className="h-11 w-11 rounded-full sm:h-8 sm:w-8 text-muted-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button aria-label={`Edit ${s.title}`} onClick={() => setEditing(s.id)} variant="ghost" size="icon" className="h-11 w-11 rounded-full sm:h-8 sm:w-8 text-muted-foreground"><Pencil className="h-4 w-4" /></Button>
                            <Button
                              onClick={() => decide(s.id, "approved")}
                              variant="cta" size="sm" className="h-11 rounded-full px-4 text-sm sm:h-8 sm:px-3 sm:text-xs"
                            >
                              Approve
                            </Button>
                          </div>
                        ) : (
                          <Button
                            onClick={() => decide(s.id, "pending")}
                            variant="ghost" size="sm" className={cn("eyebrow col-start-2 justify-self-start", d === "approved" ? "text-background/60" : "text-muted-foreground")}
                          >
                            Undo
                          </Button>
                        )}
                      </motion.li>
                    );
                  })}
              </AnimatePresence>
            </ul>
          </>
        ) : (
          <div>
            <p className="eyebrow text-muted-foreground">Your tasks</p>
            {approved.length === 0 ? (
              <div className="mt-6 rounded-xl border border-dashed border-foreground/25 p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Nothing here yet. Approve a suggestion and it becomes a task.
                </p>
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-border">
                {approved.map((s) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-start gap-3 py-3"
                  >
                    <span className="mt-0.5 h-4 w-4 shrink-0 rounded-[5px] border-2 border-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{titles[s.id]?.trim() || s.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">From voice note · 0:14</p>
                    </div>
                    {s.due && <span className="shrink-0 rounded-full bg-lime px-2 py-0.5 text-[11px] font-medium text-ink">{s.due}</span>}
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
