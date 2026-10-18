import { PageIntro } from "@/components/site/Blocks";
import { EarlyAccessForm } from "@/components/site/EarlyAccessForm";

export function EarlyAccessPage() {
  return (
    <>
      <PageIntro
        label="Early access"
        lines={["Give your voice notes", "somewhere to go."]}
      />
      <section className="container-site max-w-2xl pb-24">
        <EarlyAccessForm />
      </section>
    </>
  );
}
