/**
 * Remove APENAS os dados criados pelo seed, preservando tudo que foi cadastrado
 * à mão. É o oposto cirúrgico do `reset-data.ts`, que trunca o banco inteiro.
 *
 * Funciona porque todo registro do seed nasce com identificador determinístico:
 * id fixo (`proj-001`, `org-nutrivale`, `pop-demo-*`) ou e-mail fixo. Qualquer
 * coisa fora dessas listas é dado real e não é tocada.
 *
 * O que NÃO é apagado, por decisão:
 *   - admin@bioinfood.com — é o login de administração do ambiente.
 *   - Taxonomias e o funil padrão do CRM (setores, fontes, categorias,
 *     produtos, pipeline "Comercial") — são configuração, não dado de teste.
 *
 * Uso (dry-run: só lista, não apaga):
 *   pnpm db:unseed
 *
 * Uso (apaga de verdade):
 *   UNSEED_CONFIRM=yes UNSEED_DB_HOST_CONFIRM=<host> pnpm db:unseed
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ── O que o seed cria (espelha seed.ts e seeds/demo-project.ts) ──────────────

const SEED_PROJECT_IDS = ['proj-001', 'proj-002', 'proj-demo-ingredientes'];

/** Preservado sempre: sem ele não há como entrar no ambiente. */
const KEEP_USER_EMAILS = ['admin@bioinfood.com'];

const SEED_USER_EMAILS = [
  'admin@bioinfood.com',
  'lider@bioinfood.com',
  'cliente@bioinfood.com',
  'marina@bioinfood.com',
  'rafael@bioinfood.com',
  'juliana@bioinfood.com',
  'thiago@bioinfood.com',
  'camila@bioinfood.com',
].filter((email) => !KEEP_USER_EMAILS.includes(email));

const SEED_CONTACT_IDS = [
  'contact-cliente-externo',
  'ct-sponsor',
  'ct-marina',
  'ct-rafael',
  'ct-juliana',
  'ct-thiago',
  'ct-planta',
  'ct-regulatorio',
  'ct-fomento',
];

const SEED_ORG_IDS = ['org-ambev-research', 'org-bioinfood-interno', 'org-nutrivale'];

const SEED_POP_IDS = ['pop-demo-centesimal', 'pop-demo-reator', 'pop-demo-micro'];

const SEED_POP_CATEGORY_IDS = [
  'popcat-analitico',
  'popcat-processo',
  'popcat-qualidade',
  'popcat-geral',
];

// ── Travas ───────────────────────────────────────────────────────────────────

function dbHost(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL não definida.');
  try {
    return new URL(url).host;
  } catch {
    throw new Error('DATABASE_URL não é uma URL válida.');
  }
}

const plan: string[] = [];
const skipped: string[] = [];

function willDelete(what: string, count: number) {
  if (count > 0) plan.push(`${count.toString().padStart(4)} × ${what}`);
}

function skip(reason: string) {
  skipped.push(reason);
}

// ── Levantamento: o que existe e o que está preso a dado real ────────────────

/**
 * Um registro do seed pode ter sido referenciado por algo cadastrado à mão
 * depois (uma empresa do seed com negócio real, um usuário do seed que criou um
 * projeto de verdade). Nesses casos preservamos o registro e avisamos — apagar
 * levaria dado real junto por cascata, ou quebraria numa FK no meio da operação.
 */
