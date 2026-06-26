/*
  Warnings:

  - You are about to drop the column `budget` on the `Project` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "RiskProbability" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "RiskImpact" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- AlterTable
ALTER TABLE "Project" DROP COLUMN "budget",
ADD COLUMN     "clientName" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "objective" TEXT,
ADD COLUMN     "sponsor" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Charter" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "purpose" TEXT,
    "scope" TEXT,
    "outOfScope" TEXT,
    "assumptions" TEXT,
    "constraints" TEXT,
    "stakeholders" TEXT,
    "successCriteria" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Charter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WbsNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "WbsNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "wbsNodeId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "storyPoints" INTEGER,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "predecessorId" TEXT NOT NULL,
    "successorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Risk" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "ownerId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "probability" "RiskProbability" NOT NULL DEFAULT 'MEDIUM',
    "impact" "RiskImpact" NOT NULL DEFAULT 'MEDIUM',
    "score" INTEGER NOT NULL,
    "response" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Risk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reached" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Charter_projectId_key" ON "Charter"("projectId");

-- CreateIndex
CREATE INDEX "WbsNode_projectId_idx" ON "WbsNode"("projectId");

-- CreateIndex
CREATE INDEX "WbsNode_parentId_idx" ON "WbsNode"("parentId");

-- CreateIndex
CREATE INDEX "Task_projectId_idx" ON "Task"("projectId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "Task"("status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_idx" ON "Task"("assigneeId");

-- CreateIndex
CREATE INDEX "Task_wbsNodeId_idx" ON "Task"("wbsNodeId");

-- CreateIndex
CREATE INDEX "Task_deletedAt_idx" ON "Task"("deletedAt");

-- CreateIndex
CREATE INDEX "TaskDependency_predecessorId_idx" ON "TaskDependency"("predecessorId");

-- CreateIndex
CREATE INDEX "TaskDependency_successorId_idx" ON "TaskDependency"("successorId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_predecessorId_successorId_key" ON "TaskDependency"("predecessorId", "successorId");

-- CreateIndex
CREATE INDEX "Risk_projectId_idx" ON "Risk"("projectId");

-- CreateIndex
CREATE INDEX "Risk_score_idx" ON "Risk"("score");

-- CreateIndex
CREATE INDEX "Risk_deletedAt_idx" ON "Risk"("deletedAt");

-- CreateIndex
CREATE INDEX "Milestone_projectId_idx" ON "Milestone"("projectId");

-- CreateIndex
CREATE INDEX "Milestone_date_idx" ON "Milestone"("date");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Project_createdById_idx" ON "Project"("createdById");

-- CreateIndex
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

-- AddForeignKey
ALTER TABLE "Charter" ADD CONSTRAINT "Charter_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsNode" ADD CONSTRAINT "WbsNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WbsNode" ADD CONSTRAINT "WbsNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WbsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_wbsNodeId_fkey" FOREIGN KEY ("wbsNodeId") REFERENCES "WbsNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_predecessorId_fkey" FOREIGN KEY ("predecessorId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_successorId_fkey" FOREIGN KEY ("successorId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Risk" ADD CONSTRAINT "Risk_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
