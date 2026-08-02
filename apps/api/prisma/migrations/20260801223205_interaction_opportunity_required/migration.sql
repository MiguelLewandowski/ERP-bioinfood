-- Timeline passa a pertencer ao negócio (Opportunity), não mais à empresa (Organization).
-- Interações órfãs (sem opportunityId) são descartadas: são dado de seed/teste em dev,
-- e não há caminho de UI hoje para reatribuí-las a um negócio.
DELETE FROM "Interaction" WHERE "opportunityId" IS NULL;

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_opportunityId_fkey";

-- DropForeignKey
ALTER TABLE "Interaction" DROP CONSTRAINT "Interaction_orgId_fkey";

-- DropIndex
DROP INDEX "Interaction_opportunityId_idx";

-- DropIndex
DROP INDEX "Interaction_orgId_interactionAt_idx";

-- AlterTable
ALTER TABLE "Interaction" DROP COLUMN "orgId",
ALTER COLUMN "opportunityId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Interaction_opportunityId_interactionAt_idx" ON "Interaction"("opportunityId", "interactionAt");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
