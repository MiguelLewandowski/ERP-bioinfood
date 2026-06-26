/*
  Warnings:

  - You are about to drop the column `purpose` on the `Charter` table. All the data in the column will be lost.
  - You are about to drop the column `successCriteria` on the `Charter` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Charter" DROP COLUMN "purpose",
DROP COLUMN "successCriteria",
ADD COLUMN     "deliverables" TEXT,
ADD COLUMN     "dependencies" TEXT,
ADD COLUMN     "governance" TEXT,
ADD COLUMN     "justification" TEXT,
ADD COLUMN     "kpis" TEXT,
ADD COLUMN     "mainObjective" TEXT,
ADD COLUMN     "priority" TEXT,
ADD COLUMN     "problem" TEXT,
ADD COLUMN     "projectOwner" TEXT,
ADD COLUMN     "projectType" TEXT,
ADD COLUMN     "resources" TEXT,
ADD COLUMN     "specificObjectives" TEXT,
ADD COLUMN     "team" TEXT;

-- AlterTable
ALTER TABLE "WbsNode" ADD COLUMN     "outputs" TEXT,
ADD COLUMN     "owner" TEXT,
ADD COLUMN     "readyCriteria" TEXT;
