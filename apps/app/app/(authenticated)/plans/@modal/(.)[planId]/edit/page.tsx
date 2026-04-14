import { RouteModal } from "../../../../components/route-modal";
import { EditPlanClient } from "./edit-plan-client";

interface EditPlanModalPageProperties {
  readonly params: Promise<{ planId: string }>;
}

const EditPlanModalPage = async ({
  params,
}: EditPlanModalPageProperties) => {
  const { planId } = await params;

  return (
    <RouteModal>
      <EditPlanClient planId={planId} />
    </RouteModal>
  );
};

export default EditPlanModalPage;
