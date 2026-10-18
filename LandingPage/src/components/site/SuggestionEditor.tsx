import { useState } from "react";
import { Check, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Suggestion } from "@/lib/content";

type State = "pending" | "editing" | "approved" | "rejected";

/** One suggestion with the full edit / reject / approve lifecycle. */
export function SuggestionEditor({ suggestion, initial = "pending" }: { suggestion: Suggestion; initial?: State }) {
  const [state, setState] = useState<State>(initial);
  const [title, setTitle] = useState(suggestion.title);
  const [due, setDue] = useState(suggestion.due ?? "");

  const isTask = state === "approved";

  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 transition-all duration-500",
        isTask && "bg-foreground text-background shadow-lift",
        state === "pending" && "border border-dashed border-foreground/30 bg-card/60",
        state === "editing" && "border-2 border-primary bg-card",
        state === "rejected" && "border border-border bg-transparent opacity-60",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "eyebrow rounded-full px-2 py-1",
            isTask ? "bg-lime text-ink" : state === "rejected" ? "text-muted-foreground" : "bg-lavender text-ink",
          )}
        >
          {isTask ? "Task" : state === "rejected" ? "Dismissed" : state === "editing" ? "Editing suggestion" : "Suggestion · pending"}
        </span>
        <span className={cn("eyebrow", isTask ? "text-background/50" : "text-muted-foreground")}>{suggestion.kind}</span>
      </div>

      {state === "editing" ? (
        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="sr-only">Task title</span>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border-b border-foreground/30 bg-transparent pb-1 font-display text-xl tracking-[-0.02em] outline-none focus:border-primary"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Due
            <input
              value={due}
              placeholder="No date"
              onChange={(e) => setDue(e.target.value)}
              className="flex-1 border-b border-foreground/20 bg-transparent pb-0.5 text-foreground outline-none focus:border-primary"
            />
          </label>
        </div>
      ) : (
        <div className="mt-4">
          <p className={cn("font-display text-xl leading-tight tracking-[-0.02em]", state === "rejected" && "line-through")}>{title}</p>
          <p className={cn("mt-1 text-sm", isTask ? "text-background/60" : "text-muted-foreground")}>{due ? `Due ${due}` : "No date"}</p>
        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        {state === "pending" && (
          <>
            <button onClick={() => setState("approved")} className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-cobalt-deep">
              <Check className="h-3.5 w-3.5" /> Approve
            </button>
            <button onClick={() => setState("editing")} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3.5 py-1.5 text-xs font-medium hover:bg-muted">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => setState("rejected")} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Reject
            </button>
          </>
        )}
        {state === "editing" && (
          <>
            <button onClick={() => setState("approved")} className="rounded-full bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground">
              Save & approve
            </button>
            <button onClick={() => setState("pending")} className="rounded-full border border-border px-3.5 py-1.5 text-xs">
              Done editing
            </button>
          </>
        )}
        {(state === "approved" || state === "rejected") && (
          <button onClick={() => setState("pending")} className={cn("eyebrow", isTask ? "text-background/60 hover:text-background" : "text-muted-foreground hover:text-foreground")}>
            ← Undo
          </button>
        )}
      </div>
    </div>
  );
}
