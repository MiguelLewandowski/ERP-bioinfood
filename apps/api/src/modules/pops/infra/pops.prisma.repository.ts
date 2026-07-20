import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPopRepository } from '../domain/pops.repository.interface';
import {
  CreatePopData,
  CreatePopVersionData,
  PopWithLatestVersion,
  PopWithVersions,
  UpdatePopData,
} from '../domain/pop.entity';

const AUTHOR = { select: { id: true, name: true } } as const;

@Injectable()
export class PopsPrismaRepository implements IPopRepository {
  constructor(private prisma: PrismaService) {}

  async findAllByProject(projectId: string): Promise<PopWithLatestVersion[]> {
    const rows = await this.prisma.pop.findMany({
      where: { projectId, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
          include: { createdBy: AUTHOR },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return rows.map((r) => ({ ...r, latestVersion: r.versions[0] })) as PopWithLatestVersion[];
  }

  async findById(id: string): Promise<PopWithVersions | null> {
    const row = await this.prisma.pop.findFirst({
      where: { id, deletedAt: null },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { createdBy: AUTHOR },
        },
      },
    });
    return row as PopWithVersions | null;
  }

  async create(data: CreatePopData): Promise<PopWithVersions> {
    const pop = await this.prisma.pop.create({
      data: {
        projectId: data.projectId,
        title: data.title,
        description: data.description,
        versions: {
          create: {
            versionNumber: 1,
            createdById: data.createdById,
          },
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { createdBy: AUTHOR },
        },
      },
    });
    return pop as PopWithVersions;
  }

  async update(id: string, data: UpdatePopData): Promise<PopWithVersions> {
    await this.prisma.pop.update({ where: { id }, data });
    return (await this.findById(id))!;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.pop.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async nextVersionNumber(popId: string): Promise<number> {
    const last = await this.prisma.popVersion.findFirst({
      where: { popId },
      orderBy: { versionNumber: 'desc' },
      select: { versionNumber: true },
    });
    return (last?.versionNumber ?? 0) + 1;
  }

  async createVersion(popId: string, data: CreatePopVersionData): Promise<PopWithVersions> {
    const versionNumber = await this.nextVersionNumber(popId);
    await this.prisma.popVersion.create({
      data: {
        popId,
        versionNumber,
        changeNotes: data.changeNotes,
        fileUrl: data.fileUrl,
        createdById: data.createdById,
      },
    });
    return (await this.findById(popId))!;
  }

  async findVersionProjectRef(popVersionId: string): Promise<{ id: string; projectId: string } | null> {
    const version = await this.prisma.popVersion.findUnique({
      where: { id: popVersionId },
      select: { id: true, pop: { select: { projectId: true, deletedAt: true } } },
    });
    if (!version || version.pop.deletedAt) return null;
    return { id: version.id, projectId: version.pop.projectId };
  }
}
