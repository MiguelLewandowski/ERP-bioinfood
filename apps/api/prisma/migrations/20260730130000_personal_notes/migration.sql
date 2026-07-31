-- Anotações pessoais. ADITIVA: cria uma tabela nova, não toca em nada existente.
--
-- ⚠️ Nota é PRIVADA do dono — nem ADMIN lê. A trava não está aqui nem no
-- RolesGuard: está em o `ownerId` nunca ser parâmetro de entrada na API, vindo
-- sempre do JWT. O FK com ON DELETE CASCADE garante que apagar o usuário leva
-- as notas dele junto, em vez de deixar conteúdo privado órfão no banco.

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Sem título',
    "contentHtml" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Note_ownerId_updatedAt_idx" ON "Note"("ownerId", "updatedAt");

-- CreateIndex
CREATE INDEX "Note_deletedAt_idx" ON "Note"("deletedAt");

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
