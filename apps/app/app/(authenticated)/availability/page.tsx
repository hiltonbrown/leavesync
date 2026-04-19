import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyAvailabilityPageProps {
  searchParams: Promise<{ org?: string }>;
}

const LegacyAvailabilityPage = async ({
  searchParams,
}: LegacyAvailabilityPageProps) => {
  const { org } = await searchParams;
  redirect(withOrg("/plans", org));
};

export default LegacyAvailabilityPage;
