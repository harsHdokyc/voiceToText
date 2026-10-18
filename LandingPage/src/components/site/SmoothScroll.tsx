import { ReactLenis, type LenisRef } from "lenis/react";
import { cancelFrame, frame } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import "lenis/dist/lenis.css";

/** Root Lenis driven by Motion's frame so useScroll stays in sync. */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const update = ({ timestamp }: { timestamp: number }) => {
      lenisRef.current?.lenis?.raf(timestamp);
    };
    frame.setup(update, true);
    return () => cancelFrame(update);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{ autoRaf: false, anchors: true, allowNestedScroll: true }}
    >
      {children}
    </ReactLenis>
  );
}
