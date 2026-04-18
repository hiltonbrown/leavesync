import "server-only";

import { currentUser } from "@repo/auth/server";
import type { ClerkOrgId, OrganisationId, Result } from "@repo/core";
import { appError, endOfUtcDay, startOfUtcDay, toDateOnly } from "@repo/core";
import {
  listAvailabilityForCalendar,
  listFeedsForOrganisation,
  listNotificationsForUser,
  listPendingApprovalRecords,
  listPeopleForOrganisation,
} from "@repo/database/src/queries";
import {
  isLeaveRecordType,
  isUnavailableRecordType,
} from "@/lib/availability-record-types";

/**
 * Loads comprehensive dashboard data including stats, recent activity, and notifications.
 */
export async function loadDashboardData(
  clerkOrgId: ClerkOrgId,
  organisationId: OrganisationId
): Promise<
  Result<{
    stats: {
      totalPeople: number;
      peopleUnavailableToday: number;
      upcomingLeaveDays14: number;
      unreadNotifications: number;
      activeFeeds: number;
      pendingApprovals: number;
    };
    recentActivity: Array<{
      id: string;
      personName: string;
      recordType: string;
      startsAt: Date;
      endsAt: Date;
      approvalStatus: string;
    }>;
  }>
> {
  try {
    const now = new Date();
    const today = toDateOnly(now);
    const todayStart = startOfUtcDay(today);
    const todayEnd = endOfUtcDay(today);

    // Get 14-day window
    const twoWeeksAhead = new Date(now);
    twoWeeksAhead.setDate(twoWeeksAhead.getDate() + 14);
    const _twoWeeksAheadDate = toDateOnly(twoWeeksAhead);

    // Get user for notifications
    const user = await currentUser();

    // Load all required data in parallel
    const [
      peopleResult,
      todayAvailabilityResult,
      upcomingLeaveResult,
      feedsResult,
      notificationsResult,
      pendingApprovalsResult,
    ] = await Promise.all([
      listPeopleForOrganisation(clerkOrgId, organisationId),
      listAvailabilityForCalendar(clerkOrgId, organisationId, {
        startDate: todayStart,
        endDate: todayEnd,
      }),
      listAvailabilityForCalendar(clerkOrgId, organisationId, {
        startDate: todayStart,
        endDate: twoWeeksAhead,
      }),
      listFeedsForOrganisation(clerkOrgId, organisationId),
      user
        ? listNotificationsForUser(clerkOrgId, organisationId, user.id, {
            isRead: false,
          })
        : Promise.resolve({ ok: true, value: [] } as const),
      listPendingApprovalRecords(clerkOrgId, organisationId),
    ]);

    // Handle errors
    if (!peopleResult.ok) {
      return { ok: false, error: peopleResult.error };
    }
    if (!todayAvailabilityResult.ok) {
      return { ok: false, error: todayAvailabilityResult.error };
    }
    if (!upcomingLeaveResult.ok) {
      return { ok: false, error: upcomingLeaveResult.error };
    }
    if (!feedsResult.ok) {
      return { ok: false, error: feedsResult.error };
    }
    if (!notificationsResult.ok) {
      return { ok: false, error: notificationsResult.error };
    }
    if (!pendingApprovalsResult.ok) {
      return { ok: false, error: pendingApprovalsResult.error };
    }

    // Count people currently unavailable (leave or WFH)
    const uniqueUnavailablePeople = new Set(
      todayAvailabilityResult.value
        .filter((r) => isUnavailableRecordType(r.recordType))
        .map((r) => r.personId)
    );

    // Count unique days of upcoming leave (next 14 days, approved only)
    const approvedLeaveByDay = new Set<string>();
    for (const record of upcomingLeaveResult.value) {
      if (
        isLeaveRecordType(record.recordType) &&
        record.approvalStatus === "approved"
      ) {
        const current = new Date(record.startsAt);
        const end = new Date(record.endsAt);

        while (current <= end) {
          const dayStr = toDateOnly(current);
          approvedLeaveByDay.add(dayStr);
          current.setDate(current.getDate() + 1);
        }
      }
    }

    // Recent activity: all availability changes from past 7 days
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentActivityResult = await listAvailabilityForCalendar(
      clerkOrgId,
      organisationId,
      {
        startDate: sevenDaysAgo,
        endDate: twoWeeksAhead,
      }
    );

    if (!recentActivityResult.ok) {
      return { ok: false, error: recentActivityResult.error };
    }

    const peopleById = new Map(
      peopleResult.value.map((person) => [
        person.id,
        `${person.firstName} ${person.lastName}`,
      ])
    );

    // Create activity list sorted by date, limited to 5 most recent
    const recentActivity = recentActivityResult.value
      .sort((a, b) => b.startsAt.getTime() - a.startsAt.getTime())
      .slice(0, 5)
      .map((record) => ({
        id: record.id,
        personName: peopleById.get(record.personId) ?? "Unknown",
        recordType: record.recordType,
        startsAt: record.startsAt,
        endsAt: record.endsAt,
        approvalStatus: record.approvalStatus,
      }));

    return {
      ok: true,
      value: {
        stats: {
          totalPeople: peopleResult.value.length,
          peopleUnavailableToday: uniqueUnavailablePeople.size,
          upcomingLeaveDays14: approvedLeaveByDay.size,
          unreadNotifications: notificationsResult.value.length,
          activeFeeds: feedsResult.value.length,
          pendingApprovals: pendingApprovalsResult.value.length,
        },
        recentActivity,
      },
    };
  } catch (_error) {
    return {
      ok: false,
      error: appError("internal", "Failed to load dashboard data"),
    };
  }
}
