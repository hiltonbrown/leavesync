import { InterceptingModalShell } from "@/components/modals/intercepting-modal-shell";
import { PersonProfileClient } from "./person-profile-client";

interface PersonProfileModalPageProperties {
  readonly params: Promise<{ personId: string }>;
}

const PersonProfileModalPage = async ({
  params,
}: PersonProfileModalPageProperties) => {
  const { personId } = await params;

  return (
    <InterceptingModalShell size="wide">
      <PersonProfileClient personId={personId} />
    </InterceptingModalShell>
  );
};

export default PersonProfileModalPage;
