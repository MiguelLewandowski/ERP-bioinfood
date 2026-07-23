import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { AuditService, redactSensitive } from './audit.service';
import { PrismaService } from '../../prisma/prisma.service';

function makePrisma() {
  return {
    auditLog: { create: vi.fn().mockResolvedValue({ id: 'log1' }) },
  } as unknown as PrismaService;
}

describe('redactSensitive', () => {
  it('should strip the password hash of a raw user row', () => {
    const row = { id: 'u1', email: 'marina@bioinfood.com', passwordHash: '$2b$10$abc' };

    expect(redactSensitive(row)).toEqual({ id: 'u1', email: 'marina@bioinfood.com' });
  });

  it('should strip sensitive keys regardless of casing', () => {
    const row = { id: 'u1', PasswordHash: 'x', refreshToken: 'y', SECRET: 'z' };

    expect(redactSensitive(row)).toEqual({ id: 'u1' });
  });

  it('should strip sensitive keys nested in objects and arrays', () => {
    const row = { id: 'p1', owner: { id: 'u1', passwordHash: 'x' }, members: [{ passwordHash: 'y', name: 'Rafael' }] };

    expect(redactSensitive(row)).toEqual({ id: 'p1', owner: { id: 'u1' }, members: [{ name: 'Rafael' }] });
  });

  it('should preserve Date values instead of walking into them', () => {
    const createdAt = new Date('2026-07-23T12:00:00.000Z');

    const result = redactSensitive({ id: 'p1', createdAt });

    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.createdAt.toISOString()).toBe('2026-07-23T12:00:00.000Z');
  });

  it('should preserve Prisma Decimal values instead of walking into them', () => {
    const budget = new Prisma.Decimal('1500.50');

    const result = redactSensitive({ id: 'p1', budget });

    expect(result.budget).toBeInstanceOf(Prisma.Decimal);
    expect(result.budget.toString()).toBe('1500.5');
  });

  it('should pass through null and primitives untouched', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive({ id: 'p1', endDate: null, done: false, points: 0 }))
      .toEqual({ id: 'p1', endDate: null, done: false, points: 0 });
  });
});

describe('AuditService', () => {
  let prisma: PrismaService;
  let service: AuditService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new AuditService(prisma);
  });

  it('should never persist a password hash in before or after', async () => {
    await service.log({
      actorId: 'admin1',
      action: 'UPDATE',
      entity: 'users',
      entityId: 'u1',
      before: { id: 'u1', name: 'Marina', passwordHash: '$2b$10$old' },
      after: { id: 'u1', name: 'Marina Souza', passwordHash: '$2b$10$new' },
    });

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0][0].data;
    expect(data.before).toEqual({ id: 'u1', name: 'Marina' });
    expect(data.after).toEqual({ id: 'u1', name: 'Marina Souza' });
    expect(JSON.stringify(data)).not.toContain('$2b$10$');
  });

  it('should keep the non-sensitive fields of the entry', async () => {
    await service.log({
      actorId: 'admin1',
      action: 'DELETE',
      entity: 'tasks',
      entityId: 't1',
      before: { id: 't1', title: 'Extração piloto' },
      after: null,
    });

    const data = vi.mocked(prisma.auditLog.create).mock.calls[0][0].data;
    expect(data).toMatchObject({ actorId: 'admin1', action: 'DELETE', entity: 'tasks', entityId: 't1' });
    expect(data.before).toEqual({ id: 't1', title: 'Extração piloto' });
  });

  it('should not leak the hash into the application log when the write fails', async () => {
    prisma = {
      auditLog: { create: vi.fn().mockRejectedValue(new Error('db down')) },
    } as unknown as PrismaService;
    service = new AuditService(prisma);
    const errorSpy = vi.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await service.log({
      action: 'UPDATE',
      entity: 'users',
      entityId: 'u1',
      before: { id: 'u1', passwordHash: '$2b$10$old' },
    });

    expect(JSON.stringify(errorSpy.mock.calls[0])).not.toContain('$2b$10$');
  });
});
