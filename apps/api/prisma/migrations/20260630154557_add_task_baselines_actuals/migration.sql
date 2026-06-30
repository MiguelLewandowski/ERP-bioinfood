-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "baselineSetAt" TIMESTAMP(3),
ADD COLUMN     "baselineSetById" TEXT;

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "actualEnd" TIMESTAMP(3),
ADD COLUMN     "actualStart" TIMESTAMP(3),
ADD COLUMN     "baselineEnd" TIMESTAMP(3),
ADD COLUMN     "baselineStart" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_baselineSetById_fkey" FOREIGN KEY ("baselineSetById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
