import { describe, it, expect } from 'vitest';
import { TaskStatus } from '@prisma/client';
import { assertTaskStatusTransition } from './task-status.machine';

/**
 * A regra anterior obrigava passar por IN_PROGRESS para chegar em DONE. Isso
 * não descrevia o trabalho real — tarefa curta é concluída sem nunca ter sido
 * formalmente iniciada — e quem usava o sistema batia em "Transição de status
 * inválida" tanto ao arrastar no kanban quanto ao salvar pelo formulário.
 *
 * Reportado na reunião de teste de 28/07/2026 (Bruna e Luana).
 */
describe('assertTaskStatusTransition', () => {
  it('should allow closing a task that was never started', () => {
    expect(() => assertTaskStatusTransition(TaskStatus.TODO, TaskStatus.DONE)).not.toThrow();
  });

  it('should allow reopening a done task straight to todo', () => {
    expect(() => assertTaskStatusTransition(TaskStatus.DONE, TaskStatus.TODO)).not.toThrow();
  });

  it('should allow the ordinary path through in progress', () => {
    expect(() => assertTaskStatusTransition(TaskStatus.TODO, TaskStatus.IN_PROGRESS)).not.toThrow();
    expect(() => assertTaskStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.DONE)).not.toThrow();
  });

  it('should allow sending a task back to todo', () => {
    expect(() => assertTaskStatusTransition(TaskStatus.IN_PROGRESS, TaskStatus.TODO)).not.toThrow();
  });

  it('should allow reopening a done task', () => {
    expect(() => assertTaskStatusTransition(TaskStatus.DONE, TaskStatus.IN_PROGRESS)).not.toThrow();
  });

  // Salvar sem mexer no status não é transição.
  it('should treat a no-op as valid', () => {
    for (const status of Object.values(TaskStatus)) {
      expect(() => assertTaskStatusTransition(status, status)).not.toThrow();
    }
  });
});
