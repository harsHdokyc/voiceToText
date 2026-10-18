import { PageIntro } from "@/components/site/Blocks";
import { FAQAccordion } from "@/components/site/FAQAccordion";
import { FAQS } from "@/lib/content";

export function FaqPage() {
  return (
    <>
      <PageIntro label="FAQ" lines={["Questions,", "answered honestly."]} />
      <section className="container-site pb-24">
        <FAQAccordion items={FAQS} />
      </section>
    </>
  );
}
