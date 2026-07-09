import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICharterRepository } from '../domain/charter.repository.interface';
import { CharterEntity, CharterLastEdit, UpsertCharterData } from '../domain/charter.entity';

const TEAM_INCLUDE = {
  team: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.CharterInclude;

type CharterWithTeam = Prisma.CharterGetPayload<{ include: typeof TEAM_INCLUDE }>;

function toEntity(charter: CharterWithTeam): CharterEntity {
  const { team, budget, ...rest } = charter;
  return {
    ...rest,
    budget: budget === null ? null : budget.toNumber(),
    team: team.map((t) => t.user),
  };
}

@Injectable()
export class CharterPrismaRepository implements ICharterRepository {
  constructor(private prisma: PrismaService) {}

  async findByProject(projectId: string): Promise<CharterEntity | null> {
    const charter = await this.prisma.charter.findUnique({
      where: { projectId },
      include: TEAM_INCLUDE,
    });
    return charter ? toEntity(charter) : null;
  }

  async upsert(projectId: string, data: UpsertCharterData): Promise<CharterEntity> {
    const { teamUserIds, ...scalars } = data;

    const charter = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.charter.upsert({
        where: { projectId },
        update: scalars,
        create: { projectId, ...scalars },
      });

      if (teamUserIds) {
        await tx.charterTeamMember.deleteMany({ where: { charterId: saved.id } });
        if (teamUserIds.length > 0) {
          await tx.charterTeamMember.createMany({
            data: teamUserIds.map((userId) => ({ charterId: saved.id, userId })),
          });
        }
      }

      return tx.charter.findUniqueOrThrow({ where: { id: saved.id }, include: TEAM_INCLUDE });
    });

    return toEntity(charter);
  }

  async approve(projectId: string, approvedById: string): Promise<CharterEntity> {
    const charter = await this.prisma.charter.update({
      where: { projectId },
      data: { approvedById, approvedAt: new Date() },
      include: TEAM_INCLUDE,
    });
    return toEntity(charter);
  }

  // Deriva "quem editou por último" do AuditLog global (AuditInterceptor já
  // grava entity='charter' + entityId=<charter.id> em todo PUT) — sem coluna nova.
  async findLastEdit(charterId: string): Promise<CharterLastEdit | null> {
    const entry = await this.prisma.auditLog.findFirst({
      where: { entityId: charterId, action: 'UPDATE' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, actor: { select: { id: true, name: true } } },
    });
    if (!entry) return null;
    return { actor: entry.actor, at: entry.createdAt };
  }
}
