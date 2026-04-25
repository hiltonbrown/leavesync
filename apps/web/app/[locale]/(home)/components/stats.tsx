import type { Dictionary } from "@repo/internationalization";

interface StatsProps {
  dictionary: Dictionary;
}

export const Stats = ({ dictionary }: StatsProps) => (
  <div className="w-full py-20 lg:py-40">
    <div className="container mx-auto">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-4">
          <div className="flex flex-col gap-2">
            <h2 className="text-left font-semibold text-xl tracking-tight md:text-5xl lg:max-w-xl">
              {dictionary.web.home.stats.title}
            </h2>
            <p className="text-left text-lg text-muted-foreground leading-relaxed lg:max-w-sm">
              {dictionary.web.home.stats.description}
            </p>
          </div>
        </div>
        <div className="flex items-center justify-center">
          <div className="grid w-full grid-cols-2 gap-4 text-left">
            {dictionary.web.home.stats.items.map((item) => (
              <div
                className="flex flex-col justify-between gap-4 rounded-2xl bg-muted p-6"
                key={item.title}
              >
                <h2 className="font-semibold text-5xl text-primary tracking-tight">
                  {item.type === "currency" && "$"}
                  {new Intl.NumberFormat().format(
                    Number.parseFloat(item.metric)
                  )}
                </h2>
                <p className="text-base text-muted-foreground leading-snug">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);
