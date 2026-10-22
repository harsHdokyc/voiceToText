import { useEffect, useRef, useState } from "react";
import { useLenis } from "lenis/react";
import { offsetForStep, stepAt } from "@/lib/scroll-steps";

// Scroll distance per step; ~2 wheel/trackpad strokes.
const STEP_SCROLL_VH = 30;

export const PINNED_PANEL =
  "sticky top-20 flex min-h-[calc(100dvh-5rem)] items-center md:top-24 md:min-h-[calc(100dvh-6rem)]";

export function StepSpacer({ steps }: { steps: number }) {
  return <div aria-hidden style={{ height: `${steps * STEP_SCROLL_VH}vh` }} />;
}

/** Pins a panel below the header and advances steps as the trailing spacer scrolls past. */
export function useScrollSteps(total: number) {
  const sectionRef = useRef<HTMLElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const [step, setStep] = useState(0);

  function pin() {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return null;
    const range = section.offsetHeight - sticky.offsetHeight;
    if (range <= 0) return null;
    const offset = parseFloat(getComputedStyle(sticky).top) || 0;
    return { range, scrolled: offset - section.getBoundingClientRect().top };
  }

  function scrollToStep(index: number) {
    const p = pin();
    if (!p) return;
    const top = window.scrollY - p.scrolled + offsetForStep(index, p.range, total);
    if (lenis) lenis.scrollTo(top);
    else window.scrollTo({ top, behavior: "smooth" });
  }

  useEffect(() => {
    const sync = () => {
      const p = pin();
      if (!p) return;
      const next = stepAt(p.scrolled, p.range, total);
      setStep((prev) => (prev === next ? prev : next));
    };

    sync();
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, [total]);

  return { sectionRef, stickyRef, step, scrollToStep };
}
