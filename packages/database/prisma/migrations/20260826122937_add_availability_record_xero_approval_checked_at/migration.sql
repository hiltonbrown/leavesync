-- AlterTable
ALTER TABLE "availability_records" ADD COLUMN     "xero_approval_checked_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "availability_records_organisation_id_approval_status_archiv_idx" ON "availability_records"("organisation_id", "approval_status", "archived_at", "ends_at", "xero_approval_checked_at", "id");
