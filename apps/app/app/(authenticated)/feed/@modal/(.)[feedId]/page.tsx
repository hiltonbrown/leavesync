import type { FeedId } from "@repo/core";
import { listPeopleForOrganisation } from "@repo/database/src/queries";
import { notFound } from "next/navigation";
import { loadFeedDetailData } from "@/lib/server/load-feed-detail-data";
import { requireActiveOrgPageContext } from "@/lib/server/require-active-org-page-context";
import { RouteModal } from "../../../components/route-modal";
import { FeedDetailClient } from "./feed-detail-client";

interface FeedDetailModalPageProperties {
  readonly params: Promise<{ feedId: string }>;
  readonly searchParams: Promise<{ org?: string }>;
}

const FeedDetailModalPage = async ({
  params,
  searchParams,
}: FeedDetailModalPageProperties) => {
  const { feedId } = await params;
  const { org } = await searchParams;

  const { clerkOrgId, organisationId } = await requireActiveOrgPageContext(org);

  const [feedResult, peopleResult] = await Promise.all([
    loadFeedDetailData(clerkOrgId, organisationId, feedId as FeedId),
    listPeopleForOrganisation(clerkOrgId, organisationId),
  ]);

  if (!feedResult.ok) {
    return notFound();
  }

  if (!peopleResult.ok) {
    throw new Error(peopleResult.error.message);
  }

  const scopedPeople = filterPeopleByFeedScopes(
    peopleResult.value,
    feedResult.value.feed.scopes
  );

  return (
    <RouteModal>
      <FeedDetailClient
        feed={{
          activeTokenHint: feedResult.value.feed.activeTokenHint,
          createdAt: feedResult.value.feed.createdAt.toISOString(),
          id: feedResult.value.feed.id,
          name: feedResult.value.feed.name,
          slug: feedResult.value.feed.slug,
          status: normaliseFeedStatus(feedResult.value.feed.status),
          tokenCount: feedResult.value.feed.tokens.length,
        }}
        members={scopedPeople.map((person) => ({
          id: person.id,
          initials:
            `${person.firstName[0] ?? ""}${person.lastName[0] ?? ""}`.toUpperCase(),
          name: `${person.firstName} ${person.lastName}`,
        }))}
        previewEvents={feedResult.value.recentPublications.map(
          (publication) => ({
            date: publication.publishedAt.toISOString(),
            id: publication.id,
            maskedTitle:
              publication.privacyMode === "private" ? "Busy" : "Out of office",
            title: publication.publishedSummary,
            type: publication.privacyMode,
          })
        )}
      />
    </RouteModal>
  );
};

export default FeedDetailModalPage;

function filterPeopleByFeedScopes<
  T extends { id: string; locationId: null | string; teamId: null | string },
>(people: T[], scopes: Array<{ ruleType: string; ruleValue: string }>): T[] {
  if (scopes.length === 0) {
    return people;
  }

  return people.filter((person) =>
    scopes.some((scope) => {
      if (scope.ruleType === "organisation") {
        return true;
      }
      if (scope.ruleType === "person") {
        return person.id === scope.ruleValue;
      }
      if (scope.ruleType === "team") {
        return person.teamId === scope.ruleValue;
      }
      if (scope.ruleType === "location") {
        return person.locationId === scope.ruleValue;
      }
      return false;
    })
  );
}

function normaliseFeedStatus(value: string): "active" | "paused" {
  return value === "paused" ? "paused" : "active";
}
