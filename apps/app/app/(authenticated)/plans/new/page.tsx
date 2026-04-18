import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyNewPlanPageProps {
  searchParams: Promise<{ org?: string }>;
}

const LegacyNewPlanPage = async ({ searchParams }: LegacyNewPlanPageProps) => {
  const { org } = await searchParams;
  // Legacy route kept for existing links while the unified records route lands.
  redirect(withOrg("/plans/records/new", org));
};

export default LegacyNewPlanPage;
