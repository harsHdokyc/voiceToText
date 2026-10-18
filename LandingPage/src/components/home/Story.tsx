import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { Check, Mic, Play } from "lucide-react";
import { LineReveal, Reveal, SectionLabel } from "@/components/site/Reveal";
import { Waveform } from "@/components/site/Waveform";
import { SAMPLE_SUGGESTIONS, SAMPLE_TRANSCRIPT } from "@/lib/content";
import { cn } from "@/lib/utils";

const PILE = [
  { t: "New recording 47", d: "2:13", r: -7, x: "4%", y: "6%" },
  { t: "idea?? walk", d: "0:41", r: 4, x: "38%", y: "0%" },
  { t: "Voice memo — Tue", d: "5:02", r: -2, x: "12%", y: "30%" },
  { t: "remember to…", d: "0:09", r: 8, x: "52%", y: "24%" },
  { t: "New recording 48", d: "1:27", r: -10, x: "0%", y: "56%" },
  { t: "call follow up", d: "0:58", r: 3, x: "34%", y: "50%" },
  { t: "Untitled", d: "3:44", r: -4, x: "56%", y: "66%" },
];

export function Problem() {
  return (
    <section className="border-t border-border">
      <div className="container-site py-24 md:py-32">
        <SectionLabel index="01">The problem</SectionLabel>
        <LineReveal
          lines={["A good thought shouldn't", "disappear into a recording."]}
          className="display-lg mt-8 max-w-5xl"
        />
        <div className="mt-16 grid gap-6 md:grid-cols-12 md:gap-0">
          <Reveal className="md:col-span-6">
            <div className="relative h-[24rem] overflow-hidden rounded-[1.6rem] bg-muted md:rounded-r-none">
              <span className="eyebrow absolute left-5 top-5 z-10 text-muted-foreground">Voice memos · 214 unplayed</span>
              {PILE.map((p, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -30, rotate: 0 }}
                  whileInView={{ opacity: 1, y: 0, rotate: p.r }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.07, type: "spring", stiffness: 120, damping: 14 }}
                  className="absolute flex w-52 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-card"
                  style={{ left: p.x, top: `calc(${p.y} + 3rem)` }}
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-foreground/10">
                    <Play className="h-3 w-3" />
                  </span>
                  <span className="flex-1 truncate text-sm text-foreground/70">{p.t}</span>
                  <span className="font-mono text-xs text-muted-foreground">{p.d}</span>
                </motion.div>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.15} className="md:col-span-6">
            <div className="surface-ink flex h-[24rem] flex-col justify-between rounded-[1.6rem] p-7 md:rounded-l-none">
              <span className="eyebrow text-muted-foreground">Same thoughts · sorted</span>
              <ul className="space-y-4">
                {SAMPLE_SUGGESTIONS.map((s, i) => (
                  <motion.li
                    key={s.id}
                    initial={{ opacity: 0, x: 20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.5 + i * 0.12, duration: 0.6 }}
                    className="flex items-center gap-4 border-b border-border pb-4"
                  >
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-lime text-ink">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="flex-1 font-display text-xl tracking-[-0.02em] sm:text-2xl">{s.title}</span>
                    {s.due && <span className="eyebrow hidden text-muted-foreground sm:block">{s.due}</span>}
                  </motion.li>
                ))}
              </ul>
              <p className="max-w-sm text-sm text-muted-foreground">
                Voice notes are easy to make and easy to forget. The idea is in there — it just never becomes the next step.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

const STAGES = [
  { n: "01", title: "Speak.", body: "Record the thought however it comes out — mid-walk, half-formed, full of ums." },
  { n: "02", title: "Transcribe.", body: "Get readable text you can scan in seconds instead of replaying two minutes of audio." },
  { n: "03", title: "Review.", body: "Possible tasks are pulled out and shown as suggestions. You approve, edit or dismiss each one." },
  { n: "04", title: "Do.", body: "Approved items become tasks, each linked back to the note it came from." },
];

export function Transformation() {
  const [active, setActive] = useState(0);
  return (
    <section id="how" className="surface-ink scroll-mt-16">
      <div className="container-site py-24 md:py-32">
        <SectionLabel index="02">The transformation</SectionLabel>
        <LineReveal lines={["From said", "to sorted."]} className="display-lg mt-8" />
        <div className="mt-16 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            {STAGES.map((s, i) => (
              <StageStep key={s.n} index={i} onActive={setActive} active={active === i} {...s}>
                <div className="mt-6 lg:hidden">
                  <StageVisual stage={i} />
                </div>
              </StageStep>
            ))}
          </div>
          <div className="hidden lg:col-span-6 lg:col-start-7 lg:block">
            <div className="sticky top-28">
              <StageVisual stage={active} />
              <div className="mt-6 flex gap-2">
                {STAGES.map((s, i) => (
                  <span key={s.n} className={cn("h-1 flex-1 rounded-full transition-colors duration-500", i <= active ? "bg-lime" : "bg-foreground/15")} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StageStep({
  n,
  title,
  body,
  index,
  active,
  onActive,
  children,
}: {
  n: string;
  title: string;
  body: string;
  index: number;
  active: boolean;
  onActive: (i: number) => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);
  return (
    <div ref={ref} className="border-t border-border py-10 lg:flex lg:min-h-[60vh] lg:flex-col lg:justify-center">
      <span className={cn("font-mono text-sm transition-colors", active ? "text-lime" : "text-muted-foreground")}>{n}</span>
      <h3 className={cn("mt-3 font-display text-5xl tracking-[-0.045em] transition-opacity duration-500 md:text-6xl", !active && "lg:opacity-30")}>
        {title}
      </h3>
      <p className="mt-4 max-w-sm text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function StageVisual({ stage }: { stage: number }) {
  return (
    <div className="min-h-[22rem] rounded-[1.6rem] bg-paper p-6 text-ink shadow-lift sm:p-8">
      <div className="flex items-center justify-between">
        <span className="eyebrow text-stone">Voice note · 0:14</span>
        <span className="eyebrow rounded-full bg-ink px-2 py-1 text-paper">{STAGES[stage]!.title.replace(".", "")}</span>
      </div>
      <motion.div key={stage} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mt-8">
        {stage === 0 && (
          <div className="flex flex-col items-center gap-8 py-6">
            <span className="grid h-20 w-20 place-items-center rounded-full bg-destructive text-destructive-foreground">
              <Mic className="h-8 w-8" />
            </span>
            <Waveform live className="h-14 w-full" progress={0.6} />
          </div>
        )}
        {stage >= 1 && (
          <p className="font-display text-xl leading-snug tracking-[-0.02em] sm:text-2xl">
            “
            {SAMPLE_TRANSCRIPT.map((s, i) => (
              <span key={i} className={cn("transition-colors duration-700", stage >= 2 && s.taskId && "bg-lavender")}>
                {s.text}
              </span>
            ))}
            ”
          </p>
        )}
        {stage >= 2 && (
          <ul className="mt-6 space-y-2">
            {SAMPLE_SUGGESTIONS.map((s, i) => (
              <motion.li
                key={s.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                  stage === 3 ? "bg-ink text-paper" : "border border-dashed border-ink/30",
                )}
              >
                <span className={cn("h-4 w-4 rounded-full border", stage === 3 ? "border-lime bg-lime" : "border-ink/40")} />
                <span className="flex-1 font-medium">{s.title}</span>
                <span className="eyebrow opacity-60">{stage === 3 ? "Task" : "Suggested"}</span>
              </motion.li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
