import { DraftNotice, PageIntro } from "@/components/site/Blocks";

export function PrivacyPage() {
  return (
    <>
      <PageIntro
        label="Privacy / draft"
        lines={["Your data deserves", "straight answers."]}
        lead="Here is what we can say today. A full privacy policy will be published before the product collects recordings."
      />
      <section className="container-site pb-24">
        <div className="max-w-3xl">
          <DraftNotice>
            This is a draft, not a final privacy policy. Legal entity, data
            retention, subprocessors, processing regions and contact details
            still need to be finalised and legally reviewed.
          </DraftNotice>
        </div>
        <div className="mt-16 divide-y divide-border border-t border-border">
          {(
            [
              [
                "01",
                "Early-access information",
                "When you join the list, you provide an email address and may provide a first name. We use these to contact you about early access.",
              ],
              [
                "02",
                "Recordings",
                "The interactive example on this site uses a sample note; it does not record your voice. Product recording and transcript retention rules have not been finalised.",
              ],
              [
                "03",
                "What is still to come",
                "A complete policy will cover retention, providers, processing locations, your rights and how to contact us. It needs legal review before release.",
              ],
            ] as const
          ).map(([n, title, text]) => (
            <div key={n} className="grid gap-4 py-8 md:grid-cols-12">
              <span className="font-mono text-sm text-primary md:col-span-1">
                {n}
              </span>
              <h2 className="font-display text-2xl md:col-span-4">{title}</h2>
              <p className="max-w-xl leading-relaxed text-muted-foreground md:col-span-7">
                {text}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
