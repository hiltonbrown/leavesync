// biome-ignore-all lint/style/useFilenamingConvention: The requested seed entrypoint is tooling/seed/devTenant.ts.
import { createHash } from "node:crypto";

const {
  availability_approval_status,
  availability_contactability,
  availability_privacy_mode,
  availability_record_type,
  availability_source_type,
  database,
  employment_type,
  feed_scope_rule_type,
  feed_token_status,
  notification_type,
  source_system,
} = await import("../../packages/database/index.js");

const clerkOrgId = "org_3BbAfh8ypaTdmGab6W3tmjzkOkr";
const testUserId = "user_3Bb7Fw26BMmlRZs387jkAZ5JM2n";
const devFeedToken = "dev_leavesync_calendar_feed_token";

const ids = {
  organisation: "00000000-0000-4000-8000-000000000001",
  team: "00000000-0000-4000-8000-000000000002",
  location: "00000000-0000-4000-8000-000000000003",
  feed: "00000000-0000-4000-8000-000000000004",
  feedScope: "00000000-0000-4000-8000-000000000005",
  feedToken: "00000000-0000-4000-8000-000000000006",
  people: [
    "00000000-0000-4000-8000-000000000011",
    "00000000-0000-4000-8000-000000000012",
    "00000000-0000-4000-8000-000000000013",
  ],
  availabilityRecords: [
    "00000000-0000-4000-8000-000000000021",
    "00000000-0000-4000-8000-000000000022",
    "00000000-0000-4000-8000-000000000023",
  ],
  availabilityPublications: [
    "00000000-0000-4000-8000-000000000031",
    "00000000-0000-4000-8000-000000000032",
    "00000000-0000-4000-8000-000000000033",
  ],
} as const;

const removedGeneratedOrganisationIds = [
  "00000000-0000-4000-8000-000000000100",
  "00000000-0000-4000-8000-000000000200",
] as const;

const people = [
  {
    id: ids.people[0],
    clerk_user_id: testUserId,
    display_name: "Amelia Nguyen",
    first_name: "Amelia",
    last_name: "Nguyen",
    email: "amelia.nguyen@leavesync.test",
    employment_type: employment_type.employee,
    job_title: "Operations Lead",
  },
  {
    id: ids.people[1],
    clerk_user_id: null,
    display_name: "Marcus Taylor",
    first_name: "Marcus",
    last_name: "Taylor",
    email: "marcus.taylor@leavesync.test",
    employment_type: employment_type.contractor,
    job_title: "Client Delivery",
  },
  {
    id: ids.people[2],
    clerk_user_id: null,
    display_name: "Priya Shah",
    first_name: "Priya",
    last_name: "Shah",
    email: "priya.shah@leavesync.test",
    employment_type: employment_type.director,
    job_title: "Finance Director",
  },
] as const;

const availabilityRecords = [
  {
    id: ids.availabilityRecords[0],
    person_id: ids.people[0],
    record_type: availability_record_type.wfh,
    title: "Working from home",
    starts_at: new Date("2026-04-20T00:00:00.000Z"),
    ends_at: new Date("2026-04-20T23:59:59.999Z"),
    privacy_mode: availability_privacy_mode.named,
    contactability: availability_contactability.contactable,
    derived_uid_key: "dev-seed:wfh:amelia-nguyen:2026-04-20",
    working_location: "Home",
  },
  {
    id: ids.availabilityRecords[1],
    person_id: ids.people[1],
    record_type: availability_record_type.training,
    title: "Training day",
    starts_at: new Date("2026-04-22T00:00:00.000Z"),
    ends_at: new Date("2026-04-22T23:59:59.999Z"),
    privacy_mode: availability_privacy_mode.named,
    contactability: availability_contactability.limited,
    derived_uid_key: "dev-seed:training:marcus-taylor:2026-04-22",
    working_location: "Brisbane",
  },
  {
    id: ids.availabilityRecords[2],
    person_id: ids.people[2],
    record_type: availability_record_type.travel,
    title: "Client travel",
    starts_at: new Date("2026-04-27T00:00:00.000Z"),
    ends_at: new Date("2026-04-28T23:59:59.999Z"),
    privacy_mode: availability_privacy_mode.masked,
    contactability: availability_contactability.limited,
    derived_uid_key: "dev-seed:travel:priya-shah:2026-04-27",
    working_location: "Sydney",
  },
] as const;

const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

