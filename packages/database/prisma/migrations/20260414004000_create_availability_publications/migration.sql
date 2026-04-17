-- CreateTable
CREATE TABLE "availability_publications" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID NOT NULL,
    "availability_record_id" UUID NOT NULL,
    "published_uid" TEXT NOT NULL,
    "published_summary" TEXT NOT NULL,
    "published_description" TEXT,
    "published_sequence" INTEGER NOT NULL DEFAULT 0,
    "published_at" TIMESTAMP(3) NOT NULL,
    "privacy_mode" "availability_privacy_mode" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "availability_publications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "availability_publications_availability_record_id_key" ON "availability_publications"("availability_record_id");

-- CreateIndex
CREATE INDEX "availability_publications_clerk_org_id_idx" ON "availability_publications"("clerk_org_id");

-- CreateIndex
CREATE INDEX "availability_publications_organisation_id_idx" ON "availability_publications"("organisation_id");

-- CreateIndex
CREATE INDEX "availability_publications_published_uid_idx" ON "availability_publications"("published_uid");

-- AddForeignKey
ALTER TABLE "availability_publications" ADD CONSTRAINT "availability_publications_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_publications" ADD CONSTRAINT "availability_publications_availability_record_id_fkey" FOREIGN KEY ("availability_record_id") REFERENCES "availability_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
