import { cn } from "@/lib/utils";

/** Primary Saydo mark — same asset as Expo favicon / app icon. */
export function SaydoMark({
  className,
  size = 36,
  title = "Saydo",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <img
      src="/saydo-mark.svg"
      width={size}
      height={size}
      alt={title}
      className={cn("shrink-0", className)}
      draggable={false}
    />
  );
}
