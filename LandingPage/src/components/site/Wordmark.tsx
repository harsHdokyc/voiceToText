import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { SaydoMark } from "./SaydoMark";

export function Wordmark({
  className = "",
  mark = true,
}: {
  className?: string;
  mark?: boolean;
}) {
  return (
    <Link
      to="/"
      aria-label="Saydo home"
      className={cn(
        "group inline-flex items-center gap-2.5 font-display text-[1.35rem] font-semibold tracking-tight",
        className,
      )}
    >
      {mark ? (
        <SaydoMark
          size={36}
          className="rounded-[0.7rem] shadow-[2px_2px_0_0_var(--ink)] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:rotate-[-4deg]"
        />
      ) : null}
      <span>Saydo</span>
    </Link>
  );
}
