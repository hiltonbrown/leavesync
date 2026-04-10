import type { Metadata } from "next";
import { LeaveApprovalSettingsClient } from "./leave-approval-settings-client";

export const metadata: Metadata = {
  title: "Leave Approval — Settings — LeaveSync",
  description:
    "Configure leave approval requirements and availability by employee type.",
};

const LeaveApprovalSettingsPage = async () => {
  return <LeaveApprovalSettingsClient />;
};

export default LeaveApprovalSettingsPage;
