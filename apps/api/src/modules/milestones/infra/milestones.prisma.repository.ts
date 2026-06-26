import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IMilestoneRepository } from '../domain/milestones.repository.interface';
import { CreateMilestoneData, MilestoneEntity, UpdateMilestoneData } from '../domain/milestone.entity';

@Injectable()
export class MilestonesPrismaRepository implements IMilestoneRepository {
  constructor(private prisma: PrismaService) {}

  findAllByProject(projectId: string): Promise<MilestoneEntity[]> {
    return this.prisma.milestone.findMany({
      where: { projectId, deletedAt: null },
      orderBy: { date: 'asc' },
      take: 100,
    });
  }

  findById(id: string): Promise<MilestoneEntity | null> {
    return this.prisma.milestone.findFirst({
      where: { id, deletedAt: null },
    });
  }

  create(data: CreateMilestoneData): Promise<MilestoneEntity> {
    return this.prisma.milestone.create({ data });
  }

  update(id: string, data: UpdateMilestoneData): Promise<MilestoneEntity> {
    return this.prisma.milestone.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.milestone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
