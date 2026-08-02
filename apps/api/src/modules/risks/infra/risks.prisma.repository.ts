import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IRiskRepository } from '../domain/risks.repository.interface';
import { CreateRiskData, RiskWithOwner, UpdateRiskData } from '../domain/risk.entity';

const WITH_OWNER = {
  owner: { select: { id: true, name: true } },
  coOwners: { select: { user: { select: { id: true, name: true } } } },
} as const;

/**
 * Separa os corresponsáveis do resto dos campos.
 *
 * `coOwnerIds` não é coluna de `Risk` — mandá-lo direto para o Prisma quebraria
 * o update. Ausente significa "não mexer na lista"; presente substitui a lista
 * inteira, que é o que o formulário envia.
 */
function splitCoOwners<T extends { coOwnerIds?: string[] }>(data: T) {
  const { coOwnerIds, ...rest } = data;
  const coOwners = coOwnerIds === undefined
    ? undefined
    : { deleteMany: {}, create: coOwnerIds.map((userId) => ({ userId })) };
  return { rest, coOwners };
}

@Injectable()
export class RisksPrismaRepository implements IRiskRepository {
  constructor(private prisma: PrismaService) {}

  findAllByProject(projectId: string): Promise<RiskWithOwner[]> {
    return this.prisma.risk.findMany({
      where: { projectId, deletedAt: null },
      include: WITH_OWNER,
      orderBy: { score: 'desc' },
      take: 100,
    }) as Promise<RiskWithOwner[]>;
  }

  findById(id: string): Promise<RiskWithOwner | null> {
    return this.prisma.risk.findFirst({
      where: { id, deletedAt: null },
      include: WITH_OWNER,
    }) as Promise<RiskWithOwner | null>;
  }

  create(data: CreateRiskData & { score: number }): Promise<RiskWithOwner> {
    const { rest, coOwners } = splitCoOwners(data);
    return this.prisma.risk.create({
      data: { ...rest, ...(coOwners ? { coOwners: { create: coOwners.create } } : {}) },
      include: WITH_OWNER,
    }) as Promise<RiskWithOwner>;
  }

  update(id: string, data: UpdateRiskData & { score?: number }): Promise<RiskWithOwner> {
    const { rest, coOwners } = splitCoOwners(data);
    return this.prisma.risk.update({
      where: { id },
      data: { ...rest, ...(coOwners ? { coOwners } : {}) },
      include: WITH_OWNER,
    }) as Promise<RiskWithOwner>;
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.risk.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
