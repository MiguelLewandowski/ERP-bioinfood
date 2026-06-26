import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICharterRepository } from '../domain/charter.repository.interface';
import { CharterEntity, UpsertCharterData } from '../domain/charter.entity';

@Injectable()
export class CharterPrismaRepository implements ICharterRepository {
  constructor(private prisma: PrismaService) {}

  findByProject(projectId: string): Promise<CharterEntity | null> {
    return this.prisma.charter.findUnique({ where: { projectId } });
  }

  upsert(projectId: string, data: UpsertCharterData): Promise<CharterEntity> {
    return this.prisma.charter.upsert({
      where: { projectId },
      update: data,
      create: { projectId, ...data },
    });
  }

  approve(projectId: string, approvedById: string): Promise<CharterEntity> {
    return this.prisma.charter.update({
      where: { projectId },
      data: { approvedById, approvedAt: new Date() },
    });
  }
}
