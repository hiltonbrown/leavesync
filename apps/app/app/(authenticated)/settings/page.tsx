import { redirect } from "next/navigation";
import { withOrg } from "@/lib/navigation/org-url";

interface SettingsRedirectProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const SettingsPage = async ({ searchParams }: SettingsRedirectProps) => {
  const ps = await searchParams;
  const org = (ps.org as string | undefined) ?? undefined;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(ps)) {
    if (k === "org" || v === undefined) {
      continue;
    }
    const vs = Array.isArray(v) ? v : [v];
    for (const val of vs) {
      query.append(k, val);
    }
  }
  const suffix = query.toString() ? `?${query.toString()}` : "";
  redirect(withOrg(`/settings/general${suffix}`, org));
};

export default SettingsPage;
