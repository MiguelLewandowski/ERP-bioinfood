import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ICharterRepository } from '../domain/charter.repository.interface';
import {
  CharterEntity,
  CharterEquipmentEntity,
  CharterLastEdit,
  UpsertCharterData,
} from '../domain/charter.entity';

const TEAM_INCLUDE = {
  team: { include: { user: { select: { id: true, name: true } } } },
} satisfies Prisma.CharterInclude;

const EQUIPMENT_INCLUDE = {
  stockItem: {
    select: {
      id: true,
      name: true,
      code: true,
      unit: true,
      location: true,
      status: true,
      category: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.CharterEquipmentInclude;

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

  // ── Checklist de recursos ─────────────────────────────────────────────────
  //
  // O TAP é criado sob demanda: um projeto pode não ter Charter ainda quando o
  // usuário marca o primeiro equipamento. `ensureCharter` resolve isso — sem
  // ele, marcar um item num projeto sem TAP estouraria FK.

  private async ensureCharter(projectId: string): Promise<string> {
    const charter = await this.prisma.charter.upsert({
      where: { projectId },
      update: {},
      create: { projectId },
      select: { id: true },
    });
    return charter.id;
  }

  async findEquipment(projectId: string): Promise<CharterEquipmentEntity[]> {
    const charter = await this.prisma.charter.findUnique({
      where: { projectId },
      select: { id: true },
    });
    // Projeto sem TAP não tem checklist — lista vazia, não erro. E sem criar
    // um Charter em branco só porque alguém abriu a aba.
    if (!charter) return [];

    return this.prisma.charterEquipment.findMany({
      where: { charterId: charter.id },
      include: EQUIPMENT_INCLUDE,
      orderBy: [
        { stockItem: { category: { order: 'asc' } } },
        { stockItem: { name: 'asc' } },
      ],
    });
  }

  async addEquipment(projectId: string, stockItemId: string): Promise<CharterEquipmentEntity> {
    const charterId = await this.ensureCharter(projectId);
    // Idempotente: clicar duas vezes no mesmo item devolve o vínculo existente
    // em vez de estourar a @@unique([charterId, stockItemId]).
    return this.prisma.charterEquipment.upsert({
      where: { charterId_stockItemId: { charterId, stockItemId } },
      update: {},
      create: { charterId, stockItemId },
      include: EQUIPMENT_INCLUDE,
    });
  }

  async updateEquipment(
    projectId: string,
    id: string,
    data: { checked?: boolean; quantity?: number },
  ): Promise<CharterEquipmentEntity | null> {
    // `updateMany` com o projectId no where: garante que o vínculo pertence ao
    // projeto da rota. Com `update` por id puro, um id de outro projeto seria
    // aceito — é o mesmo cuidado de IDOR já aplicado em tasks.
    const { count } = await this.prisma.charterEquipment.updateMany({
      where: { id, charter: { projectId } },
      data,
    });
    if (count === 0) return null;
    return this.prisma.charterEquipment.findUnique({ where: { id }, include: EQUIPMENT_INCLUDE });
  }

  async removeEquipment(projectId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.charterEquipment.deleteMany({
      where: { id, charter: { projectId } },
    });
    return count > 0;
  }
}
