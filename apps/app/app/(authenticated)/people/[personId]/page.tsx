import { redirect } from "next/navigation";

interface LegacyPersonProfilePageProperties {
  readonly params: Promise<{ personId: string }>;
  readonly searchParams: Promise<{ org?: string }>;
}

const LegacyPersonProfilePage = async ({
  params,
  searchParams,
}: LegacyPersonProfilePageProperties) => {
  const { personId } = await params;
  const { org } = await searchParams;
  const query = org ? `?org=${encodeURIComponent(org)}` : "";
  redirect(`/people/person/${personId}${query}`);
};

export default LegacyPersonProfilePage;
