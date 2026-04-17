import "server-only";

import { createHash, randomBytes } from "node:crypto";
import {
  appError,
  type ClerkOrgId,
  type OrganisationId,
  type Result,
} from "@repo/core";
import { database, scopedQuery } from "@repo/database";
import ical, { ICalEventTransparency } from "ical-generator";
import { z } from "zod";

export interface FeedTenantContext {
  clerkOrgId: ClerkOrgId;
  organisationId: OrganisationId;
}

export interface FeedView {
  activeTokenHint: string | null;
  id: string;
  name: string;
  privacyDefault: string;
  scopeType: string;
  slug: string;
  status: string;
}

export interface RenderedFeed {
  body: string;
  etag: string;
  status: "active" | "expired" | "revoked";
}

const FeedInputSchema = z.object({
  name: z.string().min(1).max(120),
  privacyDefault: z.enum(["named", "masked", "private"]).default("named"),
  scopeType: z
    .enum(["all_staff", "team", "manager", "location", "event_type", "custom"])
    .default("all_staff"),
});

const slugify = (value: string): string => {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.length > 0 ? slug : "feed";
};

const createRawToken = (): string => randomBytes(32).toString("base64url");

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const createEtag = (body: string): string =>
  createHash("sha256").update(body).digest("hex");

const mapFeed = (feed: {
  id: string;
  name: string;
  privacy_default: string;
  scope_type: string;
  slug: string;
  status: string;
  tokens?: { token_hint: string; status: string }[];
}): FeedView => ({
  activeTokenHint:
    feed.tokens?.find((token) => token.status === "active")?.token_hint ?? null,
  id: feed.id,
  name: feed.name,
  privacyDefault: feed.privacy_default,
  scopeType: feed.scope_type,
  slug: feed.slug,
  status: feed.status,
});

const makeUniqueSlug = async (
  tenant: FeedTenantContext,
  name: string
): Promise<string> => {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (
    await database.feed.findFirst({
      where: {
        ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
        slug,
      },
    })
  ) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
};

export const listFeeds = async (
  tenant: FeedTenantContext
): Promise<FeedView[]> => {
  const feeds = await database.feed.findMany({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      status: { not: "archived" },
    },
    include: {
      tokens: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
    orderBy: { created_at: "asc" },
  });

  return feeds.map(mapFeed);
};

export const createFeed = async (
  tenant: FeedTenantContext,
  input: unknown
): Promise<Result<{ feed: FeedView; token: string }>> => {
  const parsed = FeedInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: appError(
        "bad_request",
        parsed.error.issues[0]?.message ?? "Invalid feed"
      ),
    };
  }

  const rawToken = createRawToken();
  const slug = await makeUniqueSlug(tenant, parsed.data.name);

  const feed = await database.feed.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      name: parsed.data.name,
      organisation_id: tenant.organisationId,
      privacy_default: parsed.data.privacyDefault,
      scope_type: parsed.data.scopeType,
      slug,
      scopes: {
        create: {
          clerk_org_id: tenant.clerkOrgId,
          rule_type: "organisation",
          rule_value: tenant.organisationId,
        },
      },
      tokens: {
        create: {
          clerk_org_id: tenant.clerkOrgId,
          token_hash: hashToken(rawToken),
          token_hint: rawToken.slice(-4),
        },
      },
    },
    include: {
      tokens: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  return { ok: true, value: { feed: mapFeed(feed), token: rawToken } };
};

