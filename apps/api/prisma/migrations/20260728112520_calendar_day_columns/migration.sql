-- Colunas que são DIA DE CALENDÁRIO passam a ter o tipo DATE.
--
-- Motivo: dia de calendário não tem instante. Guardar como TIMESTAMP convidava a
-- reintroduzir o deslocamento de fuso — `new Date(iso)` sobre meia-noite UTC
-- renderiza 21h do dia anterior em America/Sao_Paulo. Com DATE, o banco recusa a
-- hora e o erro não tem por onde entrar.
--
-- NÃO entram aqui, de propósito:
--   Task.startDate / dueDate / baselineStart / baselineEnd / actualStart / actualEnd
--     → tarefa tem hora OPCIONAL; DATE apagaria a hora de todos os registros.
--   Activity.dueDate
--     → é agenda, a hora é a informação.
--   Opportunity.startDate
--     → provavelmente dia puro, mas sem verificação em produção. Não converter
--       sem antes conferir a distribuição de horários.
--
-- Segurança: as quatro colunas foram verificadas antes da conversão e não têm
-- nenhuma linha com componente de hora, então o truncamento de TIMESTAMP para
-- DATE não perde dado. Ver docs/incidentes/timezone-cronograma.md §8.

-- AlterTable
ALTER TABLE "Milestone" ALTER COLUMN "date" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "Opportunity" ALTER COLUMN "expectedCloseDate" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "startDate" SET DATA TYPE DATE,
ALTER COLUMN "endDate" SET DATA TYPE DATE;
