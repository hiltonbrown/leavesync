"use client";

import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@repo/design-system/components/ui/dialog";
import { useRouter } from "next/navigation";
import {
  ManualAvailabilityForm,
  type ManualAvailabilityFormPerson,
  type ManualAvailabilityFormRecord,
} from "@/app/(authenticated)/availability/manual-availability-form";

interface EditPlanClientProperties {
  readonly organisationId: string;
  readonly orgQueryValue: null | string;
  readonly people: ManualAvailabilityFormPerson[];
  readonly record: ManualAvailabilityFormRecord;
}

const EditPlanClient = ({
  organisationId,
  orgQueryValue,
  people,
  record,
}: EditPlanClientProperties) => {
  const router = useRouter();

  return (
    <>
      <DialogHeader className="mb-6">
        <DialogTitle>Edit plan</DialogTitle>
        <DialogDescription>
          Update the availability record and save the changes to Neon.
        </DialogDescription>
      </DialogHeader>

      <ManualAvailabilityForm
        mode="edit"
        onSaved={() => router.back()}
        organisationId={organisationId}
        orgQueryValue={orgQueryValue}
        people={people}
        record={record}
      />
    </>
  );
};

export { EditPlanClient };
