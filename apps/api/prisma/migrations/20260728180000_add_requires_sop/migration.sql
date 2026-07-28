-- Task.requiresSOP: se a tarefa exige procedimento operacional padrão.
--
-- Corrige o denominador da métrica de cobertura de POPs, que hoje conta tarefa
-- administrativa ("reunião de kickoff", "fechar contrato") como trabalho sem
-- procedimento registrado.
--
-- ADITIVA e com DEFAULT true de propósito: nenhuma linha existente muda de
-- comportamento e a métrica NÃO se move sozinha no dia do deploy. O número só
-- anda quando alguém classificar uma tarefa como não aplicável, pela ação em
-- massa da tela de Metodologia. Ver docs/planejamento-ui-projetos.md, Onda 5.
--
-- Como não remove nem reescreve coluna, não exige as duas publicações do
-- procedimento de migration destrutiva (docs/deploy.md §3).

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "requiresSOP" BOOLEAN NOT NULL DEFAULT true;
