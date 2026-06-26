import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';

const MUTATION_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

function resolveEntity(path: string): { entity: string; entityId: string } {
  const segments = path.replace(/^\//, '').split('/');
  // /projects/abc/tasks/def → entity=tasks, entityId=def
  // /projects/abc           → entity=projects, entityId=abc
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i];
    if (seg && !/^[a-z]/.test(seg)) {
      return { entity: segments[i - 1] ?? 'unknown', entityId: seg };
    }
  }
  return { entity: segments[segments.length - 1] ?? 'unknown', entityId: 'new' };
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<{
      method: string;
      path: string;
      user?: { id?: string };
    }>();
    const method = req.method.toUpperCase();
    const start = Date.now();

    this.logger.log(`→ ${method} ${req.path}`);

    return next.handle().pipe(
      tap((body) => {
        this.logger.log(`← ${method} ${req.path} ${Date.now() - start}ms`);

        if (!MUTATION_METHODS.has(method)) return;

        const actorId = req.user?.id;
        const action = method === 'DELETE' ? 'DELETE' : method === 'POST' ? 'CREATE' : 'UPDATE';
        const { entity, entityId } = resolveEntity(req.path);
        const resolvedId =
          entityId === 'new'
            ? ((body as Record<string, string> | null)?.id ?? 'unknown')
            : entityId;

        void this.auditService.log({
          actorId,
          action,
          entity,
          entityId: resolvedId,
          after: method !== 'DELETE' ? (body as object) : null,
        });
      }),
    );
  }
}
