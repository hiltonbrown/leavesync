import { Button } from "@repo/design-system/components/ui/button";
import type { Dictionary } from "@repo/internationalization";
import { MoveRight } from "lucide-react";
import Link from "next/link";
import { env } from "@/env";

interface HeroProps {
  dictionary: Dictionary;
}

export const Hero = ({ dictionary }: HeroProps) => (
  <div className="w-full">
    <div className="container mx-auto">
      <div className="flex flex-col items-center justify-center gap-8 py-20 lg:py-40">
        <div>
          <Button asChild className="gap-4 rounded-full" size="sm" variant="secondary">
            <Link href="/integrations/xero">
              {dictionary.web.home.hero.announcement}
              <MoveRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-col gap-4">
          <h1 className="max-w-3xl text-center font-semibold text-5xl tracking-tight md:text-7xl">
            {dictionary.web.home.meta.title}
          </h1>
          <p className="max-w-2xl text-center text-lg text-muted-foreground leading-relaxed md:text-xl">
            {dictionary.web.home.meta.description}
          </p>
        </div>
        <div className="flex flex-row gap-3">
          <Button asChild className="gap-4" size="lg" variant="outline">
            <Link href="/features">Explore features</Link>
          </Button>
          <Button asChild className="gap-4" size="lg">
            <Link href={env.NEXT_PUBLIC_APP_URL ?? "/"}>
              Get started <MoveRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  </div>
);