async function analyze() {
  const projects = await prisma.project.findMany({
    where: { id: { in: SEED_PROJECT_IDS } },
    select: { id: true, name: true },
  });

  const users = await prisma.user.findMany({
    where: { email: { in: SEED_USER_EMAILS } },
    select: { id: true, email: true },
  });

  // Bloqueios de usuário: relações obrigatórias (Restrict) que sobrevivem à
  // remoção dos projetos do seed — ou seja, apontam para dado real.
  const deletableUsers: typeof users = [];
  for (const user of users) {
    const [createdProjects, accesses, granted, popVersions, taskPops, charterTeams] =
      await Promise.all([
        prisma.project.count({ where: { createdById: user.id, id: { notIn: SEED_PROJECT_IDS } } }),
        prisma.projectAccess.count({ where: { userId: user.id, projectId: { notIn: SEED_PROJECT_IDS } } }),
        prisma.projectAccess.count({ where: { grantedById: user.id, projectId: { notIn: SEED_PROJECT_IDS } } }),
        prisma.popVersion.count({ where: { createdById: user.id, popId: { notIn: SEED_POP_IDS } } }),
        prisma.taskPop.count({ where: { addedById: user.id, task: { projectId: { notIn: SEED_PROJECT_IDS } } } }),
        prisma.charterTeamMember.count({
          where: { userId: user.id, charter: { projectId: { notIn: SEED_PROJECT_IDS } } },
        }),
      ]);

    const blockers = [
      createdProjects && `criou ${createdProjects} projeto(s) real(is)`,
      accesses && `tem acesso a ${accesses} projeto(s) real(is)`,
      granted && `concedeu ${granted} acesso(s)`,
      popVersions && `assinou ${popVersions} versão(ões) de POP`,
      taskPops && `vinculou POP a ${taskPops} tarefa(s)`,
      charterTeams && `está em ${charterTeams} equipe(s) de TAP`,
    ].filter(Boolean) as string[];

    if (blockers.length > 0) {
      skip(`usuário ${user.email} preservado — ${blockers.join('; ')}. Desative-o pela tela de usuários.`);
    } else {
      deletableUsers.push(user);
    }
  }

  // Bloqueios de organização: cascata em Opportunity/Interaction/CustomerProfile.
  // Se houver negócio ou interação real pendurada, a empresa fica.
  const orgs = await prisma.organization.findMany({
    where: { id: { in: SEED_ORG_IDS } },
    select: { id: true, tradeName: true, legalName: true },
  });
  const deletableOrgs: typeof orgs = [];
  for (const org of orgs) {
    const [opportunities, interactions, realProjects, labOrders] = await Promise.all([
      prisma.opportunity.count({ where: { orgId: org.id } }),
      prisma.interaction.count({ where: { opportunity: { orgId: org.id } } }),
      prisma.project.count({ where: { clientId: org.id, id: { notIn: SEED_PROJECT_IDS } } }),
      prisma.labOrder.count({ where: { orgId: org.id } }),
    ]);
    const blockers = [
      opportunities && `${opportunities} negócio(s)`,
      interactions && `${interactions} interação(ões)`,
      realProjects && `${realProjects} projeto(s) real(is)`,
      labOrders && `${labOrders} ordem(ns) de análise`,
    ].filter(Boolean) as string[];

    if (blockers.length > 0) {
      skip(`empresa ${org.tradeName ?? org.legalName} preservada — tem ${blockers.join(', ')}.`);
    } else {
      deletableOrgs.push(org);
    }
  }

  // Bloqueios de contato: ProjectStakeholder e Charter.projectOwnerId são
  // Restrict; LabOrder também. Só some quem não é citado por dado real.
  const contacts = await prisma.contact.findMany({
    where: { id: { in: SEED_CONTACT_IDS } },
    select: { id: true, name: true },
  });
  const deletableContacts: typeof contacts = [];
  for (const contact of contacts) {
    const [stakeholderIn, ownedCharters, labOrders] = await Promise.all([
      prisma.projectStakeholder.count({
        where: { contactId: contact.id, projectId: { notIn: SEED_PROJECT_IDS } },
      }),
      prisma.charter.count({
        where: { projectOwnerId: contact.id, projectId: { notIn: SEED_PROJECT_IDS } },
      }),
      prisma.labOrder.count({ where: { requesterId: contact.id } }),
    ]);
    const blockers = [
      stakeholderIn && `parte interessada em ${stakeholderIn} projeto(s) real(is)`,
      ownedCharters && `dona de ${ownedCharters} TAP(s)`,
      labOrders && `solicitante de ${labOrders} ordem(ns) de análise`,
    ].filter(Boolean) as string[];

    if (blockers.length > 0) {
      skip(`pessoa ${contact.name} preservada — ${blockers.join('; ')}.`);
    } else {
      deletableContacts.push(contact);
    }
  }

  // POPs do seed: só saem se nenhuma tarefa real os estiver usando.
  const pops = await prisma.pop.findMany({
    where: { id: { in: SEED_POP_IDS } },
    select: { id: true, title: true },
  });
  const deletablePops: typeof pops = [];
  for (const pop of pops) {
    const usedByReal = await prisma.taskPop.count({
      where: { popVersion: { popId: pop.id }, task: { projectId: { notIn: SEED_PROJECT_IDS } } },
    });
    if (usedByReal > 0) {
      skip(`POP "${pop.title}" preservado — usado por ${usedByReal} tarefa(s) real(is).`);
    } else {
      deletablePops.push(pop);
    }
  }

  // Categorias de POP: só sai a que ficará vazia depois da remoção acima.
  // Se o usuário criou um POP próprio numa dessas categorias, ela fica.
  const deletablePopIds = deletablePops.map((p) => p.id);
  const popCategories = await prisma.popCategory.findMany({
    where: { id: { in: SEED_POP_CATEGORY_IDS } },
    select: { id: true, name: true, pops: { select: { id: true } } },
  });
  const deletablePopCategories = popCategories.filter((category) =>
    category.pops.every((pop) => deletablePopIds.includes(pop.id)),
  );

  return {
    projects,
    users: deletableUsers,
    orgs: deletableOrgs,
    contacts: deletableContacts,
    pops: deletablePops,
    popCategories: deletablePopCategories,
  };
}

