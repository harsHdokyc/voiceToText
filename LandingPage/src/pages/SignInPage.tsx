import { motion } from "motion/react";
import { ArrowUpRight, Check } from "lucide-react";
import { SignInForm } from "@/components/site/SignInForm";
import { VoiceRibbon } from "@/components/site/Experience";

export function SignInPage() {
  return (
    <section className="container-site grid gap-8 py-6 sm:py-10 lg:grid-cols-2 lg:gap-20 lg:py-16">
      <div className="surface-ink relative hidden min-h-[42rem] flex-col justify-between overflow-hidden p-10 lg:flex">
        <div className="flex items-center justify-between">
          <span className="eyebrow text-lime">Said → sorted</span>
          <ArrowUpRight className="h-5 w-5 text-lime" />
        </div>
        <div className="py-12">
          <h2 className="text-6xl font-medium leading-[1.05]">
            Good thoughts.
            <br />
            Clearer <span className="italic text-lime">next steps.</span>
          </h2>
          <div className="mt-8 text-lime">
            <VoiceRibbon />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 rotate-[-2deg] rounded-lg bg-lavender p-6 text-ink"
          >
            <p className="eyebrow text-ink/55">From your voice note</p>
            <p className="mt-4 text-2xl">
              “Send the revised proposal to Maya by Thursday.”
            </p>
            <div className="mt-6 flex items-center justify-between border-t border-ink/15 pt-4 text-sm">
              <span>One clear next step.</span>
              <span className="flex items-center gap-2">
                <Check className="h-4 w-4" />
                Approved
              </span>
            </div>
          </motion.div>
        </div>
        <p className="eyebrow text-muted-foreground">AI proposes. You decide.</p>
      </div>
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex min-w-0 justify-center self-center py-2 lg:py-4"
      >
        <SignInForm />
      </motion.div>
    </section>
  );
}
