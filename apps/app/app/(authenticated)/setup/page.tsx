import { auth, clerkClient } from "@repo/auth/server";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@repo/design-system/components/ui/empty";
import type { Metadata } from "next";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = {
  title: "Setup Required | LeaveSync",
};

export default async function SetupPage() {
  const { orgId, orgRole } = await auth();

  if (orgRole !== "org:admin" && orgRole !== "org:owner") {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <Empty>
          <EmptyHeader>
            <EmptyTitle>Organisation not set up</EmptyTitle>
            <EmptyDescription>
              Your account is not linked to a LeaveSync organisation yet. Ask
              your workspace owner to complete the initial setup, or contact
              support if this looks wrong.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    );
  }

  const clerk = await clerkClient();
  const clerkOrg = orgId
    ? await clerk.organizations.getOrganization({ organizationId: orgId })
    : null;

  return <OnboardingClient prefillName={clerkOrg?.name ?? ""} />;
}