const seed = async () => {
  await database.$transaction(async (transaction) => {
    await deleteRemovedGeneratedTenantData(transaction);

    await transaction.person.updateMany({
      where: {
        clerk_user_id: testUserId,
        id: { not: ids.people[0] },
        organisation_id: ids.organisation,
      },
      data: { clerk_user_id: null },
    });

    await transaction.organisation.upsert({
      where: { id: ids.organisation },
      create: {
        id: ids.organisation,
        clerk_org_id: clerkOrgId,
        name: "LeaveSync Dev Organisation",
        country_code: "AU",
        timezone: "Australia/Brisbane",
        locale: "en-AU",
        fiscal_year_start: 7,
        reporting_unit: "hours",
        working_hours_per_day: 7.6,
      },
      update: {
        clerk_org_id: clerkOrgId,
        name: "LeaveSync Dev Organisation",
        country_code: "AU",
        timezone: "Australia/Brisbane",
        locale: "en-AU",
        fiscal_year_start: 7,
        reporting_unit: "hours",
        working_hours_per_day: 7.6,
        archived_at: null,
      },
    });

    await transaction.team.upsert({
      where: { id: ids.team },
      create: {
        id: ids.team,
        clerk_org_id: clerkOrgId,
        organisation_id: ids.organisation,
        name: "Operations",
      },
      update: {
        clerk_org_id: clerkOrgId,
        organisation_id: ids.organisation,
        name: "Operations",
      },
    });

    await transaction.location.upsert({
      where: { id: ids.location },
      create: {
        id: ids.location,
        clerk_org_id: clerkOrgId,
        organisation_id: ids.organisation,
        name: "Brisbane",
        region_code: "QLD",
      },
      update: {
        clerk_org_id: clerkOrgId,
        organisation_id: ids.organisation,
        name: "Brisbane",
        region_code: "QLD",
      },
    });

    for (const person of people) {
      await transaction.person.upsert({
        where: { id: person.id },
        create: {
          ...person,
          clerk_org_id: clerkOrgId,
          organisation_id: ids.organisation,
          team_id: ids.team,
          location_id: ids.location,
          source_system: source_system.MANUAL,
          source_person_key: null,
          is_active: true,
        },
        update: {
          ...person,
          clerk_org_id: clerkOrgId,
          organisation_id: ids.organisation,
          team_id: ids.team,
          location_id: ids.location,
          source_system: source_system.MANUAL,
          source_person_key: null,
          is_active: true,
          archived_at: null,
        },
      });
    }

    for (const record of availabilityRecords) {
      await transaction.availabilityRecord.upsert({
        where: { id: record.id },
        create: {
          ...record,
          all_day: true,
          approved_at: new Date("2026-04-16T00:00:00.000Z"),
          clerk_org_id: clerkOrgId,
          organisation_id: ids.organisation,
          source_type: availability_source_type.manual,
          source_remote_id: null,
          approval_status: availability_approval_status.approved,
          include_in_feed: true,
          publish_status: "eligible",
          source_payload_json: null,
          notes_internal: null,
          preferred_contact_method: null,
          created_by_user_id: testUserId,
          updated_by_user_id: testUserId,
        },
        update: {
          ...record,
          all_day: true,
          approved_at: new Date("2026-04-16T00:00:00.000Z"),
          clerk_org_id: clerkOrgId,
          organisation_id: ids.organisation,
          source_type: availability_source_type.manual,
          source_remote_id: null,
          approval_status: availability_approval_status.approved,
          include_in_feed: true,
          publish_status: "eligible",
          source_payload_json: null,
          notes_internal: null,
          preferred_contact_method: null,
          created_by_user_id: testUserId,
          updated_by_user_id: testUserId,
          archived_at: null,
        },
      });
    }

    await transaction.feed.upsert({
      where: { id: ids.feed },
      create: {
        id: ids.feed,
        clerk_org_id: clerkOrgId,
        organisation_id: ids.organisation,
        name: "Operations availability",
        slug: "operations-availability",
        status: "active",
        privacy_default: "named",
        scope_type: "all_staff",
      },
      update: {
        clerk_org_id: clerkOrgId,
        organisation_id: ids.organisation,
        name: "Operations availability",
        slug: "operations-availability",
        status: "active",
        privacy_default: "named",
        scope_type: "all_staff",
      },
    });

    await transaction.feedScope.deleteMany({
      where: { feed_id: ids.feed },
    });

    await transaction.feedScope.create({
      data: {
        id: ids.feedScope,
        clerk_org_id: clerkOrgId,
        feed_id: ids.feed,
        rule_type: feed_scope_rule_type.organisation,
        rule_value: ids.organisation,
      },
    });

    await transaction.feedToken.upsert({
      where: { id: ids.feedToken },
      create: {
        id: ids.feedToken,
        clerk_org_id: clerkOrgId,
        feed_id: ids.feed,
        token_hash: hashToken(devFeedToken),
        token_hint: devFeedToken.slice(-4),
        status: feed_token_status.active,
      },
      update: {
        clerk_org_id: clerkOrgId,
        feed_id: ids.feed,
        token_hash: hashToken(devFeedToken),
        token_hint: devFeedToken.slice(-4),
        status: feed_token_status.active,
        expires_at: null,
        revoked_at: null,
      },
    });

    for (const [index, record] of availabilityRecords.entries()) {
      const person = people.find((p) => p.id === record.person_id);
      const personName = person
        ? `${person.first_name} ${person.last_name}`
        : "Team member";

      await transaction.availabilityPublication.upsert({
        where: { availability_record_id: record.id },
        create: {
          id: ids.availabilityPublications[index],
          clerk_org_id: clerkOrgId,
          organisation_id: ids.organisation,
          availability_record_id: record.id,
          published_uid: `${record.derived_uid_key}@leavesync.dev`,
          published_summary:
            record.privacy_mode === availability_privacy_mode.masked
              ? "Out of office"
              : `${personName}: ${record.title}`,
          published_description: record.working_location,
          published_sequence: 1,
          published_at: new Date("2026-04-16T00:00:00.000Z"),
          privacy_mode: record.privacy_mode,
        },
        update: {
          clerk_org_id: clerkOrgId,
          organisation_id: ids.organisation,
          published_uid: `${record.derived_uid_key}@leavesync.dev`,
          published_summary:
            record.privacy_mode === availability_privacy_mode.masked
              ? "Out of office"
              : `${personName}: ${record.title}`,
          published_description: record.working_location,
          published_sequence: 1,
          published_at: new Date("2026-04-16T00:00:00.000Z"),
          privacy_mode: record.privacy_mode,
        },
      });
    }

    for (const type of [
      notification_type.sync_failed,
      notification_type.feed_token_rotated,
      notification_type.privacy_conflict,
      notification_type.missing_alternative_contact,
    ]) {
      await transaction.notificationPreference.upsert({
        where: {
          user_id_clerk_org_id_notification_type: {
            user_id: testUserId,
            clerk_org_id: clerkOrgId,
            notification_type: type,
          },
        },
        create: {
          user_id: testUserId,
          clerk_org_id: clerkOrgId,
          notification_type: type,
          in_app_enabled: true,
          email_enabled: true,
        },
        update: {
          in_app_enabled: true,
          email_enabled: true,
        },
      });
    }
  });

  const [
    organisationCount,
    teamCount,
    locationCount,
    peopleCount,
    linkedUserCount,
    recordCount,
    publicationCount,
    feedCount,
  ] = await Promise.all([
    database.organisation.count({ where: { id: ids.organisation } }),
    database.team.count({ where: { id: ids.team } }),
    database.location.count({ where: { id: ids.location } }),
    database.person.count({ where: { id: { in: [...ids.people] } } }),
    database.person.count({
      where: {
        clerk_org_id: clerkOrgId,
        organisation_id: ids.organisation,
        clerk_user_id: testUserId,
      },
    }),
    database.availabilityRecord.count({
      where: { id: { in: [...ids.availabilityRecords] } },
    }),
    database.availabilityPublication.count({
      where: { id: { in: [...ids.availabilityPublications] } },
    }),
    database.feed.count({ where: { id: ids.feed } }),
  ]);

  process.stdout.write(
    `${[
      "Seeded dev tenant:",
      `organisations=${organisationCount}`,
      `teams=${teamCount}`,
      `locations=${locationCount}`,
      `people=${peopleCount}`,
      `linked_test_users=${linkedUserCount}`,
      `availability_records=${recordCount}`,
      `availability_publications=${publicationCount}`,
      `feeds=${feedCount}`,
      `dev_feed_url=/ical/${devFeedToken}`,
    ].join(" ")}\n`
  );
};

