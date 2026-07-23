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

// Chaves que nunca entram na trilha de auditoria, em minúsculas.
// O `before` do interceptor é a linha crua do banco (findUnique sem `select`),
// então sem esta lista o `passwordHash` do User — que todo o resto do código
// exclui via USER_SELECT — seria arquivado a cada PATCH de usuário. Genérica de
// propósito: vale para qualquer coluna sensível futura de qualquer modelo.
const SENSITIVE_KEYS = new Set([
  'passwordhash',
  'password',
  'refreshtoken',
  'refreshtokenhash',
  'accesstoken',
  'secret',
]);

// Só objeto literal é percorrido. Date e Decimal (Project.budget,
// Opportunity.amount, Organization.creditLimit) são objetos com protótipo
// próprio e serializam sozinhos — percorrê-los devolveria os campos internos
// no lugar do valor.
function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

/** Remove chaves sensíveis em profundidade, preservando o resto intacto. */
export function redactSensitive<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item)) as unknown as T;
  if (!isPlainObject(value)) return value;

  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) continue;
    out[key] = redactSensitive(val);
  }
  return out as T;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    // Redigido antes de qualquer uso: o mesmo objeto vai para o banco e, em
    // caso de falha, para o log da aplicação.
    const safe: AuditEntry = {
      ...entry,
      before: redactSensitive(entry.before ?? null),
      after: redactSensitive(entry.after ?? null),
    };

    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: safe.actorId ?? null,
          action: safe.action,
          entity: safe.entity,
          entityId: safe.entityId,
          before: safe.before ?? undefined,
          after: safe.after ?? undefined,
        },
      });
    } catch (err) {
      this.logger.error('Failed to write audit log', { entry: safe, err });
    }
  }
}