export const setFeedStatus = async (
  tenant: FeedTenantContext,
  feed_id: string,
  status: "active" | "archived" | "paused"
): Promise<Result<FeedView>> => {
  const existing = await database.feed.findFirst({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      id: feed_id,
    },
  });

  if (!existing) {
    return { ok: false, error: appError("not_found", "Feed not found") };
  }

  const feed = await database.feed.update({
    where: { id: feed_id },
    data: { status },
    include: {
      tokens: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  return { ok: true, value: mapFeed(feed) };
};

export const rotateFeedToken = async (
  tenant: FeedTenantContext,
  feed_id: string
): Promise<Result<{ feed: FeedView; token: string }>> => {
  const feed = await database.feed.findFirst({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
      id: feed_id,
    },
    include: {
      tokens: {
        where: { status: "active" },
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  if (!feed) {
    return { ok: false, error: appError("not_found", "Feed not found") };
  }

  const rawToken = createRawToken();
  const currentToken = feed.tokens[0] ?? null;

  if (currentToken) {
    await database.feedToken.update({
      where: { id: currentToken.id },
      data: { revoked_at: new Date(), status: "revoked" },
    });
  }

  await database.feedToken.create({
    data: {
      clerk_org_id: tenant.clerkOrgId,
      feed_id,
      token_hash: hashToken(rawToken),
      token_hint: rawToken.slice(-4),
    },
  });

  const updatedFeed = await database.feed.findUniqueOrThrow({
    where: { id: feed_id },
    include: {
      tokens: {
        orderBy: { created_at: "desc" },
        take: 1,
      },
    },
  });

  return { ok: true, value: { feed: mapFeed(updatedFeed), token: rawToken } };
};

export const revokeAllFeedTokens = async (
  tenant: FeedTenantContext
): Promise<Result<{ revokedCount: number }>> => {
  const activeFeeds = await database.feed.findMany({
    where: {
      ...scopedQuery(tenant.clerkOrgId, tenant.organisationId),
    },
    select: { id: true },
  });

  if (activeFeeds.length === 0) {
    return { ok: true, value: { revokedCount: 0 } };
  }

  const result = await database.feedToken.updateMany({
    where: {
      clerk_org_id: tenant.clerkOrgId,
      feed_id: { in: activeFeeds.map((feed) => feed.id) },
      status: "active",
    },
    data: {
      revoked_at: new Date(),
      status: "revoked",
    },
  });

  return { ok: true, value: { revokedCount: result.count } };
};

const buildSummary = (record: {
  person: {
    display_name: string | null;
    first_name: string;
    last_name: string;
  };
  privacy_mode: string;
  title: string | null;
}): string => {
  if (record.privacy_mode === "private") {
    return "Busy";
  }
  if (record.privacy_mode === "masked") {
    return "Out of office";
  }
  const displayName =
    record.person.display_name ||
    `${record.person.first_name} ${record.person.last_name}`;
  return `${displayName}: ${record.title || ""}`;
};

export const renderFeedForToken = async (
  token: string
): Promise<Result<RenderedFeed>> => {
  const feedToken = await database.feedToken.findUnique({
    where: { token_hash: hashToken(token) },
    include: { feed: true },
  });

  if (!feedToken) {
    return { ok: false, error: appError("not_found", "Feed not found") };
  }

  if (feedToken.status !== "active") {
    return {
      ok: true,
      value: { body: "", etag: "", status: feedToken.status },
    };
  }

  if (feedToken.expires_at && feedToken.expires_at < new Date()) {
    await database.feedToken.update({
      where: { id: feedToken.id },
      data: { status: "expired" },
    });
    return { ok: true, value: { body: "", etag: "", status: "expired" } };
  }

  if (feedToken.feed.status !== "active") {
    return { ok: false, error: appError("not_found", "Feed not found") };
  }

  if (!feedToken.feed.organisation_id) {
    return { ok: false, error: appError("not_found", "Feed not found") };
  }

  const records = await database.availabilityRecord.findMany({
    where: {
      ...scopedQuery(
        feedToken.feed.clerk_org_id as ClerkOrgId,
        feedToken.feed.organisation_id as OrganisationId
      ),
      archived_at: null,
      include_in_feed: true,
      publish_status: "eligible",
    },
    include: { person: true, publication: true },
    orderBy: [{ starts_at: "asc" }, { title: "asc" }],
  });

  const calendar = ical({
    name: feedToken.feed.name,
    prodId: { company: "LeaveSync", product: "LeaveSync" },
  });

  for (const record of records) {
    const uid = record.publication?.published_uid ?? record.derived_uid_key;
    calendar.createEvent({
      allDay: record.all_day,
      description:
        record.privacy_mode === "named"
          ? (record.notes_internal ?? undefined)
          : undefined,
      end: record.ends_at,
      id: uid,
      location:
        record.privacy_mode === "named"
          ? (record.working_location ?? undefined)
          : undefined,
      sequence: record.publication?.published_sequence ?? 0,
      start: record.starts_at,
      summary: buildSummary(record),
    });
  }

  const holidayAssignments = await database.publicHolidayAssignment.findMany({
    where: {
      clerk_org_id: feedToken.feed.clerk_org_id,
      organisation_id: feedToken.feed.organisation_id,
      archived_at: null,
      include_in_feeds: true,
      scope_type: "feed",
      scope_value: feedToken.feed.id,
      public_holiday: {
        archived_at: null,
      },
    },
    include: { public_holiday: true },
    orderBy: { public_holiday: { holiday_date: "asc" } },
  });

  for (const assignment of holidayAssignments) {
    const holiday = assignment.public_holiday;
    calendar.createEvent({
      allDay: true,
      end: holiday.holiday_date,
      id: `public-holiday:${holiday.id}:${assignment.id}`,
      sequence: 0,
      start: holiday.holiday_date,
      summary: holiday.name,
      transparency:
        assignment.day_classification === "working"
          ? ICalEventTransparency.TRANSPARENT
          : ICalEventTransparency.OPAQUE,
    });
  }

  const body = calendar.toString();
  const etag = createEtag(body);

  return { ok: true, value: { body, etag, status: "active" } };
};
