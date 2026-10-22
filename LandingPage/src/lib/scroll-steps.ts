/** Step index for a pinned section, given pixels scrolled into its pinned range. */
export function stepAt(scrolled: number, range: number, total: number) {
  if (range <= 0 || total <= 0) return 0;
  const progressed = Math.min(Math.max(scrolled, 0), range);
  return Math.min(total - 1, Math.floor((progressed / range) * total));
}

/** Inverse of `stepAt`: pixels into the pinned range at the middle of a step's band. */
export function offsetForStep(index: number, range: number, total: number) {
  if (range <= 0 || total <= 0) return 0;
  const step = Math.min(Math.max(index, 0), total - 1);
  return (range * (step + 0.5)) / total;
}
