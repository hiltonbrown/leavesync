"use client";

import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@repo/design-system/components/ui/carousel";
import type { Dictionary } from "@repo/internationalization";
import { useEffect, useState } from "react";

interface TestimonialsProps {
  dictionary: Dictionary;
}

export const Testimonials = ({ dictionary }: TestimonialsProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) {
      return;
    }

    const timer = setTimeout(() => {
      if (api.selectedScrollSnap() + 1 === api.scrollSnapList().length) {
        setCurrent(0);
        api.scrollTo(0);
      } else {
        api.scrollNext();
        setCurrent(current + 1);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [api, current]);

  return (
    <div className="w-full py-20 lg:py-40">
      <div className="container mx-auto">
        <div className="flex flex-col gap-10">
          <h2 className="text-left font-semibold text-3xl tracking-tight md:text-5xl lg:max-w-xl">
            {dictionary.web.home.testimonials.title}
          </h2>
          <Carousel className="w-full" setApi={setApi}>
            <CarouselContent>
              {dictionary.web.home.testimonials.items.map((item) => (
                <CarouselItem className="lg:basis-1/2" key={item.title}>
                  <div className="flex h-full flex-col justify-between gap-6 rounded-2xl bg-muted p-6">
                    <blockquote className="text-base text-muted-foreground leading-relaxed">
                      &ldquo;{item.description}&rdquo;
                    </blockquote>
                    <div className="flex flex-col gap-1">
                      <p className="font-medium text-sm">{item.author.name}</p>
                      <p className="text-muted-foreground text-xs">
                        LeaveSync customer
                      </p>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </div>
  );
};
