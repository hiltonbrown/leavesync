"use client";

import {
  Avatar,
  AvatarFallback,
} from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import {
  CopyIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  RotateCwIcon,
  Trash2Icon,
} from "lucide-react";

type FeedStatus = "active" | "paused";

interface Person {
  id: string;
  initials: string;
  name: string;
}

interface PreviewEvent {
  date: string;
  id: string;
  maskedTitle: string;
  title: string;
  type: string;
}

interface Feed {
  activeTokenHint: null | string;
  createdAt: string;
  id: string;
  name: string;
  slug: string;
  status: FeedStatus;
  tokenCount: number;
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-green-600",
  "bg-pink-500",
  "bg-cyan-600",
  "bg-amber-500",
  "bg-teal-600",
];

const getAvatarColor = (name: string) => {
  const hash = name.charCodeAt(0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface FeedDetailClientProperties {
  readonly feed: Feed;
  readonly members: Person[];
  readonly previewEvents: PreviewEvent[];
}

const FeedDetailClient = ({
  feed,
  members,
  previewEvents,
}: FeedDetailClientProperties) => {
  const maskedUrl = feed.activeTokenHint
    ? `Token ending ${feed.activeTokenHint}`
    : "No active token";
  const activeTokenLabel = feed.activeTokenHint
    ? `Active, ending ${feed.activeTokenHint}`
    : "No active token";

  return (
    <>
      <DialogHeader className="mb-6">
        <DialogTitle>{feed.name}</DialogTitle>
        <DialogDescription>
          Feed slug: {feed.slug}. Plaintext feed tokens are only shown when a
          token is created or rotated.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              feed.status === "active" ? "bg-green-600" : "bg-amber-500"
            }`}
          />
          <span className="font-medium text-sm capitalize">{feed.status}</span>
        </div>

        <div className="space-y-2">
          <div className="font-medium text-sm">Subscription URL</div>
          <div className="flex gap-2">
            <Input
              className="rounded-lg font-mono text-xs"
              readOnly
              value={maskedUrl}
            />
            <Button
              disabled
              size="sm"
              title="Rotate the token to copy a fresh URL"
              variant="outline"
            >
              <CopyIcon className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-muted-foreground text-xs">
            Feed URLs use private tokens. LeaveSync stores only token hashes, so
            existing URLs cannot be revealed.
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-sm">Token status</div>
              <div className="mt-1 flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    feed.activeTokenHint
                      ? "bg-green-600"
                      : "bg-muted-foreground"
                  }`}
                />
                <span className="text-muted-foreground text-sm">
                  {activeTokenLabel}
                </span>
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                Created: {formatDate(feed.createdAt)}
              </div>
              <div className="mt-1 text-muted-foreground text-xs">
                Stored tokens: {feed.tokenCount}
              </div>
            </div>
            <Button disabled size="sm" variant="outline">
              <RotateCwIcon className="mr-1 h-4 w-4" />
              Rotate
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="font-medium text-sm">Members ({members.length})</div>
          {members.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No people match this feed scope.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((member) => (
                <div
                  className="flex items-center gap-2 rounded-full bg-muted px-3 py-1"
                  key={member.id}
                >
                  <Avatar className={`h-6 w-6 ${getAvatarColor(member.name)}`}>
                    <AvatarFallback className="font-semibold text-white text-xs">
                      {member.initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="font-medium text-sm">Preview</div>
          {previewEvents.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No published availability yet.
            </p>
          ) : (
            <Tabs className="w-full" defaultValue="named">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="named">Named</TabsTrigger>
                <TabsTrigger value="masked">Masked</TabsTrigger>
              </TabsList>
              <TabsContent className="mt-4 space-y-2" value="named">
                {previewEvents.map((event) => (
                  <PreviewRow
                    date={event.date}
                    key={`${event.id}-named`}
                    title={event.title}
                    type={event.type}
                  />
                ))}
              </TabsContent>
              <TabsContent className="mt-4 space-y-2" value="masked">
                {previewEvents.map((event) => (
                  <PreviewRow
                    date={event.date}
                    key={`${event.id}-masked`}
                    title={event.maskedTitle}
                    type={event.type}
                  />
                ))}
              </TabsContent>
            </Tabs>
          )}
        </div>

        <div className="flex gap-2 pt-4">
          <Button className="flex-1" disabled variant="outline">
            {feed.status === "active" ? (
              <>
                <PauseCircleIcon className="mr-2 h-4 w-4" />
                Pause
              </>
            ) : (
              <>
                <PlayCircleIcon className="mr-2 h-4 w-4" />
                Activate
              </>
            )}
          </Button>
          <Button disabled variant="destructive">
            <Trash2Icon className="mr-2 h-4 w-4" />
            Archive
          </Button>
        </div>
      </div>
    </>
  );
};

function PreviewRow({
  date,
  title,
  type,
}: {
  date: string;
  title: string;
  type: string;
}) {
  return (
    <div className="rounded-lg border p-3 text-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="font-medium">{title}</div>
          <div className="mt-1 text-muted-foreground text-xs">
            {formatDate(date)}
          </div>
        </div>
        <Badge className="ml-2 text-xs" variant="outline">
          {type}
        </Badge>
      </div>
    </div>
  );
}

export { FeedDetailClient };
