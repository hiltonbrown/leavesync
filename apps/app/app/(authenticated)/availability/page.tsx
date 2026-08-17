import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyAvailabilityPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const LegacyAvailabilityPage = async ({
  searchParams,
}: LegacyAvailabilityPageProps) => {
  const params = await searchParams;
  const { org, ...rest } = params;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(rest)) {
    if (value === undefined) {
      continue;
    }
    const values = Array.isArray(value) ? value : [value];
    for (const v of values) {
      query.append(key, v);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(withOrg(`/plans${suffix}`, org as string | undefined));
};

export default LegacyAvailabilityPage;
