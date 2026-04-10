"use client";

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
  CopyIcon,
  GlobeIcon,
  PauseIcon,
  PlusIcon,
  RssIcon,
  Trash2Icon,
} from "lucide-react";
import { SettingsComingSoon } from "../components/settings-coming-soon";
import { SettingsSectionHeader } from "../components/settings-section-header";

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
    </div>
  );
};
