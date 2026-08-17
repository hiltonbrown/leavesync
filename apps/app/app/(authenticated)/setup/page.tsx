import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface SetupRedirectProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SetupPage({ searchParams }: SetupRedirectProps) {
  const ps = await searchParams;
  const org = (ps.org as string | undefined) ?? undefined;
  const rest: Record<string, string | string[] | undefined> = { ...ps };
  delete rest.org;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(rest)) {
    if (v === undefined) {
      continue;
    }
    const vs = Array.isArray(v) ? v : [v];
    for (const val of vs) {
      query.append(k, val);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(withOrg(`/settings/getting-started${suffix}`, org));
}
