"use client";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/design-system/components/ui/alert-dialog";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  ArchiveIcon,
  CheckIcon,
  CopyIcon,
  PauseIcon,
  PlayIcon,
  RotateCcwIcon,
  RotateCwIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  archiveFeedAction,
  pauseFeedAction,
  restoreFeedAction,
  resumeFeedAction,
  rotateTokenAction,
} from "@/app/(authenticated)/feeds/_actions";
import {
  buildSubscribeUrl,
  useFeedTokenSession,
} from "@/app/(authenticated)/feeds/feed-token-session";
import { statusToneClasses } from "@/components/availability/availability-status";
import { withOrg } from "@/lib/navigation/org-url";

export interface FeedTableItem {
  activeTokenHint: { hint: string; lastUsedAt: Date | null } | null;
  createdAt: Date;
  description: string | null;
  id: string;
  includesPublicHolidays: boolean;
  lastRenderedAt: Date | null;
  name: string;
  privacyMode: "masked" | "named" | "private";
  scopeCount: number;
  scopeSummary: string;
  status: "active" | "archived" | "paused";
}

export function FeedTable({
  canManage,
  feeds,
  orgQueryValue,
  organisationId,
}: {
  canManage: boolean;
  feeds: FeedTableItem[];
  orgQueryValue: string | null;
  organisationId: string;
}) {
  const router = useRouter();
  const [copiedFeedId, setCopiedFeedId] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    action: "archive" | "rotate";
    feed: FeedTableItem;
  } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{
    text: string;
    tone: "error" | "status";
  } | null>(null);
  const tokenSession = useFeedTokenSession();

  const copy = async (feedId: string) => {
    const plaintext = tokenSession.tokenForFeed(feedId);
    if (!plaintext) {
      router.push(withOrg(`/feeds/${feedId}?panel=rotate`, orgQueryValue));
      return;
    }
    try {
      await navigator.clipboard.writeText(
        buildSubscribeUrl(tokenSession.origin, plaintext)
      );
      setCopiedFeedId(feedId);
      setMessage({ text: "Subscribe URL copied.", tone: "status" });
      window.setTimeout(() => setCopiedFeedId(null), 2000);
    } catch {
      setMessage({
        text: "Could not copy the subscribe URL. Open the feed and copy it manually.",
        tone: "error",
      });
    }
  };

  const rotate = (feedId: string) => {
    startTransition(async () => {
      const result = await rotateTokenAction({ feedId, organisationId });
      if (!result.ok) {
        setMessage({ text: result.error.message, tone: "error" });
        return;
      }
      tokenSession.setToken(feedId, result.value.plaintext);
      setMessage({ text: "Feed token rotated.", tone: "status" });
      setConfirmation(null);
      router.refresh();
    });
  };

  const transition = (
    action: "archive" | "pause" | "restore" | "resume",
    feed: FeedTableItem
  ) => {
    if (action === "archive" && confirmation?.feed.id !== feed.id) {
      setConfirmation({ action, feed });
      return;
    }
    startTransition(async () => {
      const input = { feedId: feed.id, organisationId };
      const result = await runFeedTransition(action, input);
      if (!result.ok) {
        setMessage({ text: result.error.message, tone: "error" });
        return;
      }
      setMessage({
        text: transitionSuccessMessage(action),
        tone: "status",
      });
      setConfirmation(null);
      router.refresh();
    });
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-muted">
      {message && !confirmation ? (
        <p
          aria-live={message.tone === "error" ? "assertive" : "polite"}
          className="m-3 rounded-2xl bg-background p-3 text-sm"
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
      <AlertDialog
        onOpenChange={(open) => {
          if (!(open || isPending)) {
            setConfirmation(null);
          }
        }}
        open={confirmation !== null}
      >
        {confirmation ? (
          <AlertDialogContent aria-busy={isPending}>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {confirmation.action === "rotate"
                  ? "Rotate this feed token?"
                  : `Archive ${confirmation.feed.name}?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {confirmation.action === "rotate"
                  ? "Rotating the token invalidates the current subscribe URL. Subscribers will need the new URL to continue syncing."
                  : "Archiving this feed stops it from publishing and revokes its tokens. Existing subscribers will see a stopped calendar. You can restore the feed from the Archived filter, but its tokens must be recreated."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {message?.tone === "error" ? (
              <p className="text-destructive text-sm" role="alert">
                {message.text}
              </p>
            ) : null}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
              <Button
                disabled={isPending}
                onClick={() =>
                  confirmation.action === "rotate"
                    ? rotate(confirmation.feed.id)
                    : transition("archive", confirmation.feed)
                }
                type="button"
                variant="destructive"
              >
                {confirmation.action === "rotate" ? "Rotate" : "Archive feed"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
      <div className="grid gap-4 p-4 text-muted-foreground text-sm lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_1fr]">
        <span>Feed</span>
        <span>Status</span>
        <span>Privacy</span>
        <span>Scope</span>
        <span>Token</span>
      </div>
      <div className="space-y-3 p-3 pt-0">
        {feeds.map((feed) => (
          <article className="rounded-2xl bg-background p-4" key={feed.id}>
            <div className="grid items-start gap-4 lg:grid-cols-[1.4fr_0.7fr_0.7fr_0.7fr_1fr]">
              <div>
                <Link
                  className="font-semibold text-foreground hover:text-primary"
                  href={withOrg(`/feeds/${feed.id}`, orgQueryValue)}
                >
                  {feed.name}
                </Link>
                {feed.description ? (
                  <p className="mt-1 text-muted-foreground text-sm">
                    {feed.description}
                  </p>
                ) : null}
              </div>
              <StatusDot status={feed.status} />
              <Badge variant="secondary">
                {privacyLabel(feed.privacyMode)}
              </Badge>
              <span className="text-sm">{feed.scopeSummary}</span>
              <div className="text-sm">
                <div>
                  {feed.activeTokenHint
                    ? `xxxx${feed.activeTokenHint.hint}`
                    : "No active token"}
                </div>
                <div className="text-muted-foreground text-xs">
                  {feed.activeTokenHint?.lastUsedAt
                    ? `Used ${formatRelative(feed.activeTokenHint.lastUsedAt)}`
                    : "Never used"}
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => copy(feed.id)}
                size="sm"
                title="Rotate the token to get a fresh subscribe URL. Subscribe URLs are only shown when a token is created or rotated."
                type="button"
                variant="secondary"
              >
                {copiedFeedId === feed.id ? (
                  <CheckIcon className="mr-2 size-4" />
                ) : (
                  <CopyIcon className="mr-2 size-4" />
                )}
                {copiedFeedId === feed.id ? "Copied" : "Copy URL"}
              </Button>
              {canManage ? (
                <>
                  <Button
                    disabled={isPending}
                    onClick={() => setConfirmation({ action: "rotate", feed })}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <RotateCwIcon className="mr-2 size-4" />
                    Rotate token
                  </Button>
                  <FeedStatusActionButton
                    feed={feed}
                    isPending={isPending}
                    onTransition={transition}
                  />
                  <Button
                    disabled={isPending || feed.status === "archived"}
                    onClick={() => transition("archive", feed)}
                    size="sm"
                    type="button"
                    variant="destructive"
                  >
                    <ArchiveIcon className="mr-2 size-4" />
                    Archive
                  </Button>
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function FeedStatusActionButton({
  feed,
  isPending,
  onTransition,
}: {
  feed: FeedTableItem;
  isPending: boolean;
  onTransition: (
    action: "archive" | "pause" | "restore" | "resume",
    feed: FeedTableItem
  ) => void;
}) {
  if (feed.status === "active") {
    return (
      <Button
        disabled={isPending}
        onClick={() => onTransition("pause", feed)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <PauseIcon className="mr-2 size-4" />
        Pause
      </Button>
    );
  }
  if (feed.status === "archived") {
    return (
      <Button
        disabled={isPending}
        onClick={() => onTransition("restore", feed)}
        size="sm"
        type="button"
        variant="secondary"
      >
        <RotateCcwIcon className="mr-2 size-4" />
        Restore
      </Button>
    );
  }
  return (
    <Button
      disabled={isPending}
      onClick={() => onTransition("resume", feed)}
      size="sm"
      type="button"
      variant="ghost"
    >
      <PlayIcon className="mr-2 size-4" />
      Resume
    </Button>
  );
}

function runFeedTransition(
  action: "archive" | "pause" | "restore" | "resume",
  input: { feedId: string; organisationId: string }
) {
  if (action === "archive") {
    return archiveFeedAction(input);
  }
  if (action === "pause") {
    return pauseFeedAction(input);
  }
  if (action === "restore") {
    return restoreFeedAction(input);
  }
  return resumeFeedAction(input);
}

function transitionSuccessMessage(
  action: "archive" | "pause" | "restore" | "resume"
): string {
  if (action === "archive") {
    return "Feed archived.";
  }
  if (action === "pause") {
    return "Feed paused.";
  }
  if (action === "restore") {
    return "Feed restored in a paused state. Create a new token before publishing.";
  }
  return "Feed resumed.";
}

function StatusDot({ status }: { status: FeedTableItem["status"] }) {
  let colour = statusToneClasses.private;
  if (status === "active") {
    colour = statusToneClasses.leave;
  } else if (status === "paused") {
    colour = statusToneClasses.holiday;
  }
  return (
    <span className="flex items-center gap-2 text-sm capitalize">
      <span className={`size-2 rounded-full ring-2 ${colour}`} />
      {status}
    </span>
  );
}

function privacyLabel(value: FeedTableItem["privacyMode"]): string {
  if (value === "named") {
    return "Named";
  }
  if (value === "masked") {
    return "Masked";
  }
  return "Private";
}

function formatRelative(date: Date): string {
  const seconds = Math.max(1, Math.round((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) {
    return `${seconds} seconds ago`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours} hours ago`;
  }
  return `${Math.round(hours / 24)} days ago`;
}
