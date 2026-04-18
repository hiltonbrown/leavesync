-- AlterTable
ALTER TABLE "people" ADD COLUMN "manager_person_id" UUID;

-- AlterTable
ALTER TABLE "xero_connections" ADD COLUMN "revoked_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "availability_records" ADD COLUMN "approved_by_person_id" UUID,
ADD COLUMN "derived_sequence" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "people_organisation_id_manager_person_id_idx" ON "people"("organisation_id", "manager_person_id");

-- CreateIndex
CREATE INDEX "availability_records_approved_by_person_id_idx" ON "availability_records"("approved_by_person_id");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_manager_person_id_fkey" FOREIGN KEY ("manager_person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_records" ADD CONSTRAINT "availability_records_approved_by_person_id_fkey" FOREIGN KEY ("approved_by_person_id") REFERENCES "people"("id") ON DELETE SET NULL ON UPDATE CASCADE;
