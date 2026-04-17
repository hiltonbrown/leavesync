"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/design-system/components/ui/select";
import { toast } from "@repo/design-system/components/ui/sonner";
import {
  ArchiveIcon,
  CopyIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RotateCwIcon,
  RssIcon,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import {
  createFeedAction,
  rotateFeedTokenAction,
  setFeedStatusAction,
} from "@/app/actions/feeds/manage";

type FeedStatus = "active" | "archived" | "paused";

interface Feed {
  activeTokenHint: string | null;
  createdAt: Date;
  id: string;
  name: string;
  privacyDefault: string;
  scopeType: string;
  slug: string;
  status: string;
  updatedAt: Date;
}

interface Person {
  id: string;
}

interface FeedClientProps {
  initialFeeds: Feed[];
  organisationId: string;
  people: Person[];
}

export function FeedClient({
  initialFeeds,
  organisationId,
  people,
}: FeedClientProps) {
  const [feeds, setFeeds] = useState(initialFeeds);
  const [createOpen, setCreateOpen] = useState(false);
  const [revealedTokens, setRevealedTokens] = useState<Record<string, string>>(
    {}
  );
  const [isPending, startTransition] = useTransition();

  const activeCount = feeds.filter((feed) => feed.status === "active").length;
  const pausedCount = feeds.filter((feed) => feed.status === "paused").length;

  const sortedFeeds = useMemo(
    () => [...feeds].sort((a, b) => a.name.localeCompare(b.name)),
    [feeds]
  );

  const handleStatus = (feedId: string, status: FeedStatus) => {
    startTransition(async () => {
      const result = await setFeedStatusAction({
        feedId,
        organisationId,
        status,
      });
      if (!(result.ok && result.feed)) {
        toast.error(result.ok ? "Feed was not updated" : result.error);
        return;
      }

      if (status === "archived") {
        setFeeds((current) => current.filter((feed) => feed.id !== feedId));
      } else {
        setFeeds((current) =>
          current.map((feed) =>
            feed.id === feedId ? { ...feed, ...result.feed } : feed
          )
        );
      }
      toast.success(status === "active" ? "Feed resumed" : "Feed updated");
    });
  };

  const handleRotate = (feedId: string) => {
    startTransition(async () => {
      const result = await rotateFeedTokenAction({ feedId, organisationId });
      if (!(result.ok && result.feed && result.token)) {
        toast.error(result.ok ? "Feed token was not rotated" : result.error);
        return;
      }

      setFeeds((current) =>
        current.map((feed) =>
          feed.id === feedId ? { ...feed, ...result.feed } : feed
        )
      );
      const newToken = result.token;
      setRevealedTokens((current) => ({
        ...current,
        [feedId]: newToken,
      }));
      toast.success("New feed URL ready to copy");
    });
  };

  const handleCopy = async (feedId: string) => {
    const token = revealedTokens[feedId];
    if (!token) {
      toast.info("Rotate the token to reveal a fresh feed URL.");
      return;
    }

    await navigator.clipboard.writeText(feedUrl(token));
    toast.success("Feed URL copied");
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
            Calendar feeds
          </p>
          <h1 className="mt-0.5 font-semibold text-[1.375rem] text-foreground tracking-tight">
            Feeds
          </h1>
          <p className="mt-1 text-[0.875rem] text-muted-foreground">
            Publish manual availability and approved leave as iCal feeds.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          New feed
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Total feeds" value={feeds.length} />
        <Stat label="Active" value={activeCount} />
        <Stat label="Paused" value={pausedCount} />
      </div>

      {sortedFeeds.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl bg-muted py-20 text-center">
          <RssIcon className="size-8 text-muted-foreground" strokeWidth={1.5} />
          <div>
            <p className="font-semibold text-foreground text-title-md">
              No feeds yet
            </p>
            <p className="mt-1 text-muted-foreground text-sm">
              Create a feed to publish availability to calendar apps.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Create your first feed
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {sortedFeeds.map((feed) => (
            <article className="rounded-2xl bg-muted p-5" key={feed.id}>
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-foreground">{feed.name}</p>
                    <p className="mt-1 text-muted-foreground text-sm">
                      {feed.scopeType.replaceAll("_", " ")} ·{" "}
                      {feed.privacyDefault} privacy · {people.length} people
                    </p>
                  </div>
                  <StatusBadge status={feed.status} />
                </div>

                <div className="rounded-2xl bg-background p-3 text-muted-foreground text-sm">
                  {revealedTokens[feed.id]
                    ? feedUrl(revealedTokens[feed.id])
                    : `Token ending ${feed.activeTokenHint ?? "unknown"}. Rotate to reveal a new URL.`}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={isPending}
                    onClick={() => handleCopy(feed.id)}
                    size="sm"
                    variant="secondary"
                  >
                    <CopyIcon className="mr-2 size-4" />
                    Copy URL
                  </Button>
                  <Button
                    disabled={isPending}
                    onClick={() => handleRotate(feed.id)}
                    size="sm"
                    variant="secondary"
                  >
                    <RotateCwIcon className="mr-2 size-4" />
                    Rotate token
                  </Button>
                  {feed.status === "active" ? (
                    <Button
                      disabled={isPending}
                      onClick={() => handleStatus(feed.id, "paused")}
                      size="sm"
                      variant="ghost"
                    >
                      <PauseIcon className="mr-2 size-4" />
                      Pause
                    </Button>
                  ) : (
                    <Button
                      disabled={isPending}
                      onClick={() => handleStatus(feed.id, "active")}
                      size="sm"
                      variant="ghost"
                    >
                      <PlayIcon className="mr-2 size-4" />
                      Resume
                    </Button>
                  )}
                  <Button
                    disabled={isPending}
                    onClick={() => handleStatus(feed.id, "archived")}
                    size="sm"
                    variant="ghost"
                  >
                    <ArchiveIcon className="mr-2 size-4" />
                    Archive
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <CreateFeedDialog
        onCreated={(feed, token) => {
          setFeeds((current) => [feed, ...current]);
          setRevealedTokens((current) => ({ ...current, [feed.id]: token }));
          setCreateOpen(false);
        }}
        onOpenChange={setCreateOpen}
        open={createOpen}
        organisationId={organisationId}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-muted p-5">
      <p className="font-medium text-[0.6875rem] text-muted-foreground uppercase tracking-widest">
        {label}
      </p>
      <p className="mt-2 font-semibold text-foreground text-headline-sm">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = getFeedStatusLabel(status);
  return (
    <span className="rounded-full bg-background px-3 py-1 font-medium text-[0.75rem] text-muted-foreground">
      {label}
    </span>
  );
}

function getFeedStatusLabel(status: string): string {
  if (status === "active") {
    return "Active";
  }
  if (status === "paused") {
    return "Paused";
  }
  return status;
}

function CreateFeedDialog({
  organisationId,
  onCreated,
  onOpenChange,
  open,
}: {
  organisationId: string;
  onCreated: (feed: Feed, token: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [privacyDefault, setPrivacyDefault] = useState<
    "masked" | "named" | "private"
  >("named");

  const handleCreate = (formData: FormData) => {
    startTransition(async () => {
      const result = await createFeedAction({
        name: String(formData.get("name") ?? ""),
        organisationId,
        privacyDefault,
        scopeType: "all_staff",
      });

      if (!(result.ok && result.feed && result.token)) {
        toast.error(result.ok ? "Feed was not created" : result.error);
        return;
      }

      toast.success("Feed created");
      onCreated(
        {
          ...result.feed,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        result.token
      );
    });
  };

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New feed</DialogTitle>
          <DialogDescription>
            Create an organisation-wide feed for manual availability and
            approved leave.
          </DialogDescription>
        </DialogHeader>
        <form action={handleCreate} className="space-y-5">
          <div className="space-y-2">
            <Label>Feed name</Label>
            <Input name="name" placeholder="Team availability" required />
          </div>
          <div className="space-y-2">
            <Label>Default privacy</Label>
            <Select
              onValueChange={(value) =>
                setPrivacyDefault(normalisePrivacy(value))
              }
              value={privacyDefault}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="named">Show details</SelectItem>
                <SelectItem value="masked">Mask details</SelectItem>
                <SelectItem value="private">Private busy block</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button disabled={isPending} type="submit">
              {isPending ? "Creating..." : "Create feed"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function feedUrl(token: string): string {
  return `https://app.leavesync.com/api/feeds/${token}/calendar.ics`;
}

function normalisePrivacy(value: string): "masked" | "named" | "private" {
  if (value === "masked" || value === "named" || value === "private") {
    return value;
  }

  return "named";
}
