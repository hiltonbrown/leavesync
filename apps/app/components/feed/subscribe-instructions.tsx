import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";

const note =
  "You will need the subscribe URL from this page. Copy it when you create or rotate the feed's token; it is only shown once.";

const instructions = [
  {
    title: "Outlook desktop (Windows)",
    body: "Open File, then Account Settings. Choose Internet Calendars, select New, and paste the subscribe URL.",
  },
  {
    title: "Outlook on the web",
    body: "Open Calendar, choose Add calendar, then Subscribe from web. Paste the subscribe URL and save.",
  },
  {
    title: "Google Calendar",
    body: "Open Other calendars, choose From URL, paste the subscribe URL, and add the calendar.",
  },
  {
    title: "Apple Calendar (macOS)",
    body: "Choose File, then New Calendar Subscription. Paste the subscribe URL and confirm the refresh settings.",
  },
  {
    title: "Apple Calendar (iOS)",
    body: "Open Settings, then Calendar, Accounts, Add Account, Other, and Add Subscribed Calendar. Paste the subscribe URL.",
  },
  {
    title: "Generic ICS",
    body: "Most calendar applications support subscribing to an ICS URL. Paste the URL into your calendar app's subscribe-from-URL option.",
  },
];

export function SubscribeInstructions() {
  return (
    <section className="rounded-2xl bg-muted p-5">
      <div>
        <h2 className="font-semibold text-foreground text-title-md">
          How to subscribe
        </h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Calendar apps refresh subscribed feeds on their own schedule.
        </p>
      </div>
      <Accordion className="mt-4" collapsible type="single">
        {instructions.map((item) => (
          <AccordionItem key={item.title} value={item.title}>
            <AccordionTrigger>{item.title}</AccordionTrigger>
            <AccordionContent>
              <p>{item.body}</p>
              <p className="mt-2 text-muted-foreground">{note}</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
