import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface LegacyEditAvailabilityPageProps {
  params: Promise<{ recordId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const LegacyEditAvailabilityPage = async ({
  params,
  searchParams,
}: LegacyEditAvailabilityPageProps) => {
  const { recordId } = await params;
  const ps = await searchParams;
  const { org, ...rest } = ps;
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
  redirect(
    withOrg(`/plans/${recordId}/edit${suffix}`, org as string | undefined)
  );
};

export default LegacyEditAvailabilityPage;
