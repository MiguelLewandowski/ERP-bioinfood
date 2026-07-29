import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { TaskDto } from '@bioinfood/shared';
import { renderWithProviders } from '@/lib/test-utils';
import { useGanttPersistence } from './use-gantt-persistence';

const updateMock = vi.fn();
const reorderMock = vi.fn();
const removeMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  tasksApi: {
    update: (...a: unknown[]) => updateMock(...a),
    reorder: (...a: unknown[]) => reorderMock(...a),
    remove: (...a: unknown[]) => removeMock(...a),
    create: vi.fn(),
    addDependency: vi.fn(),
    removeDependency: vi.fn(),
  },
  milestonesApi: { update: vi.fn(), remove: vi.fn() },
}));

const TASKS = [
  { id: 'task-1', title: 'Preparar bancada', startDate: null, dueDate: null, status: 'TODO' },
  { id: 'task-2', title: 'Rodar ensaio', startDate: null, dueDate: null, status: 'TODO' },
] as unknown as TaskDto[];

/**
 * Store falsa da SVAR: guarda os handlers registrados por `on`/`intercept` e
 * deixa o teste dispará-los. É o mínimo para exercitar o caminho de escrita sem
 * montar o widget inteiro.
 */
function fakeApi(rows: Array<{ id: unknown; parent?: unknown }>) {
  const handlers = new Map<string, Array<(ev: any) => any>>();
  const intercepts = new Map<string, (ev: any) => any>();

  return {
    on: (name: string, fn: (ev: any) => any) => {
      handlers.set(name, [...(handlers.get(name) ?? []), fn]);
    },
    intercept: (name: string, fn: (ev: any) => any) => { intercepts.set(name, fn); },
    exec: vi.fn(),
    getTask: (id: unknown) => rows.find((r) => String(r.id) === String(id)),
    getState: () => ({ tasks: { toArray: () => rows } }),
    fire: (name: string, ev: any) => (handlers.get(name) ?? []).forEach((fn) => fn(ev)),
    runIntercept: (name: string, ev: any) => intercepts.get(name)?.(ev),
  };
}

function mount(api: ReturnType<typeof fakeApi>) {
  function Harness() {
    useGanttPersistence(api, {
      editable: true,
      projectId: 'proj-1',
      token: 'tok',
      links: [],
      tasks: TASKS,
      onError: vi.fn(),
      onEditTask: vi.fn(),
    });
    return null;
  }
  renderWithProviders(<Harness />);
}

/**
 * A guarda por PREFIXO (`ms-`) cobria marcos, mas não linhas de GRUPO: com o
 * `groupBy` da SVAR ligado, o cabeçalho de cada pacote da EAP é uma linha na
 * store com id gerado pela lib. Sem guarda, esses ids viravam escrita — a mesma
 * classe do `<Toolbar>` removido no incidente de fuso.
 *
 * `grp-x` abaixo imita um id gerado pela lib: de propósito NÃO segue convenção
 * nossa, porque o ponto é que a guarda não pode depender de convenção.
 */
describe('useGanttPersistence — linhas que não são tarefa', () => {
  beforeEach(() => {
    updateMock.mockResolvedValue({});
    reorderMock.mockResolvedValue({});
    removeMock.mockResolvedValue({});
  });

  it('should not send a group row to the reorder endpoint', () => {
    const api = fakeApi([
      { id: 'grp-1' },
      { id: 'task-1', parent: 'grp-1' },
      { id: 'grp-2' },
      { id: 'task-2', parent: 'grp-2' },
    ]);
    mount(api);

    api.fire('move-task', { id: 'task-1' });

    expect(reorderMock).toHaveBeenCalledTimes(1);
    const items = reorderMock.mock.calls[0][1] as Array<{ id: string }>;
    expect(items.map((i) => i.id)).toEqual(['task-1', 'task-2']);
  });

  // O caso que corrompia dado: o pai de uma tarefa de primeiro nível passa a ser
  // a linha do PACOTE. Gravar aquele id criaria subtarefa de algo inexistente.
  it('should store a null parent when the parent row is a group', () => {
    const api = fakeApi([{ id: 'grp-1' }, { id: 'task-1', parent: 'grp-1' }]);
    mount(api);

    api.fire('move-task', { id: 'task-1' });

    expect(updateMock).toHaveBeenCalledWith('proj-1', 'task-1', { parentId: null }, 'tok');
  });

  it('should still persist a real subtask parent', () => {
    const api = fakeApi([{ id: 'task-1' }, { id: 'task-2', parent: 'task-1' }]);
    mount(api);

    api.fire('move-task', { id: 'task-2' });

    expect(updateMock).toHaveBeenCalledWith('proj-1', 'task-2', { parentId: 'task-1' }, 'tok');
  });

  // Mover um filho faz a SVAR recalcular as datas do grupo, o que dispara
  // `update-task` para a linha do cabeçalho.
  it('should ignore an update aimed at a group row', () => {
    const api = fakeApi([{ id: 'grp-1' }]);
    mount(api);

    api.fire('update-task', { id: 'grp-1', task: { text: 'Matéria-Prima', start: new Date(2026, 7, 1) } });

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('should ignore a delete aimed at a group row', () => {
    const api = fakeApi([{ id: 'grp-1' }]);
    mount(api);

    api.fire('delete-task', { id: 'grp-1' });

    expect(removeMock).not.toHaveBeenCalled();
  });

  // Cancela ANTES de perguntar: uma confirmação que promete exclusão e não
  // exclui nada é pior que nenhuma.
  it('should cancel the delete confirmation for a group row', () => {
    const api = fakeApi([{ id: 'grp-1' }]);
    mount(api);

    expect(api.runIntercept('delete-task', { id: 'grp-1' })).toBe(false);
  });

  it('should not open the task dialog for a group row', () => {
    const api = fakeApi([{ id: 'grp-1' }]);
    mount(api);

    expect(api.runIntercept('show-editor', { id: 'grp-1' })).toBe(false);
  });

  // Marcos continuam guardados como antes — a guarda nova não pode ter
  // afrouxado a antiga.
  it('should keep milestones out of the reorder payload', () => {
    const api = fakeApi([{ id: 'task-1' }, { id: 'ms-9' }, { id: 'task-2' }]);
    mount(api);

    api.fire('move-task', { id: 'task-1' });

    const items = reorderMock.mock.calls[0][1] as Array<{ id: string }>;
    expect(items.map((i) => i.id)).toEqual(['task-1', 'task-2']);
  });
});
