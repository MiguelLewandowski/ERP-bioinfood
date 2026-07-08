import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const projectId: string | undefined = req.params?.projectId;

    if (!projectId) return true;

    const user = req.user as { id: string; role: SystemRole };
    if (user.role !== SystemRole.PORTAL) return true;

    const access = await this.prisma.projectAccess.findUnique({
      where: { projectId_userId: { projectId, userId: user.id } },
    });

    if (!access) throw new ForbiddenException('Sem acesso a este projeto');
    return true;
  }
}
