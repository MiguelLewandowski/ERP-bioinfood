import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { ProjectAccessGuard } from './project-access.guard';

const PROJECT_ID = 'project-abc';
const USER_ID = 'user-xyz';

function makeContext(
  user: { id: string; role: SystemRole },
  projectId: string | undefined,
  hasAccess: boolean,
) {
  const prisma = {
    projectAccess: {
      findUnique: vi.fn().mockResolvedValue(hasAccess ? { projectId: PROJECT_ID, userId: USER_ID } : null),
    },
  } as any;

  const guard = new ProjectAccessGuard(prisma);

  const ctx = {
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        params: projectId ? { projectId } : {},
      }),
    }),
  } as any;

  return { guard, ctx, prisma };
}

describe('ProjectAccessGuard', () => {
  it('should return true when route has no :projectId param', async () => {
    const { guard, ctx } = makeContext({ id: USER_ID, role: SystemRole.CLIENTE }, undefined, false);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should return true when user is PADRAO (non-CLIENTE)', async () => {
    const { guard, ctx } = makeContext({ id: USER_ID, role: SystemRole.PADRAO }, PROJECT_ID, false);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should return true when user is ADMIN', async () => {
    const { guard, ctx } = makeContext({ id: USER_ID, role: SystemRole.ADMIN }, PROJECT_ID, false);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should return true when CLIENTE has ProjectAccess', async () => {
    const { guard, ctx } = makeContext({ id: USER_ID, role: SystemRole.CLIENTE }, PROJECT_ID, true);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('should throw ForbiddenException when CLIENTE has no ProjectAccess', async () => {
    const { guard, ctx } = makeContext({ id: USER_ID, role: SystemRole.CLIENTE }, PROJECT_ID, false);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('should query prisma with correct projectId and userId when CLIENTE', async () => {
    const { guard, ctx, prisma } = makeContext({ id: USER_ID, role: SystemRole.CLIENTE }, PROJECT_ID, true);
    await guard.canActivate(ctx);
    expect(prisma.projectAccess.findUnique).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: PROJECT_ID, userId: USER_ID } },
    });
  });

  it('should NOT query prisma when user is not CLIENTE', async () => {
    const { guard, ctx, prisma } = makeContext({ id: USER_ID, role: SystemRole.PADRAO }, PROJECT_ID, false);
    await guard.canActivate(ctx);
    expect(prisma.projectAccess.findUnique).not.toHaveBeenCalled();
  });
});
