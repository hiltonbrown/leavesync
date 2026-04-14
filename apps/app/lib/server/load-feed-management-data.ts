import "server-only";

import type { ClerkOrgId, FeedId, OrganisationId, Result } from "@repo/core";
import { appError } from "@repo/core";
import {
  listFeedsForOrganisation,
  getFeedDetail,
} from "@repo/database/src/queries/feeds";

/**
 * Loads feed management data for the organisation.
 * Can optionally load detailed data for a specific feed.
 */
export async function loadFeedManagementData(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId,
  feedId?: FeedId
): Promise<
  Result<{
    feeds: Array<{
      id: FeedId;
      slug: string;
      createdAt: Date;
    }>;
    selectedFeed?: {
      id: FeedId;
      slug: string;
      scopes: Array<{
        id: string;
        ruleType: string;
        ruleValue: string;
      }>;
      tokens: Array<{
        id: string;
        expiresAt: Date | null;
        revokedAt: Date | null;
        createdAt: Date;
      }>;
    };
  }>
> {
  try {
    // Load all feeds
    const feedsResult = await listFeedsForOrganisation(
      clerkOrgId,
      organisationId
    );

    if (!feedsResult.ok) {
      return {
        ok: false,
        error: feedsResult.error,
      };
    }

    // Optionally load detail for selected feed
    let selectedFeed: undefined | {
      id: FeedId;
      slug: string;
      scopes: Array<{
        id: string;
        ruleType: string;
        ruleValue: string;
      }>;
      tokens: Array<{
        id: string;
        expiresAt: Date | null;
        revokedAt: Date | null;
        createdAt: Date;
      }>;
    };

    if (feedId) {
      const detailResult = await getFeedDetail(
        clerkOrgId,
        organisationId,
        feedId
      );

      if (!detailResult.ok) {
        return {
          ok: false,
          error: detailResult.error,
        };
      }

      selectedFeed = {
        id: detailResult.value.id,
        slug: detailResult.value.slug,
        scopes: detailResult.value.scopes,
        tokens: detailResult.value.tokens,
      };
    }

    return {
      ok: true,
      value: {
        feeds: feedsResult.value.map((feed) => ({
          id: feed.id,
          slug: feed.slug,
          createdAt: feed.createdAt,
        })),
        selectedFeed,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error: appError("internal", "Failed to load feed management data"),
    };
  }
}
