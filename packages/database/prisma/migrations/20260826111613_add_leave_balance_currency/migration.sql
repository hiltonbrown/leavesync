-- AlterEnum
ALTER TYPE "leave_balance_unit" ADD VALUE 'currency';

-- AlterTable
ALTER TABLE "leave_balances" ADD COLUMN     "currency_code" VARCHAR(3),
ADD COLUMN     "source_payload_json" JSONB;
