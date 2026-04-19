import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyEditAvailabilityPageProps {
  params: Promise<{ recordId: string }>;
  searchParams: Promise<{ org?: string }>;
}

const LegacyEditAvailabilityPage = async ({
  params,
  searchParams,
}: LegacyEditAvailabilityPageProps) => {
  const { recordId } = await params;
  const { org } = await searchParams;
  redirect(withOrg(`/plans/records/${recordId}/edit`, org));
};

export default LegacyEditAvailabilityPage;
