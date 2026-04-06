import type { Metadata } from "next";
import { AuditLogClient } from "./audit-log-client";

export const metadata: Metadata = {
  title: "Audit Log — Settings — LeaveSync",
  description: "Review administrative actions in your organisation.",
};

const AuditLogPage = async () => {
  // AuditLog table not yet in DB schema — render empty state.
  return <AuditLogClient entries={[]} />;
};

export default AuditLogPage;
