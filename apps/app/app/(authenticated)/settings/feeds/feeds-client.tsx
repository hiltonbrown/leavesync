"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@repo/design-system/components/ui/accordion";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import { Card, CardContent } from "@repo/design-system/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import { toast } from "@repo/design-system/components/ui/sonner";
import {
  BellIcon,
  CalendarDaysIcon,
  CalendarPlusIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  LaptopIcon,
  Link2Icon,
  PauseIcon,
  PlusIcon,
  RssIcon,
  SmartphoneIcon,
  Trash2Icon,
} from "lucide-react";
import type React from "react";
import { useState } from "react";
import { SettingsComingSoon } from "../components/settings-coming-soon";
import { SettingsSectionHeader } from "../components/settings-section-header";

const HTTPS_TO_WEBCAL_RE = /^https:\/\//;

interface CalendarFeed {
  id: string;
  name: string;
  scope: string;
  status: "active" | "paused";
  type: "ics" | "html" | "both";
  url: string;
}

interface NotificationChannel {
  id: string;
  name: string;
  status: "active" | "error";
  target: string;
  type: "slack" | "teams" | "webhook";
}

interface FeedsClientProps {
  channels: NotificationChannel[];
  feeds: CalendarFeed[];
}

const CHANNEL_TYPE_META: Record<
  NotificationChannel["type"],
  { label: string; color: string }
> = {
  slack: {
    label: "Slack",
    color: "bg-[#4A154B]/10 text-[#4A154B] border-[#4A154B]/20",
  },
  teams: {
    label: "Teams",
    color: "bg-[#5059C9]/10 text-[#5059C9] border-[#5059C9]/20",
  },
  webhook: {
    label: "Webhook",
    color: "bg-muted text-muted-foreground border-border",
  },
};

// ─── iCal subscription section ───────────────────────────────────────────────

interface Step {
  highlight?: boolean;
  text: string;
}

interface Platform {
  icon: React.ReactNode;
  id: string;
  label: string;
  steps: Step[];
}

const PLATFORMS: Platform[] = [
  {
    id: "google",
    label: "Google Calendar",
    icon: <GlobeIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      {
        text: "Open Google Calendar — on desktop go to calendar.google.com, or open the mobile app.",
      },
      {
        text: 'In the left sidebar, find "Other calendars" and click the + icon next to it.',
      },
      { text: 'Select "From URL" from the dropdown menu.' },
      {
        text: "Paste the calendar feed URL from above into the field provided.",
        highlight: true,
      },
      {
        text: 'Click "Add calendar" to confirm. The feed will appear in your calendar within a few minutes.',
      },
      {
        text: "Google Calendar refreshes subscribed calendars automatically. New leave entries will appear as they are approved.",
      },
    ],
  },
  {
    id: "outlook",
    label: "Microsoft Outlook",
    icon: <CalendarDaysIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      {
        text: "Open Outlook and switch to the Calendar view using the icons in the bottom left.",
      },
      { text: 'Click "Add calendar" in the left-hand panel.' },
      { text: 'Select "Subscribe from web" from the options presented.' },
      {
        text: "Paste the calendar feed URL into the URL field.",
        highlight: true,
      },
      {
        text: 'Give the calendar a name such as "Team Leave" and set a colour if you like.',
      },
      {
        text: 'Click "Import". Outlook will sync the calendar and refresh it automatically every few hours.',
      },
    ],
  },
  {
    id: "apple",
    label: "Apple Calendar (Mac)",
    icon: <LaptopIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      { text: "Open the Calendar app on your Mac." },
      {
        text: 'From the menu bar at the top of your screen, click File then "New Calendar Subscription...".',
      },
      {
        text: "Paste the webcal:// or https:// feed URL into the field.",
        highlight: true,
      },
      { text: 'Click "Subscribe" to proceed to the settings screen.' },
      {
        text: 'Set a name like "Team Leave", choose how often to refresh (recommended: every hour), then click "OK".',
      },
      {
        text: "If you use iCloud, select iCloud as the location so the calendar syncs to your iPhone and iPad automatically.",
      },
    ],
  },
  {
    id: "phone",
    label: "iPhone or Android",
    icon: <SmartphoneIcon className="size-4" strokeWidth={1.75} />,
    steps: [
      {
        text: "iPhone: Open the Settings app, scroll down to Calendar, then tap Accounts, Add Account, Other, and finally Add Subscribed Calendar.",
      },
      {
        text: "Android: Open Google Calendar, tap your profile photo, select Manage calendars, then Add calendar and From URL.",
      },
      {
        text: "Paste the calendar feed URL into the server or URL field.",
        highlight: true,
      },
      { text: "Tap Subscribe, Next, or Save depending on your device." },
      {
        text: "The leave calendar will appear alongside your personal calendars and sync automatically.",
      },
    ],
  },
];

