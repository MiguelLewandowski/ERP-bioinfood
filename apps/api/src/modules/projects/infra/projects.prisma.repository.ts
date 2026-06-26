import { Injectable } from '@nestjs/common';
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
  accesses: { include: { user: { select: { id: true, name: true } } } },
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

  async grantAccess(projectId: string, userId: string, grantedById: string): Promise<ProjectAccessEntity> {
    return this.prisma.projectAccess.upsert({
      where: { projectId_userId: { projectId, userId } },
      update: {},
      create: { projectId, userId, grantedById },
    });
  }
}
