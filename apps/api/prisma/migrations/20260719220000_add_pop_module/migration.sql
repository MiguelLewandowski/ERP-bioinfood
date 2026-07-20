-- CreateTable
CREATE TABLE "Pop" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Pop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PopVersion" (
    "id" TEXT NOT NULL,
    "popId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "changeNotes" TEXT,
    "fileUrl" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PopVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskPop" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "popVersionId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskPop_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Pop_projectId_idx" ON "Pop"("projectId");

-- CreateIndex
CREATE INDEX "Pop_deletedAt_idx" ON "Pop"("deletedAt");

-- CreateIndex
CREATE INDEX "PopVersion_popId_idx" ON "PopVersion"("popId");

-- CreateIndex
CREATE UNIQUE INDEX "PopVersion_popId_versionNumber_key" ON "PopVersion"("popId", "versionNumber");

-- CreateIndex
CREATE INDEX "TaskPop_taskId_idx" ON "TaskPop"("taskId");

-- CreateIndex
CREATE INDEX "TaskPop_popVersionId_idx" ON "TaskPop"("popVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskPop_taskId_popVersionId_key" ON "TaskPop"("taskId", "popVersionId");

-- AddForeignKey
ALTER TABLE "Pop" ADD CONSTRAINT "Pop_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopVersion" ADD CONSTRAINT "PopVersion_popId_fkey" FOREIGN KEY ("popId") REFERENCES "Pop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PopVersion" ADD CONSTRAINT "PopVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPop" ADD CONSTRAINT "TaskPop_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPop" ADD CONSTRAINT "TaskPop_popVersionId_fkey" FOREIGN KEY ("popVersionId") REFERENCES "PopVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskPop" ADD CONSTRAINT "TaskPop_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

