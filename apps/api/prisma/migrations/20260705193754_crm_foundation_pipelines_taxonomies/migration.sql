-- CreateEnum
CREATE TYPE "StageType" AS ENUM ('OPEN', 'WON', 'LOST');

-- Data migration: PROSPECT/INACTIVE eram semântica COMERCIAL, que agora mora
-- em CustomerProfile.stage. Como higiene de registro, esses cadastros são ACTIVE.
UPDATE "Organization" SET "status" = 'ACTIVE' WHERE "status" IN ('PROSPECT', 'INACTIVE');

-- AlterEnum
-- Recriação transaction-safe (a migration inteira já roda numa transação do
-- Prisma; BEGIN/COMMIT internos e ADD VALUE quebram nesse contexto).
CREATE TYPE "OrganizationStatus_new" AS ENUM ('ACTIVE', 'ARCHIVED');
ALTER TABLE "Organization" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Organization" ALTER COLUMN "status" TYPE "OrganizationStatus_new" USING ("status"::text::"OrganizationStatus_new");
ALTER TYPE "OrganizationStatus" RENAME TO "OrganizationStatus_old";
ALTER TYPE "OrganizationStatus_new" RENAME TO "OrganizationStatus";
DROP TYPE "OrganizationStatus_old";
ALTER TABLE "Organization" ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- AlterEnum
-- Mesmo padrão de recriação para adicionar valores sem ADD VALUE.
CREATE TYPE "PartyRoleType_new" AS ENUM ('CUSTOMER', 'SUPPLIER', 'CARRIER', 'PARTNER', 'FUNDING_AGENCY', 'RESEARCH_INSTITUTION');
ALTER TABLE "PartyRole" ALTER COLUMN "type" TYPE "PartyRoleType_new" USING ("type"::text::"PartyRoleType_new");
ALTER TYPE "PartyRoleType" RENAME TO "PartyRoleType_old";
ALTER TYPE "PartyRoleType_new" RENAME TO "PartyRoleType";
DROP TYPE "PartyRoleType_old";

-- DropIndex
DROP INDEX "Opportunity_stage_idx";

-- AlterTable
ALTER TABLE "Opportunity" DROP COLUMN "stage",
ADD COLUMN     "closedAt" TIMESTAMP(3),
ADD COLUMN     "engagementStageId" TEXT,
ADD COLUMN     "pipelineId" TEXT NOT NULL,
ADD COLUMN     "stageId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Organization" DROP COLUMN "segment",
DROP COLUMN "source",
ADD COLUMN     "sectorId" TEXT,
ADD COLUMN     "sourceId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- DropEnum
DROP TYPE "OpportunityStage";

-- CreateTable
CREATE TABLE "Sector" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementStage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EngagementStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pipeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pipeline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineStage" (
    "id" TEXT NOT NULL,
    "pipelineId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StageType" NOT NULL DEFAULT 'OPEN',
    "probability" INTEGER NOT NULL DEFAULT 0,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PipelineStage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sector_name_key" ON "Sector"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationSource_name_key" ON "OrganizationSource"("name");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementStage_name_key" ON "EngagementStage"("name");

-- CreateIndex
CREATE INDEX "Pipeline_deletedAt_idx" ON "Pipeline"("deletedAt");

-- CreateIndex
CREATE INDEX "PipelineStage_pipelineId_idx" ON "PipelineStage"("pipelineId");

-- CreateIndex
CREATE INDEX "Opportunity_pipelineId_stageId_idx" ON "Opportunity"("pipelineId", "stageId");

-- CreateIndex
CREATE INDEX "Opportunity_stageId_idx" ON "Opportunity"("stageId");

-- CreateIndex
CREATE INDEX "Opportunity_deletedAt_idx" ON "Opportunity"("deletedAt");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "Sector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "OrganizationSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PipelineStage" ADD CONSTRAINT "PipelineStage_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "PipelineStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Opportunity" ADD CONSTRAINT "Opportunity_engagementStageId_fkey" FOREIGN KEY ("engagementStageId") REFERENCES "EngagementStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

