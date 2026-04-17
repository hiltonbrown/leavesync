-- CreateEnum
CREATE TYPE "feed_scope_rule_type" AS ENUM ('person', 'team', 'location', 'organisation');

-- CreateTable
CREATE TABLE "feeds" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_scopes" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "feed_id" UUID NOT NULL,
    "rule_type" "feed_scope_rule_type" NOT NULL,
    "rule_value" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_scopes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_tokens" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "feed_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feeds_clerk_org_id_slug_key" ON "feeds"("clerk_org_id", "slug");

-- CreateIndex
CREATE INDEX "feeds_clerk_org_id_idx" ON "feeds"("clerk_org_id");

-- CreateIndex
CREATE INDEX "feeds_organisation_id_idx" ON "feeds"("organisation_id");

-- CreateIndex
CREATE INDEX "feed_scopes_clerk_org_id_idx" ON "feed_scopes"("clerk_org_id");

-- CreateIndex
CREATE INDEX "feed_scopes_feed_id_idx" ON "feed_scopes"("feed_id");

-- CreateIndex
CREATE INDEX "feed_scopes_rule_type_rule_value_idx" ON "feed_scopes"("rule_type", "rule_value");

-- CreateIndex
CREATE UNIQUE INDEX "feed_tokens_token_hash_key" ON "feed_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "feed_tokens_clerk_org_id_idx" ON "feed_tokens"("clerk_org_id");

-- CreateIndex
CREATE INDEX "feed_tokens_feed_id_idx" ON "feed_tokens"("feed_id");

-- AddForeignKey
ALTER TABLE "feeds" ADD CONSTRAINT "feeds_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_scopes" ADD CONSTRAINT "feed_scopes_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_tokens" ADD CONSTRAINT "feed_tokens_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "feeds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
