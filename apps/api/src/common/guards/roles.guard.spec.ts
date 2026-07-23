import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SystemRole } from '@prisma/client';
import { RolesGuard } from './roles.guard';

function makeContext(user: { role: SystemRole }, roles: SystemRole[] | undefined) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(roles) } as unknown as Reflector;
  const guard = new RolesGuard(reflector);
  const ctx = {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
  return { guard, ctx };
}

describe('RolesGuard', () => {
  it('should return true when no @Roles() decorator is present', () => {
    const { guard, ctx } = makeContext({ role: SystemRole.PADRAO }, undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when user is ADMIN regardless of required roles', () => {
    const { guard, ctx } = makeContext({ role: SystemRole.ADMIN }, [SystemRole.PADRAO]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should return true when user role matches required roles', () => {
    const { guard, ctx } = makeContext({ role: SystemRole.PADRAO }, [SystemRole.PADRAO]);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('should throw ForbiddenException when user role is not in required roles', () => {
    const { guard, ctx } = makeContext({ role: SystemRole.CLIENTE }, [SystemRole.PADRAO]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  // Só ADMIN passa nas rotas de usuários, CRM e exclusão definitiva.
  it('should throw ForbiddenException when PADRAO tries to access an admin-only route', () => {
    const { guard, ctx } = makeContext({ role: SystemRole.PADRAO }, [SystemRole.ADMIN]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException when CLIENTE tries to access PADRAO-only route', () => {
    const { guard, ctx } = makeContext({ role: SystemRole.CLIENTE }, [SystemRole.PADRAO]);
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
