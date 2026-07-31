-- AlterTable
ALTER TABLE "Interaction" ADD COLUMN "opportunityId" TEXT;

-- CreateIndex
CREATE INDEX "Interaction_opportunityId_idx" ON "Interaction"("opportunityId");

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
