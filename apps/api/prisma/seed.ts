import { PrismaClient, SystemRole, ProjectStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const liderHash = await bcrypt.hash('lider123', 10);
  const clienteHash = await bcrypt.hash('cliente123', 10);

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
      role: SystemRole.APROVA,
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
    },
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
      clientName: 'Ambev Research',
      createdById: lider.id,
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
      clientName: 'Bioinfood Interno',
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

  console.log('Seed concluído com sucesso.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
