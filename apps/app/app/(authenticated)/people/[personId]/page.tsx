import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getActiveOrgContext } from "@/lib/server/get-active-org-context";
import { loadPersonProfileData } from "@/lib/server/load-person-profile-data";
import { PersonHeader } from "./_components/person-header";
import { PersonSummaryCard } from "./_components/person-summary-card";
import { AvailabilityTimeline } from "./_components/availability-timeline";
import { LeaveHistory } from "./_components/leave-history";
import { LeaveBalancesCard } from "./_components/leave-balances-card";
import { toDateOnly } from "@repo/core";

export const metadata: Metadata = {
  title: "Person Profile — LeaveSync",
  description: "View person profile, leave history, and availability.",
};

// Validate personId format
const PersonIdSchema = z.string().uuid();

interface PersonProfilePageProps {
  params: Promise<{
    personId: string;
  }>;
  searchParams: Promise<{
    org?: string;
    from?: string;
    to?: string;
  }>;
}

export default async function PersonProfilePage({
  params,
  searchParams,
}: PersonProfilePageProps) {
  const { personId: personIdParam } = await params;
  const { org, from, to } = await searchParams;

  // Validate personId format
  const personIdResult = PersonIdSchema.safeParse(personIdParam);
  if (!personIdResult.success) {
    return notFound();
  }

  // Step 1: Validate organisation context
  const contextResult = await getActiveOrgContext(org || "");
  if (!contextResult.ok) {
    return notFound();
  }

  const { clerkOrgId, organisationId } = contextResult.value;

  // Step 2: Determine date range (default: 90 days back, 30 days forward)
  const now = new Date();
  let fromDate = now;
  let toDate = now;

  if (from && to) {
    try {
      fromDate = new Date(from);
      toDate = new Date(to);
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        // Invalid dates, use defaults
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 90);
        toDate = new Date(now);
        toDate.setDate(toDate.getDate() + 30);
      }
    } catch {
      // Invalid dates, use defaults
      fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - 90);
      toDate = new Date(now);
      toDate.setDate(toDate.getDate() + 30);
    }
  } else {
    // Default: 90 days back + 30 days forward
    fromDate = new Date(now);
    fromDate.setDate(fromDate.getDate() - 90);
    toDate = new Date(now);
    toDate.setDate(toDate.getDate() + 30);
  }

  // Step 3: Load person profile data
  const dataResult = await loadPersonProfileData(
    clerkOrgId,
    organisationId,
    personIdParam as any, // Already validated
    {
      startDate: fromDate,
      endDate: toDate,
    }
  );

  if (!dataResult.ok) {
    if (dataResult.error.code === "not_found") {
      return notFound();
    }
    throw new Error(dataResult.error.message);
  }

  const { profile, availability, leaveBalances } = dataResult.value;

  // Separate upcoming and recent availability
  const upcomingAvailability = availability.filter(
    (a) => new Date(a.startsAt) >= now
  );
  const recentAvailability = availability.filter(
    (a) => new Date(a.startsAt) < now
  );

  return (
    <>
      <PersonHeader
        firstName={profile.firstName}
        lastName={profile.lastName}
        email={profile.email}
        sourceSystem={profile.sourceSystem}
      />

      <div className="flex flex-1 flex-col gap-6 p-6">
        {/* Top section: Profile card and balances */}
        <div className="grid gap-5 md:grid-cols-3">
          <div className="md:col-span-2">
            <PersonSummaryCard
              employmentType={profile.employmentType}
              isActive={profile.isActive}
              team={profile.team}
              location={profile.location}
            />
          </div>
          <div>
            <LeaveBalancesCard balances={leaveBalances} />
          </div>
        </div>

        {/* Timeline section: Availability and history */}
        <div className="grid gap-5 lg:grid-cols-2">
          <AvailabilityTimeline
            title="Upcoming Availability"
            records={upcomingAvailability}
            isEmpty={upcomingAvailability.length === 0}
          />
          <LeaveHistory
            title="Recent Leave"
            records={recentAvailability}
            isEmpty={recentAvailability.length === 0}
          />
        </div>
      </div>
    </>
  );
}
