import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Saydo home"
      className={cn(
        "group inline-flex items-center gap-2.5 font-display text-[1.35rem] font-semibold tracking-tight",
        className,
      )}
    >
      <img
        src="/saydo-mark.svg"
        width={36}
        height={36}
        alt=""
        draggable={false}
        className="shrink-0 rounded-[0.7rem] shadow-[2px_2px_0_0_var(--ink)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]"
      />
      <span>Saydo</span>
    </Link>
  );
}
