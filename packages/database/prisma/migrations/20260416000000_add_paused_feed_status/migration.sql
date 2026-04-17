DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_status') THEN
    CREATE TYPE "feed_status" AS ENUM ('active', 'paused', 'archived');
  ELSE
    ALTER TYPE "feed_status" ADD VALUE IF NOT EXISTS 'paused';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feed_token_status') THEN
    CREATE TYPE "feed_token_status" AS ENUM ('active', 'revoked', 'expired');
  END IF;
END $$;

ALTER TABLE "feeds" ADD COLUMN IF NOT EXISTS "name" TEXT;
UPDATE "feeds" SET "name" = "slug" WHERE "name" IS NULL;
ALTER TABLE "feeds" ALTER COLUMN "name" SET NOT NULL;

ALTER TABLE "feeds"
  ADD COLUMN IF NOT EXISTS "status" "feed_status" NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS "privacy_default" TEXT NOT NULL DEFAULT 'named',
  ADD COLUMN IF NOT EXISTS "scope_type" TEXT NOT NULL DEFAULT 'all_staff';

ALTER TABLE "feed_tokens" ADD COLUMN IF NOT EXISTS "token_hint" TEXT;
UPDATE "feed_tokens"
SET "token_hint" = RIGHT("token_hash", 4)
WHERE "token_hint" IS NULL;
ALTER TABLE "feed_tokens" ALTER COLUMN "token_hint" SET NOT NULL;

ALTER TABLE "feed_tokens"
  ADD COLUMN IF NOT EXISTS "status" "feed_token_status" NOT NULL DEFAULT 'active';
