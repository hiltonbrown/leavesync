import type { ClerkOrgId, FeedId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import { database } from "../client";
import { scopedQuery } from "../tenant-query";

export interface FeedData {
  activeTokenHint: string | null;
  clerkOrgId: string;
  createdAt: Date;
  id: FeedId;
  name: string;
  organisationId: OrganisationId | null;
  privacyDefault: string;
  scopeType: string;
  slug: string;
  status: string;
  updatedAt: Date;
}

export interface FeedDetailData extends FeedData {
  scopes: Array<{
    id: string;
    ruleType: string;
    ruleValue: string;
  }>;
  tokens: Array<{
    id: string;
    status: string;
    tokenHint: string;
    expiresAt: Date | null;
    revokedAt: Date | null;
    createdAt: Date;
  }>;
}

export interface FeedPublicationData {
  availabilityRecordId: string;
  id: string;
  privacyMode: string;
  publishedAt: Date;
  publishedDescription: string | null;
  publishedSequence: number;
  publishedSummary: string;
  publishedUid: string;
}

export async function listFeedsForOrganisation(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
): Promise<Result<FeedData[]>> {
  try {
    const feeds = await database.feed.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        name: true,
        slug: true,
        status: true,
        privacy_default: true,
        scope_type: true,
        created_at: true,
        updated_at: true,
        tokens: {
          orderBy: { created_at: "desc" },
          select: { status: true, token_hint: true },
          take: 1,
        },
      },
      orderBy: { slug: "asc" },
    });

    return {
      ok: true,
      value: feeds.map((f) => ({
        id: f.id as FeedId,
        activeTokenHint:
          f.tokens.find((token) => token.status === "active")?.token_hint ??
          null,
        clerkOrgId: f.clerk_org_id,
        name: f.name,
        organisationId: f.organisation_id as OrganisationId | null,
        privacyDefault: f.privacy_default,
        scopeType: f.scope_type,
        slug: f.slug,
        status: f.status,
        createdAt: f.created_at,
        updatedAt: f.updated_at,
      })),
    };
  } catch (_error) {
    return {
      ok: false,
      error: appError("internal", "Failed to list feeds"),
    };
  }
}

export async function getFeedDetail(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  feedId: FeedId
): Promise<Result<FeedDetailData>> {
  try {
    const feed = await database.feed.findFirst({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        id: feedId,
      },
      select: {
        id: true,
        clerk_org_id: true,
        organisation_id: true,
        name: true,
        slug: true,
        status: true,
        privacy_default: true,
        scope_type: true,
        created_at: true,
        updated_at: true,
        scopes: {
          select: {
            id: true,
            rule_type: true,
            rule_value: true,
          },
        },
        tokens: {
          orderBy: { created_at: "desc" },
          select: {
            id: true,
            status: true,
            token_hint: true,
            expires_at: true,
            revoked_at: true,
            created_at: true,
          },
        },
      },
    });

    if (!feed) {
      return {
        ok: false,
        error: appError("not_found", "Feed not found"),
      };
    }

    return {
      ok: true,
      value: {
        id: feed.id as FeedId,
        activeTokenHint:
          feed.tokens.find((token) => token.status === "active")?.token_hint ??
          null,
        clerkOrgId: feed.clerk_org_id,
        name: feed.name,
        organisationId: feed.organisation_id as OrganisationId | null,
        privacyDefault: feed.privacy_default,
        scopeType: feed.scope_type,
        slug: feed.slug,
        status: feed.status,
        createdAt: feed.created_at,
        updatedAt: feed.updated_at,
        scopes: feed.scopes.map((s) => ({
          id: s.id,
          ruleType: s.rule_type,
          ruleValue: s.rule_value,
        })),
        tokens: feed.tokens.map((t) => ({
          id: t.id,
          status: t.status,
          tokenHint: t.token_hint,
          expiresAt: t.expires_at,
          revokedAt: t.revoked_at,
          createdAt: t.created_at,
        })),
      },
    };
  } catch (_error) {
    return {
      ok: false,
      error: appError("internal", "Failed to get feed detail"),
    };
  }
}

export async function listFeedPublications(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  filters?: { dateRange?: { startDate: Date; endDate: Date }; limit?: number }
): Promise<Result<FeedPublicationData[]>> {
  try {
    const publications = await database.availabilityPublication.findMany({
      where: {
        ...scopedQuery(clerkOrgId, organisationId),
        ...(filters?.dateRange && {
          published_at: {
            gte: filters.dateRange.startDate,
            lte: filters.dateRange.endDate,
          },
        }),
      },
      select: {
        id: true,
        availability_record_id: true,
        published_uid: true,
        published_summary: true,
        published_description: true,
        published_sequence: true,
        published_at: true,
        privacy_mode: true,
      },
      orderBy: { published_at: "desc" },
      take: filters?.limit ?? 50,
    });

    return {
      ok: true,
      value: publications.map((p) => ({
        id: p.id,
        availabilityRecordId: p.availability_record_id,
        publishedUid: p.published_uid,
        publishedSummary: p.published_summary,
        publishedDescription: p.published_description,
        publishedSequence: p.published_sequence,
        publishedAt: p.published_at,
        privacyMode: p.privacy_mode,
      })),
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to list feed publications"),
    };
  }
}