async function deleteRemovedGeneratedTenantData(
  transaction: typeof database
): Promise<void> {
  const legacyFeeds = await transaction.feed.findMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
    select: { id: true },
  });
  const legacyRecords = await transaction.availabilityRecord.findMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
    select: { id: true },
  });
  const legacySyncRuns = await transaction.syncRun.findMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
    select: { id: true },
  });

  await transaction.feedToken.deleteMany({
    where: { feed_id: { in: legacyFeeds.map((feed) => feed.id) } },
  });
  await transaction.feedScope.deleteMany({
    where: { feed_id: { in: legacyFeeds.map((feed) => feed.id) } },
  });
  await transaction.feed.deleteMany({
    where: { id: { in: legacyFeeds.map((feed) => feed.id) } },
  });
  await transaction.availabilityPublication.deleteMany({
    where: {
      availability_record_id: {
        in: legacyRecords.map((record) => record.id),
      },
    },
  });
  await transaction.availabilityRecord.deleteMany({
    where: { id: { in: legacyRecords.map((record) => record.id) } },
  });
  await transaction.leaveBalance.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.failedRecord.deleteMany({
    where: { sync_run_id: { in: legacySyncRuns.map((run) => run.id) } },
  });
  await transaction.syncRun.deleteMany({
    where: { id: { in: legacySyncRuns.map((run) => run.id) } },
  });
  await transaction.xeroSyncCursor.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.xeroTenant.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.xeroConnection.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.auditEvent.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.person.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.location.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.team.deleteMany({
    where: { organisation_id: { in: [...removedGeneratedOrganisationIds] } },
  });
  await transaction.organisation.deleteMany({
    where: { id: { in: [...removedGeneratedOrganisationIds] } },
  });
}

try {
  await seed();
} finally {
  await database.$disconnect();
}
