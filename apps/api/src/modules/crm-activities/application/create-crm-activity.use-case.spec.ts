import { describe, it, expect, vi } from 'vitest';
import { CreateCrmActivityUseCase } from './create-crm-activity.use-case';
import { ICrmActivityRepository } from '../domain/crm-activity.repository';

describe('CreateCrmActivityUseCase', () => {
  it('chains the activity to its originating interaction', async () => {
    const repo = {
      create: vi.fn().mockImplementation((data) => Promise.resolve({ id: 'act1', ...data })),
    } as unknown as ICrmActivityRepository;
    const useCase = new CreateCrmActivityUseCase(repo);

    await useCase.execute({ orgId: 'o1', interactionId: 'i1', title: 'Enviar proposta' });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ interactionId: 'i1', title: 'Enviar proposta' }),
    );
  });
});
