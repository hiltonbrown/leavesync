import "server-only";

import type { ClerkOrgId, FeedId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import {
  getFeedDetail,
  listFeedPublications,
} from "@repo/database/src/queries";

/**
 * Loads feed detail and recent publications for the feed detail page.
 * Never returns token plaintext.
 */
export async function loadFeedDetailData(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  feedId: FeedId
): Promise<
  Result<{
    feed: {
      id: string;
      activeTokenHint: string | null;
      name: string;
      status: string;
      slug: string;
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
      createdAt: Date;
      updatedAt: Date;
    };
    recentPublications: Array<{
      id: string;
      availabilityRecordId: string;
      publishedUid: string;
      publishedSummary: string;
      publishedDescription: string | null;
      publishedSequence: number;
      publishedAt: Date;
      privacyMode: string;
    }>;
  }>
> {
  try {
    const [feedResult, publicationsResult] = await Promise.all([
      getFeedDetail(clerkOrgId, organisationId, feedId),
      listFeedPublications(clerkOrgId, organisationId, { limit: 50 }),
    ]);

    if (!feedResult.ok) {
      return {
        ok: false,
        error: feedResult.error,
      };
    }

    if (!publicationsResult.ok) {
      return {
        ok: false,
        error: publicationsResult.error,
      };
    }

    return {
      ok: true,
      value: {
        feed: {
          id: feedResult.value.id,
          activeTokenHint: feedResult.value.activeTokenHint,
          name: feedResult.value.name,
          status: feedResult.value.status,
          slug: feedResult.value.slug,
          scopes: feedResult.value.scopes,
          tokens: feedResult.value.tokens,
          createdAt: feedResult.value.createdAt,
          updatedAt: feedResult.value.updatedAt,
        },
        recentPublications: publicationsResult.value,
      },
    };
  } catch {
    return {
      ok: false,
      error: appError("internal", "Failed to load feed detail data"),
    };
  }
}
