-- CreateEnum
CREATE TYPE "source_system" AS ENUM ('XERO', 'MANUAL');

-- CreateEnum
CREATE TYPE "employment_type" AS ENUM ('employee', 'contractor', 'director', 'offshore');

-- CreateTable
CREATE TABLE "people" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID NOT NULL,
    "team_id" UUID,
    "location_id" UUID,
    "source_system" "source_system" NOT NULL,
    "source_person_key" TEXT,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "employment_type" "employment_type" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "people_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "people_clerk_org_id_idx" ON "people"("clerk_org_id");

-- CreateIndex
CREATE INDEX "people_organisation_id_idx" ON "people"("organisation_id");

-- CreateIndex
CREATE INDEX "people_organisation_id_team_id_idx" ON "people"("organisation_id", "team_id");

-- CreateIndex
CREATE INDEX "people_team_id_idx" ON "people"("team_id");

-- CreateIndex
CREATE INDEX "people_location_id_idx" ON "people"("location_id");

-- CreateIndex
CREATE UNIQUE INDEX "people_organisation_id_source_system_source_person_key_key" ON "people"("organisation_id", "source_system", "source_person_key");

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "people" ADD CONSTRAINT "people_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
