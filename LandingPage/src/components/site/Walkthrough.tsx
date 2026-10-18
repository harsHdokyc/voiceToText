import { Check, Mic, ArrowUpRight, Pencil, X, ListTodo } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ProductDemo } from "./ProductDemo";
import { Reveal, SectionLabel } from "./Reveal";
import { SAMPLE_SUGGESTIONS, SAMPLE_TRANSCRIPT } from "@/lib/content";

export function DemoSection({ label = "Try the flow", intro }: { label?: string; intro: string }) {
  return (
    <section id="demo" className="scroll-mt-20 border-y border-border bg-muted/50">
      <div className="container-site py-20 md:py-28">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className="md:col-span-8">
            <SectionLabel>{label}</SectionLabel>
            <h2 className="display-lg mt-7">A thought, in motion.</h2>
          </div>
          <p className="max-w-sm text-base leading-relaxed text-muted-foreground md:col-span-4">{intro}</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start">
          <ProductDemo autoPlay={false} />
          <div className="grid grid-cols-3 gap-3 lg:grid-cols-1 lg:gap-0">
            {[
              ["01", "Play", "Watch a sample note become text."],
              ["02", "Decide", "Approve or dismiss each suggestion."],
              ["03", "Follow through", "Open Tasks to see what you kept."],
            ].map(([n, title, body]) => (
              <div key={n} className="border-t border-border py-4">
                <span className="font-mono text-xs text-primary">{n} / 03</span>
                <h3 className="mt-3 font-display text-lg font-medium">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-5 text-xs text-muted-foreground">Interactive example · no recording is made here.</p>
      </div>
    </section>
  );
}

function TranscriptArtifact() {
  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow text-muted-foreground">Transcript / voice note 01</span>
        <span className="font-mono text-xs text-muted-foreground">0:14</span>
      </div>
      <p className="mt-8 max-w-2xl font-display text-2xl leading-snug md:text-4xl">
        “{SAMPLE_TRANSCRIPT.map((part, i) => <span key={i} className={part.taskId ? "bg-lavender/70" : ""}>{part.text}</span>)}”
      </p>
      <div className="mt-10 flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="h-2 w-2 rounded-full bg-primary" /> Three possible next steps found
      </div>
    </div>
  );
}

function ReviewArtifact() {
  return (
    <div className="border-t border-border pt-6">
      <div className="flex items-center justify-between gap-4">
        <span className="eyebrow text-muted-foreground">Suggestions / awaiting you</span>
        <span className="font-mono text-xs">03</span>
      </div>
      <div className="mt-6 divide-y divide-border">
        {SAMPLE_SUGGESTIONS.map((item, i) => (
          <div key={item.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-5">
            <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
            <div className="min-w-0">
              <p className="font-medium">{item.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.kind}{item.due ? ` · ${item.due}` : ""}</p>
            </div>
            <span className="flex items-center gap-2 text-muted-foreground" aria-label="Edit, dismiss or approve">
              <Pencil className="h-4 w-4" /><X className="h-4 w-4" /><Check className="h-4 w-4 text-primary" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskArtifact() {
  return (
    <div className="surface-ink p-6 md:p-9">
      <div className="flex items-center justify-between border-b border-border pb-6">
        <span className="eyebrow text-muted-foreground">Your tasks</span>
        <ListTodo className="h-5 w-5 text-lime" />
      </div>
      <div className="flex items-start gap-4 py-7">
        <span className="mt-1 grid h-5 w-5 shrink-0 place-items-center border border-lime text-lime"><Check className="h-3 w-3" /></span>
        <div>
          <p className="font-display text-xl">Send revised proposal to Maya</p>
          <p className="mt-2 text-xs text-muted-foreground">Thursday · From voice note 01</p>
        </div>
      </div>
      <p className="border-t border-border pt-5 text-sm text-muted-foreground">Only approved suggestions appear here.</p>
    </div>
  );
}

const STEPS = [
  { n: "01", label: "Capture", title: "Say it as it comes.", body: "A quick note, a rambling thought, three things at once. Start with your voice rather than trying to organize it before it exists.", aside: "No perfect phrasing required.", visual: <div className="flex min-h-56 flex-col justify-between border-t border-border pt-6"><span className="eyebrow text-muted-foreground">Voice note / recording</span><div className="flex items-center gap-5"><span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-destructive text-destructive-foreground"><Mic className="h-6 w-6" /></span><div className="flex h-12 flex-1 items-center gap-1 overflow-hidden">{Array.from({ length: 34 }, (_, i) => <span key={i} className="w-1 shrink-0 rounded-full bg-primary" style={{ height: `${20 + ((i * 17) % 70)}%` }} />)}</div><span className="font-mono text-sm">0:14</span></div><span className="eyebrow text-muted-foreground">A thought, not a form.</span></div> },
  { n: "02", label: "Understand", title: "See what you said.", body: "Your recording becomes a readable transcript. Possible actions are picked out in context, so you can check what was actually meant before deciding what to keep.", aside: "Words first. Suggestions second.", visual: <TranscriptArtifact /> },
  { n: "03", label: "Choose", title: "Nothing happens without you.", body: "Suggested follow-ups, tasks and ideas wait for your review. Rewrite one, change its date, approve it or dismiss it. An unchecked suggestion is never a real task.", aside: "AI proposes. You decide.", visual: <ReviewArtifact /> },
  { n: "04", label: "Act", title: "Keep the next step.", body: "The things you approve move into your task list with their source note attached. The rest stays out of your way.", aside: "From thought to follow-through.", visual: <TaskArtifact /> },
];

export function FlowWalkthrough({ variant = "product" }: { variant?: "product" | "process" }) {
  return (
    <section className="container-site py-20 md:py-32">
      <div className="grid gap-7 md:grid-cols-12 md:items-end">
        <div className="md:col-span-8">
          <SectionLabel>{variant === "product" ? "Inside the product" : "The whole journey"}</SectionLabel>
          <h2 className="display-lg mt-7">Four moments.<br />One clear direction.</h2>
        </div>
        <p className="max-w-sm leading-relaxed text-muted-foreground md:col-span-4">From a thought out loud to something you can actually do — without losing control along the way.</p>
      </div>
      <div className="mt-14 border-t border-border">
        {STEPS.map((step) => (
          <Reveal key={step.n} y={14}>
            <article className="grid gap-8 border-b border-border py-12 md:grid-cols-12 md:gap-10 md:py-20">
              <div className="md:col-span-1"><span className="font-mono text-sm text-primary">{step.n}</span></div>
              <div className="md:col-span-5">
                <span className="eyebrow text-muted-foreground">{step.label}</span>
                <h3 className="mt-5 max-w-md font-display text-4xl font-medium leading-[1.05] md:text-5xl">{step.title}</h3>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">{step.body}</p>
                <p className="mt-7 inline-flex items-center gap-2 text-sm font-medium"><ArrowUpRight className="h-4 w-4 text-primary" /> {step.aside}</p>
              </div>
              <div className="min-w-0 md:col-span-6">{step.visual}</div>
            </article>
          </Reveal>
        ))}
      </div>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-5">
        <p className="text-sm text-muted-foreground">Want to make the decisions yourself?</p>
        <Button asChild variant="quiet"><a href="#demo">Try the example <ArrowUpRight className="h-4 w-4" /></a></Button>
      </div>
    </section>
  );
}

export function DecisionPrinciple() {
  return (
    <section className="bg-lavender text-ink">
      <div className="container-site grid gap-10 py-20 md:grid-cols-12 md:items-end md:py-28">
        <div className="md:col-span-8">
          <p className="eyebrow">Built around your judgment</p>
          <h2 className="mt-8 font-display text-[clamp(2.8rem,5vw,5rem)] font-medium leading-[1.03]">A suggestion is not a commitment.</h2>
        </div>
        <div className="md:col-span-4">
          <p className="text-lg leading-relaxed text-ink/75">Keep what matters. Change what doesn’t fit. Leave the rest. The final call is always yours.</p>
          <Link to="/product" className="mt-7 inline-flex items-center gap-2 border-b border-ink pb-1 text-sm font-medium">Explore the product <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </div>
    </section>
  );
}