-- CreateEnum
CREATE TYPE "payroll_region" AS ENUM ('AU', 'NZ', 'UK');

-- CreateEnum
CREATE TYPE "xero_sync_entity_type" AS ENUM ('people', 'leave_records', 'leave_balances');

-- CreateTable
CREATE TABLE "xero_connections" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID NOT NULL,
    "access_token_encrypted" TEXT NOT NULL,
    "refresh_token_encrypted" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_tenants" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID NOT NULL,
    "xero_connection_id" UUID NOT NULL,
    "xero_tenant_id" TEXT NOT NULL,
    "payroll_region" "payroll_region" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "xero_sync_cursors" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID NOT NULL,
    "xero_tenant_id" UUID NOT NULL,
    "entity_type" "xero_sync_entity_type" NOT NULL,
    "cursor_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "xero_sync_cursors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "xero_connections_organisation_id_key" ON "xero_connections"("organisation_id");

-- CreateIndex
CREATE INDEX "xero_connections_clerk_org_id_idx" ON "xero_connections"("clerk_org_id");

-- CreateIndex
CREATE UNIQUE INDEX "xero_tenants_xero_connection_id_key" ON "xero_tenants"("xero_connection_id");

-- CreateIndex
CREATE INDEX "xero_tenants_clerk_org_id_idx" ON "xero_tenants"("clerk_org_id");

-- CreateIndex
CREATE INDEX "xero_tenants_organisation_id_idx" ON "xero_tenants"("organisation_id");

-- CreateIndex
CREATE INDEX "xero_tenants_xero_tenant_id_idx" ON "xero_tenants"("xero_tenant_id");

-- CreateIndex
CREATE INDEX "xero_sync_cursors_clerk_org_id_idx" ON "xero_sync_cursors"("clerk_org_id");

-- CreateIndex
CREATE INDEX "xero_sync_cursors_organisation_id_idx" ON "xero_sync_cursors"("organisation_id");

-- CreateIndex
CREATE INDEX "xero_sync_cursors_xero_tenant_id_idx" ON "xero_sync_cursors"("xero_tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "xero_sync_cursors_xero_tenant_id_entity_type_key" ON "xero_sync_cursors"("xero_tenant_id", "entity_type");

-- AddForeignKey
ALTER TABLE "xero_connections" ADD CONSTRAINT "xero_connections_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_tenants" ADD CONSTRAINT "xero_tenants_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_tenants" ADD CONSTRAINT "xero_tenants_xero_connection_id_fkey" FOREIGN KEY ("xero_connection_id") REFERENCES "xero_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_sync_cursors" ADD CONSTRAINT "xero_sync_cursors_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xero_sync_cursors" ADD CONSTRAINT "xero_sync_cursors_xero_tenant_id_fkey" FOREIGN KEY ("xero_tenant_id") REFERENCES "xero_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
