-- CreateTable
CREATE TABLE "leave_balances" (
    "id" UUID NOT NULL,
    "clerk_org_id" TEXT NOT NULL,
    "organisation_id" UUID NOT NULL,
    "person_id" UUID NOT NULL,
    "xero_tenant_id" UUID NOT NULL,
    "leave_type_xero_id" TEXT NOT NULL,
    "balance" DECIMAL(12,4) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_balances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_person_id_xero_tenant_id_leave_type_xero_id_key" ON "leave_balances"("person_id", "xero_tenant_id", "leave_type_xero_id");

-- CreateIndex
CREATE INDEX "leave_balances_clerk_org_id_idx" ON "leave_balances"("clerk_org_id");

-- CreateIndex
CREATE INDEX "leave_balances_organisation_id_idx" ON "leave_balances"("organisation_id");

-- CreateIndex
CREATE INDEX "leave_balances_person_id_idx" ON "leave_balances"("person_id");

-- CreateIndex
CREATE INDEX "leave_balances_xero_tenant_id_idx" ON "leave_balances"("xero_tenant_id");

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "organisations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "people"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_xero_tenant_id_fkey" FOREIGN KEY ("xero_tenant_id") REFERENCES "xero_tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
