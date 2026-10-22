/** Step index for a pinned section, given pixels scrolled into its pinned range. */
export function stepAt(scrolled: number, range: number, total: number) {
  if (range <= 0 || total <= 0) return 0;
  const progressed = Math.min(Math.max(scrolled, 0), range);
  return Math.min(total - 1, Math.floor((progressed / range) * total));
}
