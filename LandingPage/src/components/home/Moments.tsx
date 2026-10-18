import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";
import { LineReveal, Reveal, SectionLabel } from "@/components/site/Reveal";
import { FAQAccordion } from "@/components/site/FAQAccordion";
import { FAQS } from "@/lib/content";

const MOMENTS = [
  {
    time: "07:12",
    place: "On a walk",
    quote: "What if onboarding just asked one question instead of five?",
    result: "Idea · Simplify onboarding to one question",
  },
  {
    time: "11:40",
    place: "Right after a call",
    quote: "Promised Sam I'd send the contract redlines by Friday.",
    result: "Follow-up · Send Sam contract redlines — Fri",
  },
  {
    time: "18:25",
    place: "Commute home",
    quote: "Tomorrow: finish the deck first, then the budget, then reply to Lena.",
    result: "3 tasks · Deck → Budget → Reply to Lena",
  },
  {
    time: "Fri 16:05",
    place: "Before the weekend",
    quote: "Pick up the dry cleaning, renew the parking permit, call Mum.",
    result: "3 tasks · Saturday",
  },
];

export function UseCases() {
  return (
    <section className="container-site py-24 md:py-32">
      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-5">
          <SectionLabel index="05">Everyday moments</SectionLabel>
          <LineReveal lines={["Thoughts don't wait", "for a desk."]} className="display-md mt-8" />
        </div>
      </div>
      <ol className="mt-14">
        {MOMENTS.map((m, i) => (
          <Reveal key={m.time} delay={i * 0.05}>
            <li className="group grid gap-4 border-t border-border py-8 transition-colors md:grid-cols-12 md:items-center">
              <div className="md:col-span-2">
                <p className="font-mono text-sm">{m.time}</p>
                <p className="eyebrow mt-1 text-muted-foreground">{m.place}</p>
              </div>
              <p className="font-display text-2xl leading-tight tracking-[-0.03em] md:col-span-6 md:text-3xl">“{m.quote}”</p>
              <div className="md:col-span-4 md:justify-self-end">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-sm transition-all duration-500 group-hover:border-foreground group-hover:bg-foreground group-hover:text-background">
                  <span className="h-2 w-2 rounded-full bg-lime ring-1 ring-foreground/30" />
                  {m.result}
                </span>
              </div>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

const WORDS = ["um,", "so", "I", "need", "to", "send", "Maya", "the", "proposal,", "and", "uh,", "the", "dentist", "thing,", "and", "that", "onboarding", "idea…"];
const KEEP = new Set([5, 6, 8, 12, 16]);

function Word({ w, i, progress }: { w: string; i: number; progress: MotionValue<number> }) {
  const keep = KEEP.has(i);
  const start = 0.15 + (i / WORDS.length) * 0.4;
  const opacity = useTransform(progress, [start, start + 0.1], [1, keep ? 1 : 0.12]);
  const color = useTransform(progress, [start, start + 0.1], ["var(--ink)", keep ? "var(--cobalt)" : "var(--ink)"]);
  return (
    <motion.span style={{ opacity, color }} className="mr-[0.25em] inline-block">
      {w}
    </motion.span>
  );
}

export function Surprise() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const listOpacity = useTransform(scrollYProgress, [0.5, 0.65], [0, 1]);
  const listY = useTransform(scrollYProgress, [0.5, 0.65], [30, 0]);

  return (
    <section ref={ref} className="bg-lime text-ink">
      <div className="container-site py-24 md:py-36">
        <p className="eyebrow text-ink/60">06 — What you said vs. what you meant</p>
        <p className="mt-10 font-display text-[clamp(2.2rem,6.5vw,6rem)] font-medium leading-[0.98] tracking-[-0.05em]">
          {WORDS.map((w, i) => (
            <Word key={i} w={w} i={i} progress={scrollYProgress} />
          ))}
        </p>
        <motion.div style={{ opacity: listOpacity, y: listY }} className="mt-14 grid gap-3 border-t-2 border-ink pt-6 sm:grid-cols-3">
          {["Send Maya the proposal", "Book the dentist", "Explore onboarding idea"].map((t, i) => (
            <div key={t} className="flex items-center gap-3">
              <span className="font-mono text-sm">0{i + 1}</span>
              <span className="font-display text-xl tracking-[-0.02em]">{t}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

export function HomeFaq() {
  return (
    <section className="container-site grid gap-12 py-24 md:py-32 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <SectionLabel index="07">Questions</SectionLabel>
        <h2 className="display-md mt-8">Straight answers, including the undecided bits.</h2>
        <Link to="/faq" className="mt-8 inline-block text-sm underline decoration-lime decoration-2 underline-offset-4">
          All questions →
        </Link>
      </div>
      <div className="lg:col-span-8">
        <FAQAccordion items={FAQS.slice(0, 5)} />
      </div>
    </section>
  );
}
