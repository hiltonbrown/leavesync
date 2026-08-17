import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyLeaveBalancesPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const LegacyLeaveBalancesPage = async ({
  searchParams,
}: LegacyLeaveBalancesPageProps) => {
  const ps = await searchParams;
  const { org, personId, ...rest } = ps;
  const pid = Array.isArray(personId) ? personId[0] : personId;
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
  if (pid) {
    redirect(withOrg(`/people/${pid}${suffix}`, org as string | undefined));
  }
  redirect(withOrg(`/people${suffix}`, org as string | undefined));
};

export default LegacyLeaveBalancesPage;
