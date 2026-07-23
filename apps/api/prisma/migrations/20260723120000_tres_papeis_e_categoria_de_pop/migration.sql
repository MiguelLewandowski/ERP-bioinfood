-- ═══════════════ 1. SystemRole: 5 papéis → 3 ═══════════════
-- Postgres não remove valor de enum em uso: cria-se o tipo novo, converte a
-- coluna mapeando os valores antigos e troca. APROVA e INSERE viram PADRAO.
-- CONSULTA entra no mesmo mapa por segurança — a base não tem nenhum hoje,
-- mas a migration não pode falhar se tiver.

CREATE TYPE "SystemRole_new" AS ENUM ('ADMIN', 'PADRAO', 'CLIENTE');

ALTER TABLE "User" ALTER COLUMN "role" DROP DEFAULT;

ALTER TABLE "User"
  ALTER COLUMN "role" TYPE "SystemRole_new"
  USING (
    CASE "role"::text
      WHEN 'ADMIN'   THEN 'ADMIN'
      WHEN 'CLIENTE' THEN 'CLIENTE'
      ELSE 'PADRAO'
    END
  )::"SystemRole_new";

DROP TYPE "SystemRole";
ALTER TYPE "SystemRole_new" RENAME TO "SystemRole";

ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PADRAO';

-- ═══════════════ 2. Categoria de POP ═══════════════

CREATE TABLE "PopCategory" (
  "id"        TEXT NOT NULL,
  "name"      TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "order"     INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PopCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PopCategory_name_key" ON "PopCategory"("name");

-- As POPs existentes eram de teste e foram descartadas a pedido, o que permite
-- criar `categoryId` já NOT NULL sem inventar categoria para dado real.
-- TaskPop e PopVersion saem antes por causa das FKs.
DELETE FROM "TaskPop";
DELETE FROM "PopVersion";
DELETE FROM "Pop";

ALTER TABLE "Pop" ADD COLUMN "categoryId" TEXT NOT NULL;

CREATE INDEX "Pop_categoryId_idx" ON "Pop"("categoryId");

ALTER TABLE "Pop"
  ADD CONSTRAINT "Pop_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "PopCategory"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
