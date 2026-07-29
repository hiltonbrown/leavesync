import { scopedTo } from "@repo/database";

// Feed queries are always scoped to a single feed within a tenant. The id field
// makes this specific to the feeds table, which is why it lives here rather
// than in @repo/database.
export function scopedFeed(input: {
  clerkOrgId: string;
  feedId: string;
  organisationId: string;
}) {
  return {
    ...scopedTo(input),
    id: input.feedId,
  };
}
