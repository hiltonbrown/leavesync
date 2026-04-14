"use client";

import { Avatar, AvatarFallback } from "@repo/design-system/components/ui/avatar";
import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { Input } from "@repo/design-system/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/design-system/components/ui/tabs";
import {
  CheckIcon,
  CopyIcon,
  PauseCircleIcon,
  PlayCircleIcon,
  RotateCwIcon,
  Trash2Icon,
} from "lucide-react";
import { useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type FeedStatus = "active" | "paused";

interface Person {
  dept: string;
  id: string;
  initials: string;
  name: string;
  role: string;
}

interface PreviewEvent {
  date: string;
  maskedTitle: string;
  personName: string;
  title: string;
  type: string;
}

interface Feed {
  createdAt: string;
  description: string;
  id: string;
  lastSynced: string;
  name: string;
  personIds: string[];
  status: FeedStatus;
  timezone: string;
  token: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const ALL_PEOPLE: Person[] = [
  {
    id: "p1",
    name: "Priya Sharma",
    initials: "PS",
    role: "Senior Engineer",
    dept: "Engineering",
  },
  {
    id: "p2",
    name: "Marcus Webb",
    initials: "MW",
    role: "Backend Engineer",
    dept: "Engineering",
  },
  {
    id: "p3",
    name: "Yuki Tanaka",
    initials: "YT",
    role: "Product Manager",
    dept: "Product",
  },
  {
    id: "p4",
    name: "Aisha Okonkwo",
    initials: "AO",
    role: "UI Designer",
    dept: "Design",
  },
  {
    id: "p5",
    name: "Tom Eriksson",
    initials: "TE",
    role: "Frontend Engineer",
    dept: "Engineering",
  },
  {
    id: "p6",
    name: "Sofia Reyes",
    initials: "SR",
    role: "Data Analyst",
    dept: "Product",
  },
  {
    id: "p7",
    name: "Elena Rossi",
    initials: "ER",
    role: "Product Marketing",
    dept: "Product",
  },
];

const INITIAL_FEEDS: Feed[] = [
  {
    id: "feed_1",
    name: "Engineering Team",
    description: "All leave for the engineering department",
    timezone: "Europe/London",
    status: "active",
    token: "org_k8s92j_eng",
    personIds: ["p1", "p2", "p5"],
    createdAt: "2026-01-15",
    lastSynced: "3 min ago",
  },
  {
    id: "feed_2",
    name: "Product & Design",
    description: "Leave calendar for product and design",
    timezone: "Europe/London",
    status: "active",
    token: "org_k8s92j_prd",
    personIds: ["p3", "p4", "p6", "p7"],
    createdAt: "2026-02-03",
    lastSynced: "12 min ago",
  },
  {
    id: "feed_3",
    name: "All Staff",
    description: "Company-wide leave feed for all employees",
    timezone: "Europe/London",
    status: "paused",
    token: "org_k8s92j_all",
    personIds: ["p1", "p2", "p3", "p4", "p5", "p6", "p7"],
    createdAt: "2025-11-20",
    lastSynced: "2 days ago",
  },
];

const PREVIEW_EVENTS: Record<string, PreviewEvent[]> = {
  feed_1: [
    {
      date: "2026-04-03",
      title: "Priya Sharma – Holiday Leave",
      maskedTitle: "Holiday Leave",
      personName: "Priya Sharma",
      type: "Holiday Leave",
    },
    {
      date: "2026-04-20",
      title: "Marcus Webb – Easter Break",
      maskedTitle: "Holiday Leave",
      personName: "Marcus Webb",
      type: "Holiday Leave",
    },
    {
      date: "2026-05-04",
      title: "Tom Eriksson – Training",
      maskedTitle: "Out of Office",
      personName: "Tom Eriksson",
      type: "Training",
    },
  ],
  feed_2: [
    {
      date: "2026-04-15",
      title: "Yuki Tanaka – Conference",
      maskedTitle: "Out of Office",
      personName: "Yuki Tanaka",
      type: "Travelling",
    },
    {
      date: "2026-04-20",
      title: "Aisha Okonkwo – Easter Break",
      maskedTitle: "Holiday Leave",
      personName: "Aisha Okonkwo",
      type: "Holiday Leave",
    },
    {
      date: "2026-06-22",
      title: "Sofia Reyes – Design Sprint",
      maskedTitle: "Out of Office",
      personName: "Sofia Reyes",
      type: "Working From Home",
    },
  ],
  feed_3: [
    {
      date: "2026-04-03",
      title: "Good Friday",
      maskedTitle: "Public Holiday",
      personName: "Holiday",
      type: "Public Holiday",
    },
    {
      date: "2026-04-06",
      title: "Easter Monday",
      maskedTitle: "Public Holiday",
      personName: "Holiday",
      type: "Public Holiday",
    },
    {
      date: "2026-04-20",
      title: "Multiple team members – Holiday Leave",
      maskedTitle: "Holiday Leave",
      personName: "Team",
      type: "Holiday Leave",
    },
    {
      date: "2026-05-25",
      title: "Spring Bank Holiday",
      maskedTitle: "Public Holiday",
      personName: "Holiday",
      type: "Public Holiday",
    },
    {
      date: "2026-12-25",
      title: "Christmas Day",
      maskedTitle: "Public Holiday",
      personName: "Holiday",
      type: "Public Holiday",
    },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-cyan-500",
];

const getAvatarColor = (name: string) => {
  const hash = name.charCodeAt(0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const feedUrl = (token: string): string =>
  `https://app.leavesync.com/api/feeds/${token}/calendar.ics`;

const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

interface FeedDetailClientProperties {
  readonly feedId: string;
}

const FeedDetailClient = ({ feedId }: FeedDetailClientProperties) => {
  const feed = INITIAL_FEEDS.find((f) => f.id === feedId) ?? INITIAL_FEEDS[0];
  const members = ALL_PEOPLE.filter((p) => feed.personIds.includes(p.id));
  const preview = PREVIEW_EVENTS[feed.id] || [];

  const [showUrl, setShowUrl] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(feedUrl(feed.token));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const url = feedUrl(feed.token);
  const maskedUrl = "••••••••••••••••••••••••";

  return (
    <>
      <DialogHeader className="mb-6">
        <DialogTitle>{feed.name}</DialogTitle>
        <DialogDescription>{feed.description}</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Status badge */}
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              feed.status === "active" ? "bg-green-500" : "bg-amber-500"
            }`}
          />
          <span className="text-sm font-medium capitalize">{feed.status}</span>
        </div>

        {/* Subscription URL */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Subscription URL</label>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setShowUrl(!showUrl)}
              className="text-xs"
            >
              {showUrl ? "Hide" : "Show"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              readOnly
              value={showUrl ? url : maskedUrl}
              className="font-mono text-xs rounded-lg"
            />
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Token status */}
        <div className="rounded-lg border p-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-medium">Token status</div>
              <div className="flex items-center gap-2 mt-1">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="text-sm text-green-600">Active</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Last rotated: {formatDate(feed.createdAt)}
              </div>
            </div>
            <Button size="sm" variant="outline">
              <RotateCwIcon className="h-4 w-4 mr-1" />
              Rotate
            </Button>
          </div>
        </div>

        {/* Members */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Members ({members.length})</label>
          <div className="flex flex-wrap gap-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-2 rounded-full bg-muted px-3 py-1"
              >
                <Avatar className={`h-6 w-6 ${getAvatarColor(member.name)}`}>
                  <AvatarFallback className="text-xs font-semibold text-white">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">{member.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Preview tabs */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Preview</label>
          <Tabs defaultValue="named" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="named">Named</TabsTrigger>
              <TabsTrigger value="masked">Masked</TabsTrigger>
            </TabsList>
            <TabsContent value="named" className="space-y-2 mt-4">
              {preview.map((event, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{event.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(event.date)}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
            <TabsContent value="masked" className="space-y-2 mt-4">
              {preview.map((event, i) => (
                <div key={i} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{event.maskedTitle}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(event.date)}
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs">
                      {event.type}
                    </Badge>
                  </div>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </div>

        {/* Actions footer */}
        <div className="flex gap-2 pt-4">
          <Button variant="outline" className="flex-1">
            {feed.status === "active" ? (
              <>
                <PauseCircleIcon className="h-4 w-4 mr-2" />
                Pause
              </>
            ) : (
              <>
                <PlayCircleIcon className="h-4 w-4 mr-2" />
                Activate
              </>
            )}
          </Button>
          <Button variant="destructive">
            <Trash2Icon className="h-4 w-4 mr-2" />
            Archive
          </Button>
        </div>
      </div>
    </>
  );
};

export { FeedDetailClient };
