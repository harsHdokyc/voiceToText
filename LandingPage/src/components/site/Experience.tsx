import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Check, Mic, Pencil, RotateCcw, Sparkles, X } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LineReveal, Reveal, SectionLabel } from "./Reveal";
import { ModeShowcase } from "./ModeShowcase";
import { PINNED_PANEL, StepSpacer, useScrollSteps } from "./ScrollSteps";
import { SAMPLE_SUGGESTIONS, SAMPLE_TRANSCRIPT } from "@/lib/content";
import { cn } from "@/lib/utils";

export function VoiceRibbon({ live = true }: { live?: boolean }) {
  const reduced = useReducedMotion();
  return <div aria-hidden className="flex h-16 w-full min-w-0 items-center justify-center gap-1 overflow-hidden md:h-24 md:gap-1.5">{Array.from({ length: 52 }, (_, i) => <motion.span key={i} className="h-14 min-w-0 flex-1 md:h-20 rounded-full bg-current" initial={{ scaleY: 0.2 }} animate={{ scaleY: live && !reduced ? [0.15 + (i % 5) / 10, 0.4 + (i % 7) / 12, 0.15 + (i % 5) / 10] : 0.2 }} transition={{ duration: 1.4, repeat: live && !reduced ? Infinity : 0, delay: i * 0.04 }} />)}</div>;
}

export function ProductExperience() {
  return <>
    <section className="container-site pt-8 pb-10 md:pt-20">
      <SectionLabel>Saydo / the product</SectionLabel>
      <LineReveal as="h1" className="mt-6 max-w-5xl text-[2.5rem] font-medium leading-[1.03] md:text-7xl lg:text-8xl" lines={["A home for your", <span>out-loud <span className="italic text-primary">thinking.</span></span>]} />
      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"><p className="max-w-lg text-lg leading-relaxed text-muted-foreground">The messy thought. The useful part. The next thing to do. All connected, without taking the decisions away from you.</p><Button asChild variant="ink" size="xl"><Link to="/early-access">Get early access <ArrowRight /></Link></Button></div>
    </section>
    <ModeShowcase />
    <section className="container-site py-16 md:py-24">
      <SectionLabel>Not another pile of notes</SectionLabel><LineReveal className="mt-7 text-4xl font-medium leading-tight md:text-6xl" lines={["Keep the context.", <span>Lose the <span className="italic text-primary">loose ends.</span></span>]} />
      <div className="mt-12 grid gap-4 md:grid-cols-3">{[{icon: Mic, title: "Voice, without the friction.", body: "Catch an idea before it disappears. Keep the original thought alongside what comes next.", tone: "bg-lavender"}, {icon: Sparkles, title: "Suggestions, not instructions.", body: "Tasks, follow-ups, ideas, and reminders — separated so you can make a clear decision.", tone: "bg-lime"}, {icon: Check, title: "A list you actually chose.", body: "Only approved actions make the cut. Every task leads back to the note it came from.", tone: "bg-muted"}].map((item, i) => <Reveal key={item.title} delay={i * 0.1} className={cn("group flex min-h-56 flex-col md:min-h-72 justify-between rounded-lg p-6 md:p-7 transition-transform duration-300 hover:-translate-y-2", item.tone)}><item.icon className="h-7 w-7" /><div><h3 className="mt-8 text-2xl font-medium">{item.title}</h3><p className="mt-4 leading-relaxed text-ink/70">{item.body}</p></div></Reveal>)}</div>
    </section>
  </>;
}

const journey = [
  { name: "Say it", title: "Start with the unfiltered version.", copy: "Walking home. Between meetings. Before you forget. Say the thought as it comes — sorting can wait.", label: "01 / Capture" },
  { name: "Read it", title: "Your words, with the useful parts in focus.", copy: "Read the transcript and check the context. The possible next steps are highlighted, not hidden behind a summary.", label: "02 / Understand" },
  { name: "Choose it", title: "This is where you take the wheel.", copy: "Keep a suggestion, change its wording, or dismiss it. Until you approve it, it’s only a possibility.", label: "03 / Review" },
  { name: "Do it", title: "A next step, not another loose end.", copy: "Approved actions become tasks. Each keeps a link to the original thought, so the why never gets lost.", label: "04 / Follow through" },
];

