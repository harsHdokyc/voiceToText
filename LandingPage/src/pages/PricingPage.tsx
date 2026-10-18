import { Link } from "react-router-dom";
import { CTABand } from "@/components/site/Blocks";
import { SectionLabel } from "@/components/site/Reveal";
import { Button } from "@/components/ui/button";

export function PricingPage() {
  return (
    <>
      <section className="container-site grid gap-12 pb-20 pt-14 md:grid-cols-12 md:pb-28 md:pt-24">
        <div className="md:col-span-8">
          <SectionLabel>Pricing / not yet announced</SectionLabel>
          <h1 className="mt-8 font-display text-[clamp(3rem,7vw,7rem)] font-medium leading-[0.98]">
            No numbers
            <br />
            <span className="italic text-primary">pulled from thin air.</span>
          </h1>
        </div>
        <div className="self-end md:col-span-4">
          <p className="text-lg leading-relaxed text-muted-foreground">
            We haven’t decided on plans or prices yet. When we do, early-access
            members will hear first — before anything is charged.
          </p>
          <Button asChild variant="cta" size="xl" className="mt-8">
            <Link to="/early-access">
              Join early access <span className="arrow">→</span>
            </Link>
          </Button>
        </div>
      </section>
      <section className="border-t border-border">
        <div className="container-site grid gap-8 py-20 md:grid-cols-12 md:py-28">
          <p className="eyebrow text-muted-foreground md:col-span-3">
            What we can say
          </p>
          <div className="md:col-span-9">
            <h2 className="display-md max-w-2xl">
              Know what you’re signing up for.
            </h2>
            <div className="mt-10 grid gap-8 border-t border-border pt-8 sm:grid-cols-2">
              <div>
                <span className="font-mono text-sm text-primary">01</span>
                <h3 className="mt-4 font-display text-2xl">Early access first.</h3>
                <p className="mt-3 text-muted-foreground">
                  Joining the list is a request for updates, not a purchase.
                </p>
              </div>
              <div>
                <span className="font-mono text-sm text-primary">02</span>
                <h3 className="mt-4 font-display text-2xl">
                  Details before payment.
                </h3>
                <p className="mt-3 text-muted-foreground">
                  We’ll share plan details before asking anyone to pay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
      <CTABand title="Be first to hear what’s next." />
    </>
  );
}
