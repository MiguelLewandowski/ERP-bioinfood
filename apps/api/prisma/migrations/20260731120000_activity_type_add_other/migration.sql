-- AlterEnum
-- Recriação transaction-safe (ADD VALUE não roda dentro da transação da migration).
CREATE TYPE "ActivityType_new" AS ENUM ('NOTE', 'EMAIL', 'CALL', 'WHATSAPP', 'PROPOSAL', 'MEETING', 'VISIT', 'OTHER');
ALTER TABLE "Activity" ALTER COLUMN "type" DROP DEFAULT;
ALTER TABLE "Activity" ALTER COLUMN "type" TYPE "ActivityType_new" USING ("type"::text::"ActivityType_new");
ALTER TYPE "ActivityType" RENAME TO "ActivityType_old";
ALTER TYPE "ActivityType_new" RENAME TO "ActivityType";
DROP TYPE "ActivityType_old";
ALTER TABLE "Activity" ALTER COLUMN "type" SET DEFAULT 'NOTE';
