import { auth, clerkClient } from "@repo/auth/server";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { DangerClient } from "./danger-client";

export const metadata: Metadata = {
  title: "Danger Zone — Settings — LeaveSync",
  description: "Irreversible actions for your organisation.",
};

const DangerPage = async () => {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/");
  }

  const clerk = await clerkClient();
  const org = await clerk.organizations.getOrganization({ organizationId: orgId });

  return <DangerClient orgName={org.name} />;
};

export default DangerPage;
