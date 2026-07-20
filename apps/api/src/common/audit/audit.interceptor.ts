import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, from, switchMap, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

const CUID_RE = /^c[a-z0-9]{24}$/;

// Segmento de rota (plural, como aparece na URL) → delegate do Prisma Client.
// Só entidades com PK simples `id` e mapeamento 1:1 direto entram aqui;
// o resto fica sem `before` (best-effort, nunca bloqueia a mutação).
const ENTITY_MODEL: Record<string, string> = {
  projects: 'project',
  tasks: 'task',
  risks: 'risk',
  milestones: 'milestone',
  pops: 'pop',
  charter: 'charter',
  wbs: 'wbsNode',
  stakeholders: 'projectStakeholder',
  organizations: 'organization',
  contacts: 'contact',
  interactions: 'interaction',
  opportunities: 'opportunity',
  pipelines: 'pipeline',
  users: 'user',
};

function resolveEntity(path: string): { entity: string; entityId: string } {
  const segments = path.replace(/^\//, '').split('/');
  // /projects/abc/tasks/def → entity=tasks, entityId=def
  // /projects/abc           → entity=projects, entityId=abc
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg && CUID_RE.test(seg)) {
      return { entity: segments[i - 1] ?? 'unknown', entityId: seg };
    }
  }
  return { entity: segments[segments.length - 1] ?? 'unknown', entityId: 'new' };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(
    private auditService: AuditService,
    private prisma: PrismaService,
  ) {}

  private async captureBefore(entity: string, entityId: string): Promise<object | null> {
    const model = ENTITY_MODEL[entity];
    if (!model) return null;
    try {
      const delegate = (this.prisma as unknown as Record<string, { findUnique: (args: unknown) => Promise<unknown> }>)[model];
      return ((await delegate.findUnique({ where: { id: entityId } })) as object | null) ?? null;
    } catch (err) {
      this.logger.warn(`Falha ao capturar estado anterior de ${entity}/${entityId}`, err as Error);
      return null;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      user?: { id?: string };
    }>();
    const method = req.method.toUpperCase();
    const start = Date.now();

    this.logger.log(`→ ${method} ${req.path}`);

    const { entity, entityId } = resolveEntity(req.path);
    // Para POST o id só existe depois do handler (vem do corpo da resposta);
    // para PATCH/PUT/DELETE o id já está na URL, então dá pra buscar o "antes".
    const canCaptureBefore = MUTATION_METHODS.has(method) && method !== 'POST' && entityId !== 'new';

    return from(canCaptureBefore ? this.captureBefore(entity, entityId) : Promise.resolve(null)).pipe(
      switchMap((before) =>
        next.handle().pipe(
          tap((body) => {
            this.logger.log(`← ${method} ${req.path} ${Date.now() - start}ms`);

            if (!MUTATION_METHODS.has(method)) return;

            const actorId = req.user?.id;
            const action = method === 'DELETE' ? 'DELETE' : method === 'POST' ? 'CREATE' : 'UPDATE';
            const resolvedId =
              entityId === 'new'
                ? ((body as Record<string, string> | null)?.id ?? 'unknown')
                : entityId;

            void this.auditService.log({
              actorId,
              action,
              entity,
              entityId: resolvedId,
              before,
              after: method !== 'DELETE' ? (body as object) : null,
            });
          }),
        ),
      ),
    );
  }
}
