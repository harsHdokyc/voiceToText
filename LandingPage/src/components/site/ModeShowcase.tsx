import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Mic, Undo2, X } from "lucide-react";
import { EASE } from "./Reveal";
import { PINNED_PANEL, StepSpacer, useScrollSteps } from "./ScrollSteps";
import { SAMPLE_DURATION, SAMPLE_SUGGESTIONS, SAMPLE_TRANSCRIPT } from "@/lib/content";
import { useSuggestionDecisions, type Decision, type Decisions } from "@/lib/suggestion-decisions";
import { cn } from "@/lib/utils";

const MODES = [
  { name: "Capture", status: "Listening", title: "Less typing. More thinking.", copy: "Start naturally. A quick note or a whole train of thought — there’s no form to fill before your idea exists." },
  { name: "Clarity", status: "Reading", title: "Find the thread in the thought.", copy: "A readable transcript keeps the context. Suggested actions bring the useful parts into focus." },
  { name: "Control", status: "Your call", title: "Your work. Your call.", copy: "Approve, rewrite, or leave it behind. A suggestion only becomes a task when you choose it." },
];

const WORDS = SAMPLE_TRANSCRIPT.map((s) => s.text).join("").split(" ");
export function ModeShowcase() {
  const { sectionRef, stickyRef, step, scrollToStep } = useScrollSteps(MODES.length);
  const { decisions, decide, undo } = useSuggestionDecisions();
  const mode = MODES[step];

  return (
    <section ref={sectionRef} className="surface-ink overflow-x-clip">
      <div ref={stickyRef} className={PINNED_PANEL}>
        <div className="container-site w-full py-6 md:py-10">
          <div className="flex items-center justify-between gap-4 border-b border-paper/10 pb-5">
            <span className="eyebrow text-lime">One thought. More possibilities.</span>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">0{step + 1} / 0{MODES.length}</span>
          </div>

          <div className="mt-8 grid gap-8 lg:mt-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-center lg:gap-16">
            <div className="min-w-0">
              <div className="grid grid-cols-3 gap-1.5 lg:flex lg:flex-col lg:gap-0">
                {MODES.map((m, i) => (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => scrollToStep(i)}
                    aria-pressed={step === i}
                    className={cn(
                      "relative flex min-h-11 items-center justify-center gap-3 rounded-full px-3 text-sm font-medium transition-colors duration-300 lg:justify-start lg:rounded-none lg:border-b lg:border-paper/10 lg:px-0 lg:py-3 lg:font-display lg:text-2xl",
                      step === i ? "bg-lime text-ink lg:bg-transparent lg:text-paper" : "text-paper/45 hover:text-paper",
                    )}
                  >
                    <span className={cn("hidden font-mono text-xs lg:inline", step === i ? "text-lime" : "text-paper/30")}>0{i + 1}</span>
                    {m.name}
                    {step === i && (
                      <motion.span
                        layoutId="mode-marker"
                        aria-hidden
                        className="ml-auto hidden h-2.5 w-2.5 rounded-full bg-lime lg:block"
                      />
                    )}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="mt-7 lg:mt-10"
                >
                  <h2 className="max-w-md font-display text-3xl font-medium leading-[1.05] md:text-5xl">{mode.title}</h2>
                  <p className="mt-4 max-w-sm leading-relaxed text-muted-foreground">{mode.copy}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="stage-frame min-w-0">
              <div className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-[calc(1.75rem-1px)] bg-card p-5 md:min-h-[26rem] md:p-7">
                <div className="flex items-center justify-between gap-3 border-b border-paper/10 pb-4">
                  <span className="eyebrow text-muted-foreground">Voice note / 01</span>
                  <span className="eyebrow flex items-center gap-2 rounded-full border border-paper/15 px-3 py-1 text-paper">
                    <span className={cn("h-1.5 w-1.5 rounded-full", step === 0 ? "animate-pulse bg-destructive" : "bg-lime")} />
                    {mode.status}
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-center py-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.98 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    >
                      {step === 0 && <CaptureScene />}
                      {step === 1 && <ClarityScene />}
                      {step === 2 && (
                        <ControlScene decisions={decisions} decide={decide} undo={undo} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <p className="border-t border-paper/10 pt-4 font-mono text-[11px] text-muted-foreground">A sample note · nothing is recorded</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <StepSpacer steps={MODES.length} />
    </section>
  );
}

function CaptureScene() {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? WORDS.length : 0);

  useEffect(() => {
    if (reduced) return;
    // Extra ticks past the last word hold the full sentence before looping.
    const id = window.setInterval(() => setShown((n) => (n >= WORDS.length + 10 ? 0 : n + 1)), 170);
    return () => window.clearInterval(id);
  }, [reduced]);

  const visible = Math.min(shown, WORDS.length);
  const secs = Math.round((visible / WORDS.length) * SAMPLE_DURATION);

  return (
    <div>
      <div className="flex items-center gap-5">
        <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground md:h-20 md:w-20">
          {!reduced &&
            [0, 1, 2].map((i) => (
              <motion.span
                key={i}
                aria-hidden
                className="absolute inset-0 rounded-full border border-primary"
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
              />
            ))}
          <Mic className="relative h-6 w-6" />
        </span>
        <div className="flex h-14 min-w-0 flex-1 items-center gap-[3px]" aria-hidden>
          {Array.from({ length: 36 }, (_, i) => (
            <motion.span
              key={i}
              className="h-full min-w-0 flex-1 rounded-full bg-lime"
              initial={{ scaleY: 0.2 }}
              animate={{ scaleY: reduced ? 0.3 : [0.15 + (i % 5) / 9, 0.35 + (i % 7) / 9, 0.15 + (i % 5) / 9] }}
              transition={{ duration: 1.2, repeat: reduced ? 0 : Infinity, delay: (i % 9) * 0.07 }}
            />
          ))}
        </div>
        <span className="shrink-0 font-mono text-sm tabular-nums text-paper">0:{String(secs).padStart(2, "0")}</span>
      </div>
      <p className="mt-8 min-h-[6.5rem] font-display text-xl leading-snug text-paper md:text-2xl">
        {WORDS.slice(0, visible).join(" ")}
        <span className="animate-blink text-lime">▍</span>
      </p>
    </div>
  );
}

function ClarityScene() {
  let mark = 0;
  return (
    <div>
      <p className="font-display text-xl leading-relaxed text-paper/80 md:text-2xl">
        “
        {SAMPLE_TRANSCRIPT.map((part, i) => {
          if (!part.taskId) return <span key={i}>{part.text}</span>;
          const delay = 0.3 + mark++ * 0.45;
          return (
            <motion.span
              key={i}
              className="box-decoration-clone bg-[linear-gradient(var(--lime),var(--lime))] bg-left bg-no-repeat px-0.5"
              initial={{ backgroundSize: "0% 100%", color: "var(--paper)" }}
              animate={{ backgroundSize: "100% 100%", color: "var(--ink)" }}
              transition={{ duration: 0.6, delay, ease: EASE }}
            >
              {part.text}
            </motion.span>
          );
        })}
        ”
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        {SAMPLE_SUGGESTIONS.map((s, i) => (
          <motion.span
            key={s.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 1.7 + i * 0.15, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-lime/40 bg-lime/10 px-3 py-1.5 text-xs text-paper"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            {s.kind}
            {s.due && <span className="text-muted-foreground">· {s.due}</span>}
          </motion.span>
        ))}
      </div>
    </div>
  );
}

function ControlScene({
  decisions,
  decide,
  undo,
}: {
  decisions: Decisions;
  decide: (id: number, d: Decision) => void;
  undo: (id: number) => void;
}) {
  const kept = SAMPLE_SUGGESTIONS.filter((s) => decisions[s.id] === "approved").length;
  return (
    <div>
      <ul className="space-y-2">
        {SAMPLE_SUGGESTIONS.map((s, i) => {
          const d = decisions[s.id];
          return (
            <motion.li
              key={s.id}
              layout
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: d === "dismissed" ? 0.4 : 1, x: 0 }}
              transition={{ duration: 0.45, delay: i * 0.08, ease: EASE }}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-300",
                d === "approved" ? "border-lime bg-lime text-ink" : "border-paper/12 bg-paper/[0.03]",
              )}
            >
              <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full border", d === "approved" ? "border-ink bg-ink text-lime" : "border-dashed border-paper/30")}>
                {d === "approved" && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={cn("truncate text-sm font-medium", d === "dismissed" && "line-through")}>{s.title}</p>
                <p className={cn("text-xs", d === "approved" ? "text-ink/60" : "text-muted-foreground")}>{s.kind}{s.due && ` · ${s.due}`}</p>
              </div>
              {d ? (
                <button type="button" onClick={() => undo(s.id)} aria-label={`Undo ${s.title}`} className="grid h-11 w-11 shrink-0 place-items-center rounded-full sm:h-9 sm:w-9">
                  <Undo2 className="h-4 w-4" />
                </button>
              ) : (
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => decide(s.id, "dismissed")} aria-label={`Dismiss ${s.title}`} className="grid h-11 w-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-paper/10 hover:text-paper sm:h-9 sm:w-9">
                    <X className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => decide(s.id, "approved")} className="h-11 rounded-full bg-lime px-4 text-xs font-medium text-ink transition-transform hover:-translate-y-0.5 sm:h-9">
                    Approve
                  </button>
                </div>
              )}
            </motion.li>
          );
        })}
      </ul>
      <p className="mt-5 flex items-center gap-2 font-mono text-xs text-muted-foreground">
        <span className="tabular-nums text-lime">{kept} / {SAMPLE_SUGGESTIONS.length}</span> kept · nothing becomes a task without you
      </p>
    </div>
  );
}
