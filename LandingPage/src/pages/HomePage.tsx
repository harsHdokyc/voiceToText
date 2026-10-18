import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroCapture } from "@/components/home/HeroCapture";
import { CTABand } from "@/components/site/Blocks";
import { Problem, Transformation } from "@/components/home/Story";
import { Showcase, HumanControl } from "@/components/home/Product";
import { UseCases, Surprise, HomeFaq } from "@/components/home/Moments";

export function HomePage() {
  return (
    <>
      <section className="hero-section">
        <div className="container-site">
          <div className="hero-heading-row">
            <h1 className="hero-title">
              Say it.
              <br />
              Get it <span className="italic text-primary">done.</span>
              <ArrowUpRight className="hero-title-arrow" aria-hidden />
            </h1>
            <div className="hero-intro">
              <p className="eyebrow text-primary">A thought is just the start.</p>
              <p className="mt-3 text-lg leading-relaxed">
                Your thoughts, turned into next steps.
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Speak it. See the possibilities.
                <br className="hidden lg:block" /> Choose what happens next.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Button asChild variant="cta" size="xl">
                  <Link to="/early-access">
                    Get early access <ArrowUpRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <HeroCapture />
          </motion.div>
          <div className="hero-footnote">
            <span className="eyebrow">Less mental clutter. More momentum.</span>
            <a
              href="#how"
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              The thought → action journey <ArrowDown className="h-3 w-3" />
            </a>
          </div>
        </div>
      </section>

      <Problem />
      <Transformation />
      <Showcase />
      <HumanControl />
      <UseCases />
      <Surprise />
      <HomeFaq />
      <CTABand />
    </>
  );
}
