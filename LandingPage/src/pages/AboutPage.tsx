import { CTABand } from "@/components/site/Blocks";
import { SectionLabel } from "@/components/site/Reveal";

export function AboutPage() {
  return (
    <>
      <section className="container-site pb-24 pt-14 md:pb-32 md:pt-24">
        <SectionLabel>About / the thinking behind it</SectionLabel>
        <h1 className="mt-8 max-w-6xl font-display text-[clamp(3rem,7vw,7rem)] font-medium leading-[0.98]">
          The best ideas rarely arrive{" "}
          <span className="italic text-primary">at a desk.</span>
        </h1>
        <div className="mt-12 grid gap-8 border-t border-border pt-8 md:grid-cols-12">
          <span className="eyebrow text-muted-foreground md:col-span-3">
            Why Saydo
          </span>
          <p className="max-w-2xl text-xl leading-relaxed md:col-span-8">
            Speaking is easy. Remembering to go back, listen again, and turn a
            good thought into action is the hard part. That gap is what Saydo is
            made for.
          </p>
        </div>
      </section>
      <section className="surface-ink">
        <div className="container-site py-20 md:py-28">
          <p className="eyebrow text-lime">Three beliefs</p>
          <div className="mt-8 divide-y divide-border border-t border-border">
            {(
              [
                [
                  "01",
                  "Start messy.",
                  "Your first thought doesn’t need to look like a finished task.",
                ],
                [
                  "02",
                  "Make the useful part visible.",
                  "A transcript is easier to scan than a recording is to replay.",
                ],
                [
                  "03",
                  "Leave the choice to people.",
                  "Suggested next steps stay suggestions until you decide otherwise.",
                ],
              ] as const
            ).map(([n, title, text]) => (
              <div
                key={n}
                className="grid gap-4 py-8 md:grid-cols-12 md:items-baseline"
              >
                <span className="font-mono text-sm text-lime md:col-span-1">
                  {n}
                </span>
                <h2 className="font-display text-3xl md:col-span-5 md:text-4xl">
                  {title}
                </h2>
                <p className="max-w-sm text-muted-foreground md:col-span-6">
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CTABand title="Let a thought go somewhere." />
    </>
  );
}
