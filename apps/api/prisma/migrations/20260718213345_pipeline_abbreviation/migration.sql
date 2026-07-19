-- AlterTable
ALTER TABLE "Pipeline" ADD COLUMN     "abbreviation" TEXT NOT NULL DEFAULT '';

-- Backfill: 3 primeiras letras do nome, maiúsculas, para funis já existentes.
UPDATE "Pipeline" SET "abbreviation" = UPPER(LEFT(REGEXP_REPLACE(name, '[^a-zA-ZÀ-ÿ]', '', 'g'), 3));
