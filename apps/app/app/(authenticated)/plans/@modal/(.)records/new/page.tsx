import { InterceptingModalShell } from "@/components/modals/intercepting-modal-shell";
import { RecordForm } from "../../../record-form";
import { loadPlanFormData } from "../../../record-form-data";

interface NewRecordModalPageProps {
  searchParams: Promise<{ org?: string }>;
}

const NewRecordModalPage = async ({
  searchParams,
}: NewRecordModalPageProps) => {
  const { org } = await searchParams;
  const data = await loadPlanFormData({ org });

  return (
    <InterceptingModalShell size="default" title="New record">
      <RecordForm mode="create" {...data} />
    </InterceptingModalShell>
  );
};

export default NewRecordModalPage;