export function InteractiveJourney() {
  const tabsRef = useRef<HTMLDivElement>(null);
  const total = journey.length;
  const { sectionRef, stickyRef, step, scrollToStep } = useScrollSteps(total);
  const [kept, setKept] = useState<number[]>([]);
  const [dismissed, setDismissed] = useState<number[]>([]);
  const [edited, setEdited] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);
  const current = journey[step];

  useEffect(() => {
    const tabs = tabsRef.current;
    const active = tabs?.querySelector<HTMLElement>(`[data-step="${step}"]`);
    if (!tabs || !active) return;
    tabs.scrollTo({
      left: active.offsetLeft - (tabs.clientWidth - active.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [step]);

  return (
    <section
      ref={sectionRef}
      id="journey"
      className="bg-lavender"
    >
      <div ref={stickyRef} className={PINNED_PANEL}>
        <div className="container-site w-full py-6 md:py-10">
          <div
            ref={tabsRef}
            className="relative flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {journey.map((item, i) => (
              <Button
                key={item.name}
                data-step={i}
                type="button"
                onClick={() => scrollToStep(i)}
                variant="ghost"
                aria-pressed={step === i}
                className={cn(
                  "h-14 min-w-[10.5rem] shrink-0 justify-start gap-2 rounded-none border-t border-ink/20 px-3 text-base md:h-16 md:min-w-0 md:flex-1 md:gap-4",
                  step === i
                    ? "border-ink bg-ink text-paper hover:bg-ink hover:text-paper"
                    : "text-ink/60",
                )}
              >
                <span className="font-mono text-xs">0{i + 1}</span>
                {item.name}
                <ArrowRight className="ml-auto" />
              </Button>
            ))}
          </div>
          <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                <span className="eyebrow text-ink/60">{current?.label}</span>
                <h2 className="mt-4 text-3xl font-medium leading-tight md:text-5xl">
                  {current?.title}
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-ink/65 md:text-lg">
                  {current?.copy}
                </p>
                <div className="mt-5 flex gap-3">
                  <Button
                    variant="ink"
                    size="xl"
                    onClick={() =>
                      scrollToStep(step === total - 1 ? 0 : step + 1)
                    }
                  >
                    {step === total - 1 ? "Start again" : "Next moment"}
                    {step === total - 1 ? <RotateCcw /> : <ArrowRight />}
                  </Button>
                </div>
              </motion.div>
            </AnimatePresence>
            <div className="min-w-0 overflow-hidden rounded-lg border border-border bg-card p-4 shadow-card md:p-9">
              <div className="flex items-center justify-between border-b border-border pb-5">
                <span className="eyebrow text-muted-foreground">Voice note / 01</span>
                <span className="font-mono text-xs">0:14</span>
              </div>
              <div className="min-h-64 py-5 md:min-h-80">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    {step === 0 && (
                      <div className="py-7 text-center">
                        <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary text-primary-foreground">
                          <Mic className="h-6 w-6" />
                        </span>
                        <div className="mt-5 text-primary">
                          <VoiceRibbon />
                        </div>
                        <p className="mt-5 text-xl">
                          “Need to send the revised proposal…”
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Sample capture
                        </p>
                      </div>
                    )}
                    {step === 1 && (
                      <>
                        <p className="text-xl leading-relaxed md:text-2xl">
                          “
                          {SAMPLE_TRANSCRIPT.map((part, i) => (
                            <span
                              key={i}
                              className={part.taskId ? "bg-lime" : ""}
                            >
                              {part.text}
                            </span>
                          ))}
                          ”
                        </p>
                        <p className="mt-9 flex items-center gap-2 text-sm text-primary">
                          <Sparkles className="h-4 w-4" /> 3 possible next steps
                        </p>
                      </>
                    )}
                    {step === 2 && (
                      <div className="divide-y divide-border">
                        {SAMPLE_SUGGESTIONS.map((item) => (
                          <div key={item.id} className="py-4">
                            <div className="min-w-0">
                              {editing === item.id ? (
                                <input
                                  aria-label="Edit suggestion"
                                  className="input-field"
                                  autoFocus
                                  value={edited[item.id] ?? item.title}
                                  onChange={(e) =>
                                    setEdited({
                                      ...edited,
                                      [item.id]: e.target.value,
                                    })
                                  }
                                  onBlur={() => setEditing(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") setEditing(null);
                                  }}
                                />
                              ) : (
                                <p
                                  className={cn(
                                    "text-base font-medium",
                                    dismissed.includes(item.id) &&
                                      "text-muted-foreground line-through",
                                  )}
                                >
                                  {edited[item.id] ?? item.title}
                                </p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground">
                                {item.kind} · {item.due ?? "No date"}
                              </p>
                            </div>
                            <div className="mt-3 flex items-center gap-2">
                              <Button
                                variant={
                                  kept.includes(item.id) ? "secondary" : "cta"
                                }
                                size="sm"
                                onClick={() => {
                                  setKept([
                                    ...new Set([...kept, item.id]),
                                  ]);
                                  setDismissed(
                                    dismissed.filter((id) => id !== item.id),
                                  );
                                }}
                              >
                                <Check />
                                {kept.includes(item.id)
                                  ? "Approved"
                                  : "Approve"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Edit suggestion"
                                aria-label={`Edit ${item.title}`}
                                onClick={() => setEditing(item.id)}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                title="Dismiss suggestion"
                                aria-label={`Dismiss ${item.title}`}
                                onClick={() => {
                                  setDismissed([
                                    ...new Set([...dismissed, item.id]),
                                  ]);
                                  setKept(kept.filter((id) => id !== item.id));
                                }}
                              >
                                <X />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {step === 3 && (
                      <>
                        <span className="eyebrow text-primary">
                          Your next steps / {kept.length}
                        </span>
                        {kept.length ? (
                          SAMPLE_SUGGESTIONS.filter((item) =>
                            kept.includes(item.id),
                          ).map((item) => (
                            <div
                              key={item.id}
                              className="flex gap-4 border-b border-border py-6"
                            >
                              <Check className="h-5 w-5 shrink-0 text-primary" />
                              <div>
                                <p className="font-medium">
                                  {edited[item.id] ?? item.title}
                                </p>
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {item.due ?? "Anytime"} · From voice note 01
                                </p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-12">
                            <h3 className="text-2xl">
                              Nothing added without you.
                            </h3>
                            <p className="mt-3 text-muted-foreground">
                              Your approved suggestions will appear here.
                            </p>
                            <Button
                              variant="quiet"
                              className="mt-6"
                              onClick={() => scrollToStep(2)}
                            >
                              Review suggestions <ArrowRight />
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="flex items-center gap-2 border-t border-border pt-5 text-xs text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" /> AI
                proposes. You decide.
              </div>
            </div>
          </div>
        </div>
      </div>
      <StepSpacer steps={total} />
    </section>
  );
}