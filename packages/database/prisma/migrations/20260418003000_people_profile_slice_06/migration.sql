ALTER TABLE "people"
  ADD COLUMN "status_note" TEXT,
  ADD COLUMN "avatar_url" TEXT,
  ADD COLUMN "start_date" TIMESTAMP(3),
  ADD COLUMN "xero_employee_id" TEXT;

UPDATE "people"
SET "xero_employee_id" = "source_person_key"
WHERE "source_system" = 'XERO'
  AND "source_person_key" IS NOT NULL;

CREATE UNIQUE INDEX "people_organisation_id_xero_employee_id_key"
ON "people"("organisation_id", "xero_employee_id");

CREATE TABLE "alternative_contacts" (
  "id" UUID NOT NULL,
  "clerk_org_id" TEXT NOT NULL,
  "organisation_id" UUID NOT NULL,
  "person_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "notes" TEXT,
  "display_order" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "alternative_contacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "alternative_contacts_clerk_org_id_idx"
ON "alternative_contacts"("clerk_org_id");

CREATE INDEX "alternative_contacts_organisation_id_idx"
ON "alternative_contacts"("organisation_id");

CREATE INDEX "alternative_contacts_person_id_idx"
ON "alternative_contacts"("person_id");

CREATE INDEX "alternative_contacts_person_id_display_order_idx"
ON "alternative_contacts"("person_id", "display_order");

ALTER TABLE "alternative_contacts"
ADD CONSTRAINT "alternative_contacts_organisation_id_fkey"
FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "alternative_contacts"
ADD CONSTRAINT "alternative_contacts_person_id_fkey"
FOREIGN KEY ("person_id") REFERENCES "people"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "leave_balances"
ADD COLUMN "last_fetched_at" TIMESTAMP(3);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'leave_balances'
      AND column_name = 'as_at'
  ) THEN
    EXECUTE 'UPDATE "leave_balances" SET "last_fetched_at" = COALESCE("as_at", "updated_at")';
  ELSE
    EXECUTE 'UPDATE "leave_balances" SET "last_fetched_at" = "updated_at"';
  END IF;
END $$;
