import { auth, clerkClient } from "@repo/auth/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { MembersClient } from "./members-client";

export const metadata: Metadata = {
  description: "Manage team members and their roles in your organisation.",
  title: "Members - Settings - Team Calendar",
};

const MembersPage = async () => {
  const { orgId, orgRole, userId } = await auth();

  if (!(orgId && userId)) {
    redirect("/");
  }

  const clerk = await clerkClient();

  const [membershipsResult, invitationsResult] = await Promise.all([
    clerk.organizations.getOrganizationMembershipList({
      limit: 100,
      organizationId: orgId,
    }),
    clerk.organizations.getOrganizationInvitationList({
      organizationId: orgId,
      status: ["pending"],
    }),
  ]);

  const members = membershipsResult.data.map((m) => ({
    emailAddress: m.publicUserData?.identifier ?? "",
    firstName: m.publicUserData?.firstName ?? null,
    imageUrl: m.publicUserData?.imageUrl ?? "",
    lastName: m.publicUserData?.lastName ?? null,
    membershipId: m.id,
    role: m.role,
    userId: m.publicUserData?.userId ?? "",
  }));

  const pendingInvitations = invitationsResult.data.map((inv) => ({
    createdAt: inv.createdAt,
    emailAddress: inv.emailAddress,
    id: inv.id,
    role: inv.role,
  }));

  return (
    <MembersClient
      currentUserId={userId}
      currentUserRole={orgRole ?? "org:viewer"}
      members={members}
      pendingInvitations={pendingInvitations}
    />
  );
};

export default MembersPage;
