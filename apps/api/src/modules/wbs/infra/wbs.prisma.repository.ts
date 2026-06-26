import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IWbsRepository } from '../domain/wbs.repository.interface';
import { CreateWbsNodeData, UpdateWbsNodeData, WbsNodeEntity, WbsNodeWithChildren } from '../domain/wbs-node.entity';

@Injectable()
export class WbsPrismaRepository implements IWbsRepository {
  constructor(private prisma: PrismaService) {}

  findAllByProject(projectId: string): Promise<WbsNodeEntity[]> {
    return this.prisma.wbsNode.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [{ parentId: 'asc' }, { order: 'asc' }],
      take: 100,
    });
  }

  findById(id: string): Promise<WbsNodeWithChildren | null> {
    return this.prisma.wbsNode.findFirst({
      where: { id, deletedAt: null },
      include: {
        children: {
          where: { deletedAt: null },
          orderBy: { order: 'asc' },
        },
        tasks: {
          where: { deletedAt: null },
          select: { id: true, title: true, status: true },
          take: 50,
        },
      },
    }) as Promise<WbsNodeWithChildren | null>;
  }

  create(data: CreateWbsNodeData): Promise<WbsNodeEntity> {
    return this.prisma.wbsNode.create({ data });
  }

  update(id: string, data: UpdateWbsNodeData): Promise<WbsNodeEntity> {
    return this.prisma.wbsNode.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.wbsNode.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
