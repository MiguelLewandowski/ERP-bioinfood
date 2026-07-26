/**
 * Apaga TODOS os dados do banco, preservando o schema e o histórico de
 * migrations. Serve para limpar os dados de teste do ambiente do Railway sem
 * ter que derrubar e recriar o Postgres.
 *
 * Trava dupla de propósito: um `TRUNCATE CASCADE` disparado por engano contra a
 * DATABASE_URL errada é irreversível.
 *   1. exige ALLOW_DATA_RESET=yes
 *   2. exige que o host do banco confira com RESET_DB_HOST_CONFIRM
 *
 * Uso:
 *   ALLOW_DATA_RESET=yes RESET_DB_HOST_CONFIRM=<host> pnpm --filter @bioinfood/api prisma:reset-data
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Tabelas que NÃO podem ser truncadas: o Prisma usa esta para saber quais
// migrations já rodaram — limpar faria a próxima migration tentar recriar tudo.
const PRESERVED = new Set(['_prisma_migrations']);

function dbHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida.');
  try {
    return new URL(url).host;
  } catch {
    throw new Error('DATABASE_URL não é uma URL válida.');
  }
}

async function main() {
  const host = dbHost();

  if (process.env.ALLOW_DATA_RESET !== 'yes') {
    throw new Error(
      `Recusado. Este comando apaga todos os dados de ${host}. ` +
      'Para confirmar, rode com ALLOW_DATA_RESET=yes.',
    );
  }

  const confirm = process.env.RESET_DB_HOST_CONFIRM;
  if (confirm !== host) {
    throw new Error(
      `Confirmação de host não confere. A DATABASE_URL atual aponta para "${host}". ` +
      `Repita esse host em RESET_DB_HOST_CONFIRM para prosseguir (recebido: "${confirm ?? 'vazio'}").`,
    );
  }

  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;

  const tables = rows.map((r) => r.tablename).filter((t) => !PRESERVED.has(t));
  if (tables.length === 0) {
    console.log('Nenhuma tabela para limpar.');
    return;
  }

  // Um único TRUNCATE com todas as tabelas: CASCADE resolve as FKs e a operação
  // é atômica — não sobra estado meio-apagado se algo falhar no meio.
  const list = tables.map((t) => `"public"."${t}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);

  console.log(`Dados apagados de ${tables.length} tabelas em ${host}.`);
  console.log('Rode o seed novamente se quiser repovoar o ambiente.');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
