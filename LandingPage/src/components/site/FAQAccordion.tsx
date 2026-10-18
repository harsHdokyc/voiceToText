import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { Faq } from "@/lib/content";
import { cn } from "@/lib/utils";

export function FAQAccordion({ items }: { items: Faq[] }) {
  const [open, setOpen] = useState<number | null>(0);
  const prefix = useId();
  return (
    <ul className="border-t border-border">
      {items.map((f, i) => {
        const isOpen = open === i;
        const id = `${prefix}-faq-${i}`;
        return (
          <li key={f.q} className="border-b border-border">
            <h3>
              <Button variant="ghost"
                id={`${id}-trigger`}
                aria-expanded={isOpen}
                aria-controls={id}
                onClick={() => setOpen(isOpen ? null : i)}
                className="grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 whitespace-normal rounded-none px-0 py-5 text-left font-display text-lg font-normal hover:bg-transparent sm:text-2xl"
              >
                {f.q}
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border transition-all duration-500",
                    isOpen && "rotate-45 border-primary bg-primary text-primary-foreground",
                  )}
                >
                  <Plus className="h-4 w-4" />
                </span>
              </Button>
            </h3>
            <div
              id={id}
              role="region"
              aria-labelledby={`${id}-trigger`}
              aria-hidden={!isOpen}
              className={cn(
                "grid transition-[grid-template-rows] duration-500 ease-[var(--ease-out)]",
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-7 text-[0.95rem] leading-relaxed text-muted-foreground">{f.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
