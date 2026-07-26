import {
  PrismaClient,
  SystemRole,
  ProjectStatus,
  PartyType,
  DocumentType,
  OrganizationStatus,
  PartyRoleType,
  CustomerStage,
  StakeholderType,
  StageType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedDemoProject } from './seeds/demo-project';

const prisma = new PrismaClient();

// ── Taxonomias e funil padrão do CRM (§3.7 do modulo_CRM.md) ────────────────
// Semeados para o kanban não abrir vazio; o admin edita a partir daí.

const SECTORS = ['Indústria Food', 'Indústria Fuels', 'Indústria Feed', 'ICT', 'Biotecnologia'];
const SOURCES = ['Network', 'Evento', 'Site', 'Busca ativa', 'UpLab'];
const ENGAGEMENT_STAGES = ['Laboratório', 'Piloto', 'Escala'];
const CATEGORIES = ['Cliente', 'Fornecedor', 'Parceiro', 'Agência de fomento'];
const PRODUCT_SERVICES = ['Análise laboratorial', 'Desenvolvimento de produto', 'Consultoria técnica', 'Escala piloto'];

const DEFAULT_PIPELINE_STAGES: Array<{
  name: string; type: StageType; probability: number; color: string;
}> = [
  { name: 'Novo',         type: StageType.OPEN, probability: 10,  color: '#878787' },
  { name: 'Qualificação', type: StageType.OPEN, probability: 30,  color: '#DD8005' },
  { name: 'Proposta',     type: StageType.OPEN, probability: 60,  color: '#46AD48' },
  { name: 'Negociação',   type: StageType.OPEN, probability: 80,  color: '#147F23' },
  { name: 'Ganho',        type: StageType.WON,  probability: 100, color: '#156D1D' },
  { name: 'Perdido',      type: StageType.LOST, probability: 0,   color: '#C0392B' },
];

async function seedCrmDefaults() {
  for (const [order, name] of SECTORS.entries()) {
    await prisma.sector.upsert({ where: { name }, update: {}, create: { name, order } });
  }
  for (const [order, name] of SOURCES.entries()) {
    await prisma.organizationSource.upsert({ where: { name }, update: {}, create: { name, order } });
  }
  for (const [order, name] of ENGAGEMENT_STAGES.entries()) {
    await prisma.engagementStage.upsert({ where: { name }, update: {}, create: { name, order } });
  }
  for (const [order, name] of CATEGORIES.entries()) {
    await prisma.category.upsert({ where: { name }, update: {}, create: { name, order } });
  }
  for (const [order, name] of PRODUCT_SERVICES.entries()) {
    await prisma.productService.upsert({ where: { name }, update: {}, create: { name, order } });
  }

  await prisma.pipeline.upsert({
    where: { id: 'pipeline-default' },
    update: {},
    create: {
      id: 'pipeline-default',
      name: 'Comercial',
      isDefault: true,
      stages: {
        create: DEFAULT_PIPELINE_STAGES.map((stage, order) => ({ ...stage, order })),
      },
    },
  });
}

// Senhas de demonstração só valem contra um banco local. Num banco remoto
// (Railway) a URL é pública e `admin123` seria uma porta destrancada na
// internet — então exigimos senha por env e abortamos se faltar.
const LOCAL_DB = /@(localhost|127\.0\.0\.1|host\.docker\.internal|postgres)[:/]/.test(
  process.env.DATABASE_URL ?? '',
);

function seedPassword(envVar: string, localDefault: string): string {
  const fromEnv = process.env[envVar];
  if (fromEnv) {
    if (fromEnv.length < 8) {
      throw new Error(`${envVar} precisa ter ao menos 8 caracteres.`);
    }
    return fromEnv;
  }
  if (!LOCAL_DB) {
    throw new Error(
      `Banco remoto detectado e ${envVar} não definida. Defina SEED_ADMIN_PASSWORD, ` +
      'SEED_LIDER_PASSWORD e SEED_CLIENTE_PASSWORD antes de semear fora do localhost.',
    );
  }
  return localDefault;
}

