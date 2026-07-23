import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { IProjectRepository } from '../domain/project.repository';
import {
  CreateProjectData,
  ProjectAccessEntity,
  ProjectWithRelations,
  UpdateProjectData,
} from '../domain/project.entity';

const WITH_RELATIONS = {
  createdBy: { select: { id: true, name: true } },
  baselineSetBy: { select: { id: true, name: true } },
  client: { select: { id: true, legalName: true, tradeName: true } },
  accesses: { include: { user: { select: { id: true, name: true } } } },
  // Equipe declarada no TAP. É o vínculo com o projeto para quem é interno e
  // portanto não precisa de ProjectAccess — sem isso o seletor de responsável
  // de tarefa só oferecia o criador do projeto.
  charter: { select: { team: { select: { user: { select: { id: true, name: true } } } } } },
  // Prazos das atividades para calcular o término dinâmico (maior dueDate).
  tasks: { where: { deletedAt: null }, select: { dueDate: true } },
} as const;

@Injectable()
export class ProjectsPrismaRepository implements IProjectRepository {
  constructor(private prisma: PrismaService) {}

  async findAll({ excludeCancelled }: { excludeCancelled: boolean }): Promise<ProjectWithRelations[]> {
    return this.prisma.project.findMany({
      where: excludeCancelled ? { status: { not: ProjectStatus.CANCELLED } } : undefined,
      include: WITH_RELATIONS,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }) as Promise<ProjectWithRelations[]>;
  }

  async findAllByUserId(userId: string): Promise<ProjectWithRelations[]> {
    return this.prisma.project.findMany({
      where: {
        accesses: { some: { userId } },
        status: { not: ProjectStatus.CANCELLED },
      },
      include: WITH_RELATIONS,
      orderBy: { createdAt: 'desc' },
      take: 100,
    }) as Promise<ProjectWithRelations[]>;
  }

  async findById(id: string): Promise<ProjectWithRelations | null> {
    return this.prisma.project.findUnique({
      where: { id },
      include: WITH_RELATIONS,
    }) as Promise<ProjectWithRelations | null>;
  }

  async create(data: CreateProjectData): Promise<ProjectWithRelations> {
    return this.prisma.project.create({
      data,
      include: WITH_RELATIONS,
    }) as Promise<ProjectWithRelations>;
  }

  async update(id: string, data: UpdateProjectData): Promise<ProjectWithRelations> {
    return this.prisma.project.update({
      where: { id },
      data,
      include: WITH_RELATIONS,
    }) as Promise<ProjectWithRelations>;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.prisma.project.update({
      where: { id },
      data: { status: status as ProjectStatus },
    });
  }

  async delete(id: string): Promise<void> {
    // Hard delete: o cascade do schema (onDelete: Cascade) remove tasks, riscos,
    // marcos, WBS, charter, stakeholders e acessos. LabOrder tem projectId
    // opcional → é desvinculado (SetNull), preservando o histórico do LIMS.
    await this.prisma.project.delete({ where: { id } });
  }

  async setBaseline(projectId: string, userId: string): Promise<ProjectWithRelations> {
    // Copia as datas atuais das atividades para os campos de baseline (PMBOK).
    await this.prisma.$transaction([
      this.prisma.$executeRaw`
        UPDATE "Task"
        SET "baselineStart" = "startDate", "baselineEnd" = "dueDate"
        WHERE "projectId" = ${projectId} AND "deletedAt" IS NULL
      `,
      this.prisma.project.update({
        where: { id: projectId },
        data: { baselineSetAt: new Date(), baselineSetById: userId },
      }),
    ]);

    return this.prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: WITH_RELATIONS,
    }) as Promise<ProjectWithRelations>;
  }

  async grantAccess(projectId: string, userId: string, grantedById: string): Promise<ProjectAccessEntity> {
    return this.prisma.projectAccess.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: {},
      create: { projectId, userId, grantedById },
    });
  }

  async revokeAccess(projectId: string, userId: string): Promise<void> {
    const { count } = await this.prisma.projectAccess.deleteMany({
      where: { projectId, userId },
    });
    if (count === 0) throw new NotFoundException('Acesso não encontrado');
  }
}
