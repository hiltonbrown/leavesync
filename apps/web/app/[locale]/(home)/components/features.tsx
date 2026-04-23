import type { Dictionary } from "@repo/internationalization";
import { CalendarDays, RefreshCw, Rss, UserCheck } from "lucide-react";

interface FeaturesProps {
  dictionary: Dictionary;
}

const icons = [RefreshCw, UserCheck, CalendarDays, Rss];

export const Features = ({ dictionary }: FeaturesProps) => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="max-w-xl text-left font-semibold text-3xl tracking-tight md:text-5xl">
              {dictionary.web.home.features.title}
            </h2>
            <p className="max-w-xl text-left text-lg text-muted-foreground leading-relaxed lg:max-w-lg">
              {dictionary.web.home.features.description}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dictionary.web.home.features.items.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <div
                className={[
                  "flex flex-col justify-between gap-8 rounded-2xl bg-muted p-6",
                  index === 0 ? "lg:col-span-2" : "",
                  index === 3 ? "lg:col-span-2" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                key={item.title}
              >
                <Icon className="h-7 w-7 text-primary" strokeWidth={1.5} />
                <div className="flex flex-col gap-2">
                  <h3 className="font-medium text-lg tracking-tight">
                    {item.title}
                  </h3>
                  <p className="max-w-sm text-base text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
