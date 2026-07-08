import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IStakeholderRepository } from '../domain/stakeholders.repository.interface';
import {
  CreateStakeholderData, StakeholderWithContact, UpdateStakeholderData,
  calculatePowerInterestQuadrant,
} from '../domain/stakeholder.entity';

const WITH_CONTACT = {
  contact: { select: { id: true, name: true, email: true, phone: true } },
} as const;

type Row = Omit<StakeholderWithContact, 'quadrant'>;

function toItem(row: Row): StakeholderWithContact {
  return { ...row, quadrant: calculatePowerInterestQuadrant(row.influence, row.interest) };
}

@Injectable()
export class StakeholdersPrismaRepository implements IStakeholderRepository {
  constructor(private prisma: PrismaService) {}

  async findAllByProject(projectId: string): Promise<StakeholderWithContact[]> {
    const rows = await this.prisma.projectStakeholder.findMany({
      where: { projectId },
      include: WITH_CONTACT,
      orderBy: { createdAt: 'asc' },
      take: 200,
    });
    return rows.map((r) => toItem(r as Row));
  }

  async findById(id: string): Promise<StakeholderWithContact | null> {
    const row = await this.prisma.projectStakeholder.findUnique({
      where: { id },
      include: WITH_CONTACT,
    });
    return row ? toItem(row as Row) : null;
  }

  async create(data: CreateStakeholderData): Promise<StakeholderWithContact> {
    const row = await this.prisma.projectStakeholder.create({ data, include: WITH_CONTACT });
    return toItem(row as Row);
  }

  async update(id: string, data: UpdateStakeholderData): Promise<StakeholderWithContact> {
    const row = await this.prisma.projectStakeholder.update({
      where: { id },
      data,
      include: WITH_CONTACT,
    });
    return toItem(row as Row);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.projectStakeholder.delete({ where: { id } });
  }
}