// ── Execução ─────────────────────────────────────────────────────────────────

async function main() {
  const host = dbHost();
  const confirmed = process.env.UNSEED_CONFIRM === 'yes';

  const found = await analyze();

  willDelete('projeto(s) do seed (com tarefas, EAP, TAP, riscos, marcos)', found.projects.length);
  willDelete('usuário(s) do seed', found.users.length);
  willDelete('empresa(s) do seed', found.orgs.length);
  willDelete('pessoa(s) do seed', found.contacts.length);
  willDelete('POP(s) de demonstração', found.pops.length);
  willDelete('categoria(s) de POP vazias', found.popCategories.length);

  console.log(`\nBanco: ${host}\n`);

  if (plan.length === 0) {
    console.log('Nada do seed encontrado — o banco já está limpo desses dados.');
  } else {
    console.log('Será apagado:');
    plan.forEach((line) => console.log(`  ${line}`));
    console.log('\nDetalhe:');
    found.projects.forEach((p) => console.log(`  projeto  ${p.id} — ${p.name}`));
    found.users.forEach((u) => console.log(`  usuário  ${u.email}`));
    found.orgs.forEach((o) => console.log(`  empresa  ${o.tradeName ?? o.legalName}`));
    found.contacts.forEach((c) => console.log(`  pessoa   ${c.name}`));
    found.pops.forEach((p) => console.log(`  POP      ${p.title}`));
  }

  if (skipped.length > 0) {
    console.log('\nPreservado (tem dado real dependendo):');
    skipped.forEach((line) => console.log(`  - ${line}`));
  }

  // O cadastro de estoque não entra no plano de remoção: item de estoque é
  // cadastro real da casa, nunca sai do seed (só a categoria "Equipamento" sai,
  // e ela é taxonomia). A checklist dos TAPs some junto com os projetos, por
  // cascata em Charter.
  console.log(
    '\nPreservado sempre: admin@bioinfood.com, taxonomias (inclusive as categorias ' +
    'de estoque), o cadastro de estoque e o funil padrão do CRM.',
  );

  if (!confirmed) {
    console.log(
      '\nDRY-RUN — nada foi apagado. Para executar de verdade:\n' +
      `  UNSEED_CONFIRM=yes UNSEED_DB_HOST_CONFIRM=${host} pnpm db:unseed`,
    );
    return;
  }

  const hostConfirm = process.env.UNSEED_DB_HOST_CONFIRM;
  if (hostConfirm !== host) {
    throw new Error(
      `Confirmação de host não confere. A DATABASE_URL atual aponta para "${host}". ` +
      `Repita esse host em UNSEED_DB_HOST_CONFIRM (recebido: "${hostConfirm ?? 'vazio'}").`,
    );
  }

  if (plan.length === 0) return;

  // Tudo numa transação: se uma FK inesperada barrar no meio, o banco volta ao
  // estado anterior em vez de ficar meio-limpo.
  await prisma.$transaction(async (tx) => {
    // 1. Projetos primeiro: cascateiam tarefas, EAP, TAP, riscos, marcos,
    //    partes interessadas, acessos e os vínculos POP↔tarefa.
    await tx.project.deleteMany({ where: { id: { in: found.projects.map((p) => p.id) } } });

    // 2. POPs (versões saem por cascata) e depois as categorias que esvaziaram.
    await tx.pop.deleteMany({ where: { id: { in: found.pops.map((p) => p.id) } } });
    await tx.popCategory.deleteMany({
      where: { id: { in: found.popCategories.map((c) => c.id) } },
    });

    // 3. Usuários: refresh tokens saem por cascata; AuditLog.actorId e as
    //    demais referências opcionais viram NULL sozinhas (SetNull).
    await tx.user.deleteMany({ where: { id: { in: found.users.map((u) => u.id) } } });

    // 4. Pessoas e empresas do seed (vínculos pessoa↔empresa saem por cascata).
    await tx.contact.deleteMany({ where: { id: { in: found.contacts.map((c) => c.id) } } });
    await tx.organization.deleteMany({ where: { id: { in: found.orgs.map((o) => o.id) } } });
  });

  console.log('\nDados do seed removidos. O restante do banco está intacto.');
}

main()
  .catch((err) => {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      console.error(
        'Uma chave estrangeira barrou a remoção — algum registro do seed é referenciado ' +
        'por dado real que este script não previu. Nada foi apagado.',
      );
    }
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
