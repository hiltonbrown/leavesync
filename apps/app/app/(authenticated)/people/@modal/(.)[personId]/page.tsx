import { redirect } from "next/navigation";

interface LegacyPersonProfileModalPageProperties {
  readonly params: Promise<{ personId: string }>;
  readonly searchParams: Promise<{ org?: string }>;
}

const LegacyPersonProfileModalPage = async ({
  params,
  searchParams,
}: LegacyPersonProfileModalPageProperties) => {
  const { personId } = await params;
  const { org } = await searchParams;
  const query = org ? `?org=${encodeURIComponent(org)}` : "";
  redirect(`/people/person/${personId}${query}`);
};

export default LegacyPersonProfileModalPage;
