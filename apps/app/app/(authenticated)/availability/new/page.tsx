import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyNewAvailabilityPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const LegacyNewAvailabilityPage = async ({
  searchParams,
}: LegacyNewAvailabilityPageProps) => {
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
  redirect(withOrg(`/plans/new${suffix}`, org as string | undefined));
};

export default LegacyNewAvailabilityPage;
