-- AlterTable
ALTER TABLE "Charter" DROP COLUMN "resources",
ADD COLUMN     "budget" DECIMAL(14,2),
ADD COLUMN     "infrastructure" TEXT;

-- CreateTable
CREATE TABLE "CharterTeamMember" (
    "id" TEXT NOT NULL,
    "charterId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CharterTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CharterTeamMember_charterId_idx" ON "CharterTeamMember"("charterId");

-- CreateIndex
CREATE INDEX "CharterTeamMember_userId_idx" ON "CharterTeamMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CharterTeamMember_charterId_userId_key" ON "CharterTeamMember"("charterId", "userId");

-- AddForeignKey
ALTER TABLE "CharterTeamMember" ADD CONSTRAINT "CharterTeamMember_charterId_fkey" FOREIGN KEY ("charterId") REFERENCES "Charter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharterTeamMember" ADD CONSTRAINT "CharterTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
