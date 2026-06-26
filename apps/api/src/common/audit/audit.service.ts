import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry {
  actorId?: string;
  action: string;
  entity: string;
  entityId: string;
  before?: object | null;
  after?: object | null;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: entry.actorId ?? null,
          action: entry.action,
          entity: entry.entity,
          entityId: entry.entityId,
          before: entry.before ?? undefined,
          after: entry.after ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', { entry, err });
    }
  }
}
