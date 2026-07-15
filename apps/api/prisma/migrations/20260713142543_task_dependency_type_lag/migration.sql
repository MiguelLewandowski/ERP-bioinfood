-- CreateEnum
CREATE TYPE "TaskDependencyType" AS ENUM ('FS', 'SS', 'FF', 'SF');

-- AlterTable
ALTER TABLE "TaskDependency" ADD COLUMN "type" "TaskDependencyType" NOT NULL DEFAULT 'FS';
ALTER TABLE "TaskDependency" ADD COLUMN "lag" INTEGER NOT NULL DEFAULT 0;
