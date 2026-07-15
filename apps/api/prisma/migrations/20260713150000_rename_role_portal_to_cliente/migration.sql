-- Renomeia o valor do enum SystemRole de 'PORTAL' para 'CLIENTE'.
-- RENAME VALUE preserva as linhas existentes (usuários com PORTAL passam a CLIENTE
-- automaticamente), sem recriar o tipo nem exigir backfill.
ALTER TYPE "SystemRole" RENAME VALUE 'PORTAL' TO 'CLIENTE';