async function main() {
  // Resolve as senhas ANTES de qualquer escrita: se faltar env num banco remoto,
  // o seed aborta com o banco intacto em vez de deixar meia taxonomia gravada.
  const passwords = {
    admin: seedPassword('SEED_ADMIN_PASSWORD', 'admin123'),
    lider: seedPassword('SEED_LIDER_PASSWORD', 'lider123'),
    cliente: seedPassword('SEED_CLIENTE_PASSWORD', 'cliente123'),
    // A equipe do projeto demo também é PADRAO: mesma exigência.
    demo: seedPassword('SEED_DEMO_PASSWORD', 'demo123'),
  };

  await seedCrmDefaults();

  const adminHash = await bcrypt.hash(passwords.admin, 10);
  const liderHash = await bcrypt.hash(passwords.lider, 10);
  const clienteHash = await bcrypt.hash(passwords.cliente, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@bioinfood.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@bioinfood.com',
      passwordHash: adminHash,
      role: SystemRole.ADMIN,
    },
  });

  const lider = await prisma.user.upsert({
    where: { email: 'lider@bioinfood.com' },
    update: {},
    create: {
      name: 'Líder de Projeto',
      email: 'lider@bioinfood.com',
      passwordHash: liderHash,
      role: SystemRole.PADRAO,
    },
  });

  // Contato de negócio do cliente externo (a pessoa física que acessa o portal).
  const clienteContact = await prisma.contact.upsert({
    where: { id: 'contact-cliente-externo' },
    update: {},
    create: {
      id: 'contact-cliente-externo',
      name: 'Cliente Externo',
      email: 'cliente@bioinfood.com',
    },
  });

  const cliente = await prisma.user.upsert({
    where: { email: 'cliente@bioinfood.com' },
    update: {},
    create: {
      name: 'Cliente Externo',
      email: 'cliente@bioinfood.com',
      passwordHash: clienteHash,
      role: SystemRole.CLIENTE,
      contactId: clienteContact.id,
    },
  });

  // Organizações (dados mestres) usadas como Project.clientId.
  const ambev = await prisma.organization.upsert({
    where: { id: 'org-ambev-research' },
    update: {},
    create: {
      id: 'org-ambev-research',
      partyType: PartyType.COMPANY,
      legalName: 'Ambev Research S.A.',
      tradeName: 'Ambev Research',
      documentType: DocumentType.CNPJ,
      status: OrganizationStatus.ACTIVE,
      roles: { create: { type: PartyRoleType.CUSTOMER } },
      customerProfile: { create: { stage: CustomerStage.ACTIVE, salesRepId: lider.id } },
    },
  });

  const bioinfoodInterno = await prisma.organization.upsert({
    where: { id: 'org-bioinfood-interno' },
    update: {},
    create: {
      id: 'org-bioinfood-interno',
      partyType: PartyType.COMPANY,
      legalName: 'Bioinfood Ltda.',
      tradeName: 'Bioinfood Interno',
      documentType: DocumentType.CNPJ,
      status: OrganizationStatus.ACTIVE,
      roles: { create: { type: PartyRoleType.CUSTOMER } },
      customerProfile: { create: { stage: CustomerStage.ACTIVE } },
    },
  });

  // Vincula a pessoa do portal à empresa dela — sem isso ela aparece sem empresa
  // na tabela de Pessoas, que é justamente a informação mais útil ali.
  await prisma.contactOrganizationLink.upsert({
    where: { contactId_orgId: { contactId: clienteContact.id, orgId: ambev.id } },
    update: { jobTitle: 'Contato do projeto' },
    create: { contactId: clienteContact.id, orgId: ambev.id, jobTitle: 'Contato do projeto' },
  });

  const projeto1 = await prisma.project.upsert({
    where: { id: 'proj-001' },
    update: {},
    create: {
      id: 'proj-001',
      name: 'Desenvolvimento de Levedura Especializada',
      description: 'Pesquisa e desenvolvimento de levedura para fermentação de alta eficiência em cervejas artesanais.',
      status: ProjectStatus.IN_PROGRESS,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-12-31'),
      clientId: ambev.id,
      createdById: lider.id,
      stakeholders: {
        create: {
          contactId: clienteContact.id,
          type: StakeholderType.SPONSOR,
        },
      },
    },
  });

  const projeto2 = await prisma.project.upsert({
    where: { id: 'proj-002' },
    update: {},
    create: {
      id: 'proj-002',
      name: 'Otimização de Processo Fermentativo',
      description: 'Análise e otimização do processo de fermentação para redução de custos e aumento de rendimento.',
      status: ProjectStatus.PLANNING,
      startDate: new Date('2024-03-01'),
      clientId: bioinfoodInterno.id,
      createdById: admin.id,
    },
  });

  await prisma.projectAccess.upsert({
    where: { projectId_userId: { projectId: projeto1.id, userId: cliente.id } },
    update: {},
    create: {
      projectId: projeto1.id,
      userId: cliente.id,
      grantedById: lider.id,
    },
  });

  // Projeto de demonstração completo (TAP, EAP, 45 tarefas, roadmap, riscos e
  // partes interessadas) — serve de vitrine para avaliar as telas sem cadastrar
  // nada à mão. Recriado a cada execução.
  const demo = await seedDemoProject(prisma, admin.id, lider.id, passwords.demo);

  await prisma.projectAccess.upsert({
    where: { projectId_userId: { projectId: demo.projectId, userId: cliente.id } },
    update: {},
    create: {
      projectId: demo.projectId,
      userId: cliente.id,
      grantedById: lider.id,
    },
  });

  console.log(`Seed concluído com sucesso. Projeto demo: ${demo.taskCount} tarefas.`);
}

main()
  // Sai com código 1: encadeado num deploy (`seed && ...`), engolir o erro
  // faria o passo seguinte rodar como se o banco estivesse semeado.
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
