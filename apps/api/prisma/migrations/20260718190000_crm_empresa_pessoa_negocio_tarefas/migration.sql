-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'EMAIL', 'CALL', 'WHATSAPP', 'PROPOSAL', 'MEETING', 'VISIT');

-- AlterTable
ALTER TABLE "Activity" ADD COLUMN     "opportunityId" TEXT,
ADD COLUMN     "type" "ActivityType" NOT NULL DEFAULT 'NOTE';

-- AlterTable
ALTER TABLE "Contact" ADD COLUMN     "sourceId" TEXT;

-- AlterTable
ALTER TABLE "Interaction" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "description" TEXT,
ADD COLUMN     "frozenAt" TIMESTAMP(3),
ADD COLUMN     "startDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "categoryId" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationProductService" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "productServiceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationProductService_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductService_name_key" ON "ProductService"("name");

-- CreateIndex
CREATE INDEX "OrganizationProductService_orgId_idx" ON "OrganizationProductService"("orgId");

-- CreateIndex
CREATE INDEX "OrganizationProductService_productServiceId_idx" ON "OrganizationProductService"("productServiceId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProductService_orgId_productServiceId_key" ON "OrganizationProductService"("orgId", "productServiceId");

-- CreateIndex
CREATE INDEX "Activity_opportunityId_idx" ON "Activity"("opportunityId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contact" ADD CONSTRAINT "Contact_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "OrganizationSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProductService" ADD CONSTRAINT "OrganizationProductService_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProductService" ADD CONSTRAINT "OrganizationProductService_productServiceId_fkey" FOREIGN KEY ("productServiceId") REFERENCES "ProductService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

