import { ArrowDown, Mic, ScanText, Check, ListTodo } from "lucide-react";
import { InteractiveJourney } from "@/components/site/Experience";
import { LineReveal, SectionLabel, Reveal } from "@/components/site/Reveal";
import { CTABand } from "@/components/site/Blocks";

export function HowItWorksPage() {
  return (
    <>
      <section className="container-site pb-10 pt-8 md:pb-16 md:pt-20">
        <SectionLabel>How it works / follow a thought</SectionLabel>
        <div className="mt-6 grid gap-6 md:items-end lg:grid-cols-[minmax(0,1fr)_16rem]">
          <LineReveal
            as="h1"
            className="text-[2.75rem] font-medium leading-[1.03] md:text-7xl lg:text-8xl"
            lines={[
              "From said",
              <span key="sorted">
                to <span className="italic text-primary">sorted.</span>
              </span>,
            ]}
          />
          <div>
            <p className="text-lg leading-relaxed text-muted-foreground">
              One ordinary voice note. Four small moments. A very different
              ending.
            </p>
            <a
              href="#journey"
              className="mt-6 inline-flex items-center gap-3 text-sm"
            >
              Follow the thought <ArrowDown className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>
      <InteractiveJourney />
      <section className="container-site py-16 md:py-24">
        <SectionLabel>The little things that matter</SectionLabel>
        <div className="mt-10 grid gap-8 md:grid-cols-4">
          {[
            {
              icon: Mic,
              title: "Start messy.",
              body: "No perfect phrasing required.",
            },
            {
              icon: ScanText,
              title: "Keep the context.",
              body: "The original thought stays in view.",
            },
            {
              icon: Check,
              title: "Make the call.",
              body: "Change it, keep it, or let it go.",
            },
            {
              icon: ListTodo,
              title: "Carry it forward.",
              body: "Only your chosen actions become tasks.",
            },
          ].map((item, i) => (
            <Reveal
              key={item.title}
              delay={i * 0.1}
              className="border-t border-border pt-6"
            >
              <item.icon className="h-6 w-6 text-primary" />
              <h2 className="mt-6 text-2xl">{item.title}</h2>
              <p className="mt-3 text-muted-foreground">{item.body}</p>
            </Reveal>
          ))}
        </div>
      </section>
      <CTABand title="The thought is just the beginning." />
    </>
  );
}
