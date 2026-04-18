-- Align feed management tables with Slice 08.
-- This migration intentionally fails if legacy feed scopes cannot be mapped safely.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "feeds" WHERE "organisation_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate feeds with null organisation_id';
  END IF;
END $$;

ALTER TABLE "feeds"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "privacy_mode" "availability_privacy_mode" NOT NULL DEFAULT 'named',
  ADD COLUMN "includes_public_holidays" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "last_rendered_at" TIMESTAMP(3),
  ADD COLUMN "last_etag" TEXT,
  ADD COLUMN "created_by_user_id" TEXT,
  ADD COLUMN "archived_at" TIMESTAMP(3);

UPDATE "feeds"
SET "privacy_mode" = "privacy_default"::"availability_privacy_mode"
WHERE "privacy_default" IN ('named', 'masked', 'private');

ALTER TABLE "feeds"
  ALTER COLUMN "organisation_id" SET NOT NULL,
  DROP COLUMN "privacy_default",
  DROP COLUMN "scope_type";

ALTER TABLE "feed_scopes"
  ADD COLUMN "organisation_id" UUID,
  ADD COLUMN "scope_type_new" TEXT,
  ADD COLUMN "scope_value" TEXT;

UPDATE "feed_scopes"
SET
  "organisation_id" = "feeds"."organisation_id",
  "scope_type_new" = CASE "feed_scopes"."rule_type"::TEXT
    WHEN 'organisation' THEN 'org'
    WHEN 'team' THEN 'team'
    WHEN 'person' THEN 'person'
    ELSE NULL
  END,
  "scope_value" = CASE "feed_scopes"."rule_type"::TEXT
    WHEN 'organisation' THEN NULL
    ELSE "feed_scopes"."rule_value"
  END
FROM "feeds"
WHERE "feed_scopes"."feed_id" = "feeds"."id";

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "feed_scopes"
    WHERE "organisation_id" IS NULL OR "scope_type_new" IS NULL
  ) THEN
    RAISE EXCEPTION 'Cannot migrate unmappable feed scope rows';
  END IF;
END $$;

ALTER TABLE "feed_scopes" DROP COLUMN "rule_type";
ALTER TABLE "feed_scopes" DROP COLUMN "rule_value";

ALTER TYPE "feed_scope_rule_type" RENAME TO "feed_scope_rule_type_old";
CREATE TYPE "feed_scope_rule_type" AS ENUM ('org', 'person', 'team', 'self', 'manager_team');

ALTER TABLE "feed_scopes"
  RENAME COLUMN "scope_type_new" TO "scope_type";

ALTER TABLE "feed_scopes"
  ALTER COLUMN "organisation_id" SET NOT NULL,
  ALTER COLUMN "scope_type" TYPE "feed_scope_rule_type" USING "scope_type"::"feed_scope_rule_type";

DROP TYPE "feed_scope_rule_type_old";

ALTER TABLE "feed_scopes" DROP COLUMN "updated_at";

ALTER TABLE "feed_tokens"
  ADD COLUMN "organisation_id" UUID,
  ADD COLUMN "rotated_from_token_id" UUID,
  ADD COLUMN "last_used_at" TIMESTAMP(3);

UPDATE "feed_tokens"
SET "organisation_id" = "feeds"."organisation_id"
FROM "feeds"
WHERE "feed_tokens"."feed_id" = "feeds"."id";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "feed_tokens" WHERE "organisation_id" IS NULL) THEN
    RAISE EXCEPTION 'Cannot migrate feed tokens without organisation_id';
  END IF;
END $$;

ALTER TABLE "feed_tokens"
  ALTER COLUMN "organisation_id" SET NOT NULL;

CREATE INDEX "feed_scopes_organisation_id_idx" ON "feed_scopes"("organisation_id");
CREATE INDEX "feed_scopes_scope_type_scope_value_idx" ON "feed_scopes"("scope_type", "scope_value");
CREATE INDEX "feed_tokens_organisation_id_idx" ON "feed_tokens"("organisation_id");
CREATE INDEX "feed_tokens_rotated_from_token_id_idx" ON "feed_tokens"("rotated_from_token_id");

ALTER TABLE "feed_tokens"
  ADD CONSTRAINT "feed_tokens_organisation_id_fkey"
  FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "feed_tokens"
  ADD CONSTRAINT "feed_tokens_rotated_from_token_id_fkey"
  FOREIGN KEY ("rotated_from_token_id") REFERENCES "feed_tokens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "feed_tokens_one_active_per_feed_idx"
  ON "feed_tokens"("feed_id")
  WHERE "status" = 'active';
