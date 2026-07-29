-- Corresponsáveis por tarefa e por risco.
--
-- Pedido na reunião de teste de 28/07/2026: "responsável de tarefa pode ter mais
-- de uma pessoa" e o mesmo para risco.
--
-- MODELAGEM, e por que não é uma N:N pura:
--   `Task.assigneeId` e `Risk.ownerId` CONTINUAM existindo, como responsável
--   PRINCIPAL. Estas tabelas guardam quem divide a responsabilidade.
--
--   Mover todo mundo para a N:N obrigaria a reescrever, de uma vez, kanban,
--   backlog, Gantt, Atividades, filtros de "minhas tarefas", dashboard e o
--   contrato de `packages/shared` — além de quebrar o `assigneeId` que já está
--   em produção e exigir backfill. Do jeito escolhido, a migration é ADITIVA:
--   nenhuma linha existente muda, nada precisa ser convertido, e não há a
--   segunda publicação que o procedimento de migration destrutiva exigiria
--   (docs/deploy.md §3).
--
-- Se um dia todos os responsáveis tiverem de ser iguais (sem "principal"), aí
-- sim é uma mudança destrutiva e vai em duas publicações.

-- CreateTable
CREATE TABLE "TaskCoAssignee" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCoAssignee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskCoOwner" (
    "id" TEXT NOT NULL,
    "riskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskCoOwner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskCoAssignee_taskId_userId_key" ON "TaskCoAssignee"("taskId", "userId");
CREATE INDEX "TaskCoAssignee_taskId_idx" ON "TaskCoAssignee"("taskId");
CREATE INDEX "TaskCoAssignee_userId_idx" ON "TaskCoAssignee"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RiskCoOwner_riskId_userId_key" ON "RiskCoOwner"("riskId", "userId");
CREATE INDEX "RiskCoOwner_riskId_idx" ON "RiskCoOwner"("riskId");
CREATE INDEX "RiskCoOwner_userId_idx" ON "RiskCoOwner"("userId");

-- AddForeignKey
ALTER TABLE "TaskCoAssignee" ADD CONSTRAINT "TaskCoAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskCoAssignee" ADD CONSTRAINT "TaskCoAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskCoOwner" ADD CONSTRAINT "RiskCoOwner_riskId_fkey" FOREIGN KEY ("riskId") REFERENCES "Risk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RiskCoOwner" ADD CONSTRAINT "RiskCoOwner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
