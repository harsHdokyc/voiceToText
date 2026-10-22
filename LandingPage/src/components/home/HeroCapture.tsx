import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Mic, Pencil, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Waveform } from "@/components/site/Waveform";
import { SAMPLE_LENGTH, SAMPLE_SUGGESTIONS } from "@/lib/content";
import { useSuggestionDecisions } from "@/lib/suggestion-decisions";
import { cn } from "@/lib/utils";

export function HeroCapture() {
  const [playing, setPlaying] = useState(false);
  const { decisions, titles, editing, setEditing, decide, undo, rename, titleOf, reset } = useSuggestionDecisions();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const replay = () => {
    if (timer.current) clearTimeout(timer.current);
    reset();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPlaying(true);
    timer.current = setTimeout(() => setPlaying(false), 1800);
  };

  return <div className="hero-workbench" aria-label="Interactive sample voice note and next steps">
    <div className="hero-source">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-2"><Mic className="h-4 w-4"/>01 / The thought</span>
        <span className="font-mono text-xs text-muted-foreground">Sample · {SAMPLE_LENGTH}</span>
      </div>
      <p className="hero-transcript">“Need to <mark>send the revised proposal to Maya by Thursday</mark><span className="hidden md:inline">, and <mark>book a dentist appointment</mark></span>.”</p>
      <div className="flex items-center gap-4 border-t border-foreground/15 pt-3">
        <Button variant="ink" size="icon" aria-label="Replay sample voice note" title="Replay sample voice note" onClick={replay}><RotateCcw className={cn(playing && "animate-spin")}/></Button>
        <Waveform live={playing} className="h-7"/>
        <span className="font-mono text-xs text-muted-foreground" role="status">{playing ? "Listening…" : "Captured"}</span>
      </div>
    </div>
    <div className="hero-connector" aria-hidden><ArrowRight/></div>
    <div className="hero-actions surface-ink">
      <div className="flex items-center justify-between gap-3">
        <span className="eyebrow flex items-center gap-2 text-lime"><Sparkles className="h-4 w-4"/>02 / The next steps</span>
        <span className="font-mono text-xs text-muted-foreground">You decide</span>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {SAMPLE_SUGGESTIONS.slice(0, 2).map(task => {
          const decision = decisions[task.id];
          return <li key={task.id} className={cn("hero-task", task.id === 2 && "hero-secondary-task")}>
            <span className={cn("mt-1 grid h-5 w-5 shrink-0 place-items-center rounded border", decision === "approved" ? "border-lime bg-lime text-ink" : "border-foreground/30")}>
              {decision === "approved" ? <Check className="h-3.5 w-3.5"/> : decision === "dismissed" ? <X className="h-3.5 w-3.5"/> : null}
            </span>
            <div className="min-w-0">
              {editing === task.id ? <input autoFocus aria-label={`Edit ${task.title}`} value={titles[task.id] ?? task.title} onChange={e => rename(task.id, e.target.value)} onBlur={() => setEditing(null)} onKeyDown={e => {if(e.key === "Enter" || e.key === "Escape") setEditing(null);}} className="w-full border-b border-lime bg-transparent py-1 text-base text-foreground outline-none"/> : <p className={cn("text-base font-medium leading-snug", decision === "dismissed" && "text-muted-foreground line-through")}>{titleOf(task)}</p>}
              <p className="mt-1 text-xs text-muted-foreground">{task.kind}{task.due && <span className="ml-2 text-lime">↗ {task.due}</span>}</p>
            </div>
            <div className="hero-task-controls">
              {decision ? <Button variant="ghost" size="sm" className="text-lime" onClick={() => undo(task.id)}>{decision === "approved" ? "Approved" : "Dismissed"} · Undo</Button> : <>
                <Button variant="ghost" size="icon" aria-label={`Dismiss ${task.title}`} title="Dismiss suggestion" onClick={() => decide(task.id, "dismissed")}><X/></Button>
                <Button variant="ghost" size="icon" aria-label={`Edit ${task.title}`} title="Edit suggestion" onClick={() => setEditing(task.id)}><Pencil/></Button>
                <Button variant="lime" size="sm" aria-label={`Approve ${task.title}`} onClick={() => decide(task.id, "approved")}>Approve <Check/></Button>
              </>}
            </div>
          </li>;
        })}
      </ul>
    </div>
  </div>;
}