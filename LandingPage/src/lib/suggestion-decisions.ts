import { useState } from "react";
import type { Suggestion } from "./content";

export type Decision = "approved" | "dismissed";
export type Decisions = Record<number, Decision>;

export function withDecision(decisions: Decisions, id: number, decision: Decision): Decisions {
  return { ...decisions, [id]: decision };
}

export function withoutDecision(decisions: Decisions, id: number): Decisions {
  const next = { ...decisions };
  delete next[id];
  return next;
}

/** A blank edit falls back to the original suggestion title. */
export function displayTitle(titles: Record<number, string>, suggestion: Suggestion): string {
  return titles[suggestion.id]?.trim() || suggestion.title;
}

/** Approve / dismiss / undo / rename state for a list of sample suggestions. */
export function useSuggestionDecisions() {
  const [decisions, setDecisions] = useState<Decisions>({});
  const [titles, setTitles] = useState<Record<number, string>>({});
  const [editing, setEditing] = useState<number | null>(null);
  return {
    decisions,
    titles,
    editing,
    setEditing,
    decide: (id: number, decision: Decision) => setDecisions((prev) => withDecision(prev, id, decision)),
    undo: (id: number) => setDecisions((prev) => withoutDecision(prev, id)),
    rename: (id: number, title: string) => setTitles((prev) => ({ ...prev, [id]: title })),
    titleOf: (suggestion: Suggestion) => displayTitle(titles, suggestion),
    reset: () => {
      setDecisions({});
      setTitles({});
      setEditing(null);
    },
  };
}
