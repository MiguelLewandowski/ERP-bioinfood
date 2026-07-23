import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IPopRepository } from '../domain/pops.repository.interface';
import {
  CreatePopData,
  CreatePopVersionData,
  PopCategoryEntity,
  PopWithLatestVersion,
  PopWithVersions,
  UpdatePopData,
} from '../domain/pop.entity';
import { PopFilter } from '../domain/pops.repository.interface';

const AUTHOR = { select: { id: true, name: true } } as const;
const CATEGORY = { select: { id: true, name: true } } as const;

@Injectable()
export class PopsPrismaRepository implements IPopRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: PopFilter = {}): Promise<PopWithLatestVersion[]> {
    const search = filter.search?.trim();
    const rows = await this.prisma.pop.findMany({
      where: {
        deletedAt: null,
        ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
        // `mode: insensitive` é do conector Postgres — busca sem acentuação
        // continua sensível a acento, o que é aceitável para título de POP.
        ...(search
          ? {
              OR: [
                { title: { contains: search, mode: 'insensitive' as const } },
                { description: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      include: {
        category: CATEGORY,
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
        category: CATEGORY,
        versions: {
          orderBy: { versionNumber: 'desc' },
          include: { createdBy: AUTHOR },
        },
      },
    });
    return row as PopWithVersions | null;
  }

  async findCategories(): Promise<PopCategoryEntity[]> {
    return this.prisma.popCategory.findMany({
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      take: 100,
    });
  }

  async createCategory(name: string): Promise<PopCategoryEntity> {
    const last = await this.prisma.popCategory.findFirst({
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    return this.prisma.popCategory.create({
      data: { name, order: (last?.order ?? -1) + 1 },
    });
  }

  async updateCategory(id: string, data: { name?: string; isActive?: boolean }): Promise<PopCategoryEntity> {
    return this.prisma.popCategory.update({ where: { id }, data });
  }

  async countPopsInCategory(categoryId: string): Promise<number> {
    return this.prisma.pop.count({ where: { categoryId, deletedAt: null } });
  }

  async deleteCategory(id: string): Promise<void> {
    await this.prisma.popCategory.delete({ where: { id } });
  }

  async categoryExists(id: string): Promise<boolean> {
    const found = await this.prisma.popCategory.findUnique({ where: { id }, select: { id: true } });
    return !!found;
  }

  async create(data: CreatePopData): Promise<PopWithVersions> {
    const pop = await this.prisma.pop.create({
      data: {
        title: data.title,
        description: data.description,
        categoryId: data.categoryId,
        versions: {
          create: {
            versionNumber: 1,
            fileUrl: data.fileUrl,
            createdById: data.createdById,
          },
        },
      },
      include: {
        category: CATEGORY,
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

  async findVersionRef(popVersionId: string): Promise<{ id: string } | null> {
    const version = await this.prisma.popVersion.findUnique({
      where: { id: popVersionId },
      select: { id: true, pop: { select: { deletedAt: true } } },
    });
    if (!version || version.pop.deletedAt) return null;
    return { id: version.id };
  }
}
