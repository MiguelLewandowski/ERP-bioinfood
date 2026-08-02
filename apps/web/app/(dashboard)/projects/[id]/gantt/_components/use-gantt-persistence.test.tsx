import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MilestoneDto, TaskDto } from '@bioinfood/shared';
import { renderWithProviders } from '@/lib/test-utils';
import { useGanttPersistence } from './use-gantt-persistence';

const updateMock = vi.fn();
const reorderMock = vi.fn();
const removeMock = vi.fn();
const msUpdateMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  tasksApi: {
    update: (...a: unknown[]) => updateMock(...a),
    reorder: (...a: unknown[]) => reorderMock(...a),
    remove: (...a: unknown[]) => removeMock(...a),
    create: vi.fn(),
    addDependency: vi.fn(),
    removeDependency: vi.fn(),
  },
  milestonesApi: {
    update: (...a: unknown[]) => msUpdateMock(...a),
    remove: vi.fn(),
  },
}));

const TASKS = [
  { id: 'task-1', title: 'Preparar bancada', startDate: null, dueDate: null, status: 'TODO' },
  { id: 'task-2', title: 'Rodar ensaio', startDate: null, dueDate: null, status: 'TODO' },
] as unknown as TaskDto[];

const MILESTONES = [
  { id: 'ms-a', title: 'Entrega parcial', date: '2026-09-01', reached: false },
] as unknown as MilestoneDto[];

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
      milestones: MILESTONES,
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

/**
 * A SVAR emite a linha INTEIRA a cada `update-task`. O guard do ramo de marco
 * era `!== undefined` — dizia "o campo veio no evento", não "o campo mudou" —
 * então renomear um marco reenviava `date` e `reached` junto.
 *
 * É o mesmo padrão de escrita cega que, em TAREFA, propagou o "+1 dia" do
 * incidente de fuso. Marco não tem normalização de duração, então aqui não havia
 * vetor de corrupção — mas o padrão é o mesmo e some do código junto.
 */
describe('useGanttPersistence — PATCH condicional dos marcos', () => {
  beforeEach(() => {
    msUpdateMock.mockResolvedValue({});
  });

  const MS_ROW = [{ id: 'ms-ms-a' }];

  function fireMilestone(api: ReturnType<typeof fakeApi>, task: Record<string, unknown>) {
    api.fire('update-task', { id: 'ms-ms-a', task });
  }

  it('should send only the title when a milestone is renamed', () => {
    const api = fakeApi(MS_ROW);
    mount(api);

    fireMilestone(api, {
      text: 'Entrega final',
      start: new Date(2026, 8, 1),
      progress: 0,
    });

    expect(msUpdateMock).toHaveBeenCalledWith('proj-1', 'ms-a', { title: 'Entrega final' }, 'tok');
  });

  it('should send only the date when a milestone is dragged', () => {
    const api = fakeApi(MS_ROW);
    mount(api);

    fireMilestone(api, {
      text: 'Entrega parcial',
      start: new Date(2026, 8, 15),
      progress: 0,
    });

    expect(msUpdateMock).toHaveBeenCalledWith('proj-1', 'ms-a', { date: '2026-09-15' }, 'tok');
  });

  it('should send only the reached flag when a milestone is checked', () => {
    const api = fakeApi(MS_ROW);
    mount(api);

    fireMilestone(api, {
      text: 'Entrega parcial',
      start: new Date(2026, 8, 1),
      progress: 100,
    });

    expect(msUpdateMock).toHaveBeenCalledWith('proj-1', 'ms-a', { reached: true }, 'tok');
  });

  it('should not call the API when the milestone event carries no real change', () => {
    const api = fakeApi(MS_ROW);
    mount(api);

    fireMilestone(api, {
      text: 'Entrega parcial',
      start: new Date(2026, 8, 1),
      progress: 0,
    });

    expect(msUpdateMock).not.toHaveBeenCalled();
  });

  /**
   * `Milestone.date` virou coluna DATE na migration `20260728112520`. Um ISO com
   * hora passa a ser truncado pelo banco em silêncio — e meia-noite local em
   * UTC-3 é 03:00Z, que truncado dá o dia certo por acidente, mas 21h local do
   * dia 1 é 00:00Z do dia 2 e grava o dia ERRADO. Daí o dia de calendário.
   */
  it('should send the milestone date as a calendar day, not an instant', () => {
    const api = fakeApi(MS_ROW);
    mount(api);

    fireMilestone(api, { start: new Date(2026, 8, 15, 21, 30) });

    const body = msUpdateMock.mock.calls[0][2] as { date: string };
    expect(body.date).toBe('2026-09-15');
    expect(body.date).not.toContain('T');
  });

  // A segunda edição compara contra o que a PRIMEIRA gravou, não contra o DTO
  // original — senão a mesma alteração seria reenviada para sempre.
  it('should compare against the last write, not the original DTO', () => {
    const api = fakeApi(MS_ROW);
    mount(api);

    fireMilestone(api, { text: 'Entrega final' });
    fireMilestone(api, { text: 'Entrega final' });

    expect(msUpdateMock).toHaveBeenCalledTimes(1);
  });
});

