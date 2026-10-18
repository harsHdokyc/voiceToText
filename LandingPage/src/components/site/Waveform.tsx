import { cn } from "@/lib/utils";

const HEIGHTS = [
  0.3, 0.5, 0.8, 0.45, 0.9, 0.6, 0.35, 0.7, 1, 0.55, 0.4, 0.75, 0.5, 0.85, 0.3, 0.6, 0.95, 0.45,
  0.65, 0.35, 0.8, 0.5, 0.7, 0.4, 0.9, 0.55, 0.3, 0.6, 0.45, 0.75, 0.35, 0.5,
];

export function Waveform({
  live = false,
  progress = 1,
  bars = 32,
  className,
}: {
  live?: boolean;
  progress?: number;
  bars?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex h-10 min-w-0 flex-1 items-center gap-[3px]", className)} aria-hidden>
      {HEIGHTS.slice(0, bars).map((h, i) => {
        const filled = i / bars < progress;
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] flex-1 rounded-full transition-colors duration-300",
              filled ? "bg-primary" : "bg-foreground/15",
              live && "animate-wave",
            )}
            style={{
              height: `${h * 100}%`,
              animationDelay: live ? `${(i % 8) * 0.09}s` : undefined,
            }}
          />
        );
      })}
    </div>
  );
}
