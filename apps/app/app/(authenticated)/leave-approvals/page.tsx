import { auth } from "@repo/auth/server";
import { redirect } from "next/navigation";
import { Header } from "../components/header";
import { LeaveApprovalsClient } from "./leave-approvals-client";

export const metadata = {
  title: "Leave Approvals — LeaveSync",
  description: "Approve and manage team leave requests.",
};

const LeaveApprovalsPage = async () => {
  const { orgId, orgRole } = await auth();

  if (!orgId) {
    redirect("/");
  }

  const isAdminOrOwner = orgRole === "org:owner" || orgRole === "org:admin";

  if (!isAdminOrOwner) {
    redirect("/");
  }

  return (
    <>
      <Header page="Leave Approvals" />
      <div className="flex flex-1 flex-col gap-6 p-6 pt-0">
        <LeaveApprovalsClient />
      </div>
    </>
  );
};

export default LeaveApprovalsPage;