/**
 * O snapshot era semeado com `dayKey(dto.startDate)`, que faz `new Date(string)`
 * — e o ISO de meia-noite UTC da API vira 21h do dia ANTERIOR em Brasília. A
 * store, montada por `toGanttDate`, calculava o dia CERTO. Os dois nunca batiam,
 * então o PATCH condicional se anulava para datas: renomear uma tarefa reenviava
 * `startDate` e `dueDate` junto — exatamente o que o guard existe para impedir.
 *
 * O fuso é fixado em `vitest.config.ts` (America/Sao_Paulo), então este caso
 * falha de verdade se a semeadura voltar a divergir da store.
 */
describe('useGanttPersistence — snapshot semeado do DTO', () => {
  beforeEach(() => {
    updateMock.mockResolvedValue({});
  });

  it('should not resend dates when only the title changed', () => {
    const api = fakeApi([{ id: 'dated-1' }]);
    function Harness() {
      useGanttPersistence(api, {
        editable: true,
        projectId: 'proj-1',
        token: 'tok',
        links: [],
        tasks: [{
          id: 'dated-1',
          title: 'Extração',
          startDate: '2026-08-03T00:00:00.000Z',
          dueDate: '2026-08-10T00:00:00.000Z',
          status: 'TODO',
        }] as unknown as TaskDto[],
        milestones: [],
        onError: vi.fn(),
        onEditTask: vi.fn(),
      });
      return null;
    }
    renderWithProviders(<Harness />);

    // O que a SVAR emite ao renomear: a linha inteira, com as datas da store.
    api.fire('update-task', {
      id: 'dated-1',
      task: {
        text: 'Extração ácida',
        start: new Date(2026, 7, 3),
        end: new Date(2026, 7, 10),
      },
    });

    expect(updateMock).toHaveBeenCalledWith('proj-1', 'dated-1', { title: 'Extração ácida' }, 'tok');
  });
});

/**
 * Um arrastar reescrevia o projeto inteiro: 46 UPDATE para mover uma linha,
 * todos carimbando `updatedAt`. Já custou caro num diagnóstico — 46 registros
 * com `updatedAt` idêntico ao milissegundo pareciam corrupção em massa e eram um
 * único arrastar (docs/incidentes/timezone-cronograma.md §2.5).
 */
describe('useGanttPersistence — delta de reordenação', () => {
  beforeEach(() => {
    reorderMock.mockResolvedValue({});
    updateMock.mockResolvedValue({});
  });

  const ORDERED = [
    { id: 'o-1', title: 'A', order: 0, startDate: null, dueDate: null, status: 'TODO' },
    { id: 'o-2', title: 'B', order: 1, startDate: null, dueDate: null, status: 'TODO' },
    { id: 'o-3', title: 'C', order: 2, startDate: null, dueDate: null, status: 'TODO' },
    { id: 'o-4', title: 'D', order: 3, startDate: null, dueDate: null, status: 'TODO' },
  ] as unknown as TaskDto[];

  function mountWithOrder(api: ReturnType<typeof fakeApi>) {
    function Harness() {
      useGanttPersistence(api, {
        editable: true,
        projectId: 'proj-1',
        token: 'tok',
        links: [],
        tasks: ORDERED,
        milestones: [],
        onError: vi.fn(),
        onEditTask: vi.fn(),
      });
      return null;
    }
    renderWithProviders(<Harness />);
  }

  it('should send only the tasks whose order actually changed', () => {
    // 'o-3' sobe uma posição: só ele e 'o-2' mudam de lugar.
    const api = fakeApi([{ id: 'o-1' }, { id: 'o-3' }, { id: 'o-2' }, { id: 'o-4' }]);
    mountWithOrder(api);

    api.fire('move-task', { id: 'o-3' });

    expect(reorderMock.mock.calls[0][1]).toEqual([
      { id: 'o-3', order: 1 },
      { id: 'o-2', order: 2 },
    ]);
  });

  it('should not call the API when the drag ends where it started', () => {
    const api = fakeApi([{ id: 'o-1' }, { id: 'o-2' }, { id: 'o-3' }, { id: 'o-4' }]);
    mountWithOrder(api);

    api.fire('move-task', { id: 'o-2' });

    expect(reorderMock).not.toHaveBeenCalled();
  });

  // O segundo arrastar tem de comparar contra o que o PRIMEIRO gravou. Contra os
  // `order` do DTO, que ficaram velhos, ele pularia linhas que precisam mudar.
  it('should compare the second drag against what the first one wrote', () => {
    const api = fakeApi([{ id: 'o-1' }, { id: 'o-3' }, { id: 'o-2' }, { id: 'o-4' }]);
    mountWithOrder(api);

    api.fire('move-task', { id: 'o-3' });
    // Segundo evento com a MESMA ordem: nada mais a gravar.
    api.fire('move-task', { id: 'o-3' });

    expect(reorderMock).toHaveBeenCalledTimes(1);
  });

  // Tarefa sem data não aparece no Gantt mas ocupa `order` — some da store e
  // precisa continuar no fim da lista desejada, com a ordem relativa intacta.
  it('should keep the relative order of tasks without dates', () => {
    const api = fakeApi([{ id: 'o-2' }, { id: 'o-1' }]);
    mountWithOrder(api);

    api.fire('move-task', { id: 'o-2' });

    const items = reorderMock.mock.calls[0][1] as Array<{ id: string; order: number }>;
    expect(items.find((i) => i.id === 'o-3')).toBeUndefined();
    expect(items.find((i) => i.id === 'o-4')).toBeUndefined();
  });
});