function SetupInstructions() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
          Setup guide
        </p>
        <h2 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
          How to subscribe
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">
          Step-by-step instructions for every major calendar application.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "var(--muted)" }}
      >
        <Accordion collapsible type="single">
          {PLATFORMS.map((platform) => (
            <AccordionItem
              className="border-b px-6 last:border-b-0"
              key={platform.id}
              value={platform.id}
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    style={{
                      background:
                        "color-mix(in srgb, var(--primary) 10%, transparent)",
                      color: "var(--primary)",
                    }}
                  >
                    {platform.icon}
                  </div>
                  <span className="font-medium text-[0.9375rem] text-foreground">
                    {platform.label}
                  </span>
                </div>
              </AccordionTrigger>

              <AccordionContent>
                <ol className="flex flex-col gap-3 pb-2">
                  {platform.steps.map((step, si) => (
                    <li className="flex items-start gap-3" key={step.text}>
                      <span
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-semibold text-[0.625rem]"
                        style={
                          step.highlight
                            ? {
                                background: "var(--primary)",
                                color: "var(--primary-foreground)",
                              }
                            : {
                                background:
                                  "color-mix(in srgb, var(--muted-foreground) 15%, transparent)",
                                color: "var(--muted-foreground)",
                              }
                        }
                      >
                        {si + 1}
                      </span>
                      <span className="text-[0.875rem] text-foreground leading-relaxed">
                        {step.text}
                      </span>
                    </li>
                  ))}
                </ol>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  );
}

function ICalSection({
  feedUrl,
  feedName,
}: {
  feedUrl: string;
  feedName: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  // Derive a webcal:// URL from the https:// URL if applicable
  const httpsUrl = feedUrl.startsWith("https://")
    ? feedUrl
    : "https://app.leavesync.com/api/feeds/calendar.ics";
  const webcalUrl = httpsUrl.replace(HTTPS_TO_WEBCAL_RE, "webcal://");

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const providers = [
    {
      key: "gmail",
      label: "Google Calendar",
      description: "Subscribe from URL",
      icon: <GlobeIcon className="size-5" strokeWidth={1.75} />,
      href: `https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(httpsUrl)}`,
      copyUrl: httpsUrl,
      actionLabel: "Open",
    },
    {
      key: "outlook",
      label: "Microsoft Outlook",
      description: "Subscribe from web",
      icon: <CalendarDaysIcon className="size-5" strokeWidth={1.75} />,
      href: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent(feedName)}`,
      copyUrl: httpsUrl,
      actionLabel: "Open",
    },
    {
      key: "apple",
      label: "Apple Calendar",
      description: "Opens with webcal://",
      icon: <LaptopIcon className="size-5" strokeWidth={1.75} />,
      href: webcalUrl,
      copyUrl: webcalUrl,
      actionLabel: "Subscribe",
    },
    {
      key: "ical",
      label: "Generic iCal",
      description: "Any calendar app",
      icon: <Link2Icon className="size-5" strokeWidth={1.75} />,
      href: httpsUrl,
      copyUrl: httpsUrl,
      actionLabel: "Open",
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
          Subscribe
        </p>
        <h2 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
          Add to your calendar
        </h2>
        <p className="mt-1 text-[0.875rem] text-muted-foreground">
          Subscribe to this feed so team leave automatically appears in your
          calendar app and stays up to date.
        </p>
      </div>

      {/* Feed URL bar */}
      <div
        className="flex items-center gap-3 rounded-xl p-4"
        style={{ background: "var(--muted)" }}
      >
        <code className="min-w-0 flex-1 truncate font-mono text-[0.8125rem] text-foreground">
          {httpsUrl}
        </code>
        <button
          className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium text-[0.75rem] transition-colors"
          onClick={() => copy(httpsUrl, "url-bar")}
          style={{ background: "var(--accent)", color: "var(--foreground)" }}
          type="button"
        >
          {copied === "url-bar" ? (
            <CheckIcon className="size-3.5" strokeWidth={2.5} />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
          {copied === "url-bar" ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Provider tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((p) => (
          <div
            className="flex flex-col gap-4 rounded-2xl p-5"
            key={p.key}
            style={{ background: "var(--muted)" }}
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background:
                  "color-mix(in srgb, var(--primary) 10%, transparent)",
                color: "var(--primary)",
              }}
            >
              {p.icon}
            </div>

            <div className="flex-1">
              <p className="font-semibold text-[0.9375rem] text-foreground">
                {p.label}
              </p>
              <p className="text-[0.75rem] text-muted-foreground">
                {p.description}
              </p>
            </div>

            <div className="flex gap-2">
              <a
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 font-medium text-[0.8125rem] transition-colors"
                href={p.href}
                rel="noopener noreferrer"
                style={{
                  background: "var(--primary)",
                  color: "var(--primary-foreground)",
                }}
                target="_blank"
              >
                <ExternalLinkIcon className="size-3" />
                {p.actionLabel}
              </a>
              <button
                className="flex items-center justify-center rounded-xl px-3 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                onClick={() => copy(p.copyUrl, p.key)}
                title="Copy URL"
                type="button"
              >
                {copied === p.key ? (
                  <CheckIcon
                    className="size-3.5"
                    strokeWidth={2.5}
                    style={{ color: "var(--primary)" }}
                  />
                ) : (
                  <CopyIcon className="size-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Add to calendar collapsible ─────────────────────────────────────────────

function AddToCalendarSection({ feeds }: { feeds: CalendarFeed[] }) {
  const [open, setOpen] = useState(false);

  // Use the first active ICS/both feed, falling back to the first feed
  const activeFeed =
    feeds.find((f) => f.status === "active" && f.type !== "html") ??
    feeds.find((f) => f.status === "active") ??
    feeds[0];

  if (!activeFeed) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <button
        className="flex items-center justify-between rounded-2xl px-5 py-4 font-medium text-[0.875rem] text-foreground transition-colors hover:bg-accent"
        onClick={() => setOpen((v) => !v)}
        style={{ background: "var(--muted)" }}
        type="button"
      >
        <div className="flex items-center gap-2.5">
          <CalendarPlusIcon
            className="size-4 text-muted-foreground"
            strokeWidth={1.75}
          />
          <span>Add to your calendar</span>
        </div>
        <ChevronDownIcon
          className="size-4 text-muted-foreground transition-transform duration-200"
          strokeWidth={1.75}
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-10 pt-6">
          <ICalSection feedName={activeFeed.name} feedUrl={activeFeed.url} />
          <SetupInstructions />
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export const FeedsClient = ({ feeds, channels }: FeedsClientProps) => {
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Feed URL copied to clipboard");
    });
  };

  return (
    <div className="space-y-8">
      <SettingsSectionHeader
        description="Manage calendar feeds and notification channels for your organisation."
        title="Feeds & Publishing"
      />

      {/* Calendar feeds */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Calendar feeds</h3>
            <p className="text-muted-foreground text-xs">
              Publish leave calendars as ICS subscriptions or HTML pages.
            </p>
          </div>
          <Button
            className="gap-1.5 text-xs"
            onClick={() => toast.info("Feed creation coming soon")}
            size="sm"
          >
            <PlusIcon className="h-3.5 w-3.5" strokeWidth={2} />
            Add feed
          </Button>
        </div>

        {feeds.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-muted/40 opacity-70">
            <CardContent className="p-0">
              <Empty className="border-0 bg-transparent py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RssIcon strokeWidth={1.75} />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">
                    No calendar feeds yet
                  </EmptyTitle>
                  <EmptyDescription>
                    Create a feed to publish leave calendars to your team's
                    calendar apps.
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  className="gap-1.5"
                  onClick={() => toast.info("Feed creation coming soon")}
                  size="sm"
                  variant="outline"
                >
                  <PlusIcon className="h-3.5 w-3.5" strokeWidth={2} />
                  Create your first feed
                </Button>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {feeds.map((feed) => (
              <Card className="rounded-2xl" key={feed.id}>
                <CardContent className="flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      {feed.type === "html" ? (
                        <GlobeIcon
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                      ) : (
                        <RssIcon
                          className="h-4 w-4 text-primary"
                          strokeWidth={1.75}
                        />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{feed.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {feed.scope}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      className={
                        feed.status === "active"
                          ? "border-primary/20 bg-primary/10 text-primary"
                          : "border-border bg-muted text-muted-foreground"
                      }
                      variant="outline"
                    >
                      {feed.status === "active" ? "Active" : "Paused"}
                    </Badge>
                    <Button
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => handleCopyUrl(feed.url)}
                      size="icon"
                      variant="ghost"
                    >
                      <CopyIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="sr-only">Copy URL</span>
                    </Button>
                    <Button
                      className="h-7 w-7 text-muted-foreground"
                      onClick={() => toast.info("Coming soon")}
                      size="icon"
                      variant="ghost"
                    >
                      <PauseIcon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="sr-only">Pause feed</span>
                    </Button>
                    <Button
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => toast.info("Coming soon")}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="sr-only">Delete feed</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Notification channels */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Notification channels</h3>
            <p className="text-muted-foreground text-xs">
              Send leave notifications to Slack, Teams, or custom webhooks.
            </p>
          </div>
          <Button
            className="gap-1.5 text-xs"
            onClick={() => toast.info("Channel creation coming soon")}
            size="sm"
            variant="outline"
          >
            <PlusIcon className="h-3.5 w-3.5" strokeWidth={2} />
            Add channel
          </Button>
        </div>

        {channels.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-muted/40 opacity-70">
            <CardContent className="p-0">
              <Empty className="border-0 bg-transparent py-10">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <BellIcon strokeWidth={1.75} />
                  </EmptyMedia>
                  <EmptyTitle className="text-base">
                    No channels configured
                  </EmptyTitle>
                  <EmptyDescription>
                    Add a Slack workspace, Teams channel, or webhook to receive
                    leave notifications.
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  className="gap-1.5"
                  onClick={() => toast.info("Channel creation coming soon")}
                  size="sm"
                  variant="outline"
                >
                  <PlusIcon className="h-3.5 w-3.5" strokeWidth={2} />
                  Add your first channel
                </Button>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {channels.map((ch) => {
              const meta = CHANNEL_TYPE_META[ch.type];
              return (
                <Card className="rounded-2xl" key={ch.id}>
                  <CardContent className="flex items-center justify-between gap-4 p-4">
                    <div className="flex items-center gap-3">
                      <Badge
                        className={`text-xs ${meta.color}`}
                        variant="outline"
                      >
                        {meta.label}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{ch.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {ch.target}
                        </p>
                      </div>
                    </div>
                    <Button
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => toast.info("Coming soon")}
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
                      <span className="sr-only">Remove channel</span>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <SettingsComingSoon feature="Notification rules" />

      {/* Add to your calendar */}
      {feeds.length > 0 && <AddToCalendarSection feeds={feeds} />}
    </div>
  );
};
