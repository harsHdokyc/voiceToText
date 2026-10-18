import { DraftNotice, PageIntro } from "@/components/site/Blocks";

export function TermsPage() {
  return (
    <>
      <PageIntro
        label="Terms / draft"
        lines={["Clear terms.", "Before you commit."]}
        lead="Product terms are being prepared for legal review. We won’t present unfinished legal language as a final agreement."
      />
      <section className="container-site pb-24">
        <div className="max-w-3xl">
          <DraftNotice>
            These terms are placeholders pending legal review. They are not
            final and not legal advice.
          </DraftNotice>
        </div>
        <div className="mt-16 divide-y divide-border border-t border-border">
          {(
            [
              [
                "01",
                "The early-access list",
                "You can join the list to hear about availability. This does not create a paid subscription or grant product access.",
              ],
              [
                "02",
                "Product use",
                "The rules for accounts, acceptable use and product availability will be set out in final terms before the product is offered.",
              ],
              [
                "03",
                "Plans and billing",
                "Pricing and plans have not been decided. Details will be shared before anyone is charged.",
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
