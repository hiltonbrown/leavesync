-- CreateEnum
CREATE TYPE "availability_record_type" AS ENUM ('leave', 'wfh', 'travel', 'training', 'client_site');

-- CreateEnum
CREATE TYPE "availability_source_type" AS ENUM ('xero', 'manual');

-- CreateEnum
CREATE TYPE "availability_approval_status" AS ENUM ('draft', 'submitted', 'approved', 'declined', 'cancelled');

-- CreateEnum
CREATE TYPE "availability_privacy_mode" AS ENUM ('named', 'masked', 'private');

-- CreateEnum
CREATE TYPE "availability_contactability" AS ENUM ('contactable', 'limited', 'unavailable');

-- CreateEnum
CREATE TYPE "availability_publish_status" AS ENUM ('eligible', 'suppressed', 'archived');

-- CreateTable
CREATE TABLE "availability_records" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "record_type" "availability_record_type" NOT NULL,
    "source_type" "availability_source_type" NOT NULL,
    "source_remote_id" TEXT,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3) NOT NULL,
    "approval_status" "availability_approval_status" NOT NULL,
    "privacy_mode" "availability_privacy_mode" NOT NULL,
    "contactability" "availability_contactability" NOT NULL,
    "include_in_feed" BOOLEAN NOT NULL DEFAULT true,
    "publish_status" "availability_publish_status" NOT NULL DEFAULT 'eligible',
    "source_payload_json" JSONB,
    "derived_uid_key" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "availability_records_clerk_org_id_idx" ON "availability_records"("clerk_org_id");

-- CreateIndex
CREATE INDEX "availability_records_organisation_id_idx" ON "availability_records"("organisation_id");

-- CreateIndex
CREATE INDEX "availability_records_person_id_starts_at_ends_at_idx" ON "availability_records"("person_id", "starts_at", "ends_at");

-- CreateIndex
CREATE INDEX "availability_records_source_type_source_remote_id_idx" ON "availability_records"("source_type", "source_remote_id");

-- CreateIndex
CREATE INDEX "availability_records_organisation_id_publish_status_include_in_feed_idx" ON "availability_records"("organisation_id", "publish_status", "include_in_feed");

-- CreateIndex
CREATE UNIQUE INDEX "availability_records_xero_remote_unique_idx" ON "availability_records"("organisation_id", "source_type", "source_remote_id")
WHERE "source_type" = 'xero' AND "source_remote_id" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "availability_records" ADD CONSTRAINT "availability_records_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_records" ADD CONSTRAINT "availability_records_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
