import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyEditPlanModalPageProps {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ org?: string }>;
}

const LegacyEditPlanModalPage = async ({
  params,
  searchParams,
}: LegacyEditPlanModalPageProps) => {
  const { planId } = await params;
  const { org } = await searchParams;
  // Legacy route kept for existing links while the unified records route lands.
  redirect(withOrg(`/plans/records/${planId}/edit`, org));
};

export default LegacyEditPlanModalPage;
