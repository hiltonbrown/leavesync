import { RouteModal } from "../../../components/route-modal";
import { PersonProfileClient } from "./person-profile-client";

interface PersonProfileModalPageProperties {
  readonly params: Promise<{ personId: string }>;
}

const PersonProfileModalPage = async ({
  params,
}: PersonProfileModalPageProperties) => {
  const { personId } = await params;

  return (
    <RouteModal>
      <PersonProfileClient personId={personId} />
    </RouteModal>
  );
};

export default PersonProfileModalPage;
