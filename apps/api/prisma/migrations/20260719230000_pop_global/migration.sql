-- DropForeignKey
ALTER TABLE "Pop" DROP CONSTRAINT "Pop_projectId_fkey";

-- DropIndex
DROP INDEX "Pop_projectId_idx";

-- AlterTable
ALTER TABLE "Pop" DROP COLUMN "projectId";

