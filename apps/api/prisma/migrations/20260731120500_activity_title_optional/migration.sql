-- AlterTable
-- Tarefa do CRM passa a se identificar pelo tipo, não por título livre.
ALTER TABLE "Activity" ALTER COLUMN "title" DROP NOT NULL;
