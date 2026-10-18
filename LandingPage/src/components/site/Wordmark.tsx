import { Link } from "react-router-dom";

export function Wordmark({ className = "" }: { className?: string }) {
  return (
    <Link
      to="/"
      aria-label="Saydo home"
      className={`inline-flex items-baseline font-display text-[1.5rem] font-semibold ${className}`}
    >
      <span>Saydo</span>
    </Link>
  );
}
