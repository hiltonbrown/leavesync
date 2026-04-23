import { Button } from "@repo/design-system/components/ui/button";
import type { Dictionary } from "@repo/internationalization";
import { MoveRight } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";

interface CTAProps {
  dictionary: Dictionary;
}

export const CTA = ({ dictionary }: CTAProps) => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="flex flex-col items-center gap-8 rounded-2xl bg-primary p-8 text-center lg:p-16">
        <div className="flex flex-col gap-3">
          <h3 className="max-w-xl font-semibold text-3xl text-primary-foreground tracking-tight md:text-5xl">
            {dictionary.web.home.cta.title}
          </h3>
          <p className="max-w-xl text-lg text-primary-foreground/80 leading-relaxed">
            {dictionary.web.home.cta.description}
          </p>
        </div>
        <div className="flex flex-row gap-4">
          <Button
            asChild
            className="gap-4 bg-white text-primary hover:bg-white/90"
            variant="outline"
          >
            <Link href="/contact">{dictionary.web.global.primaryCta}</Link>
          </Button>
          <Button
            asChild
            className="gap-4 border-white/30 text-white hover:bg-white/10"
            variant="outline"
          >
            <Link href={env.NEXT_PUBLIC_APP_URL}>
              {dictionary.web.global.secondaryCta}{" "}
              <MoveRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </div>
);
