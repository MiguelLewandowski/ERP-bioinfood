import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { SystemRole, TaskDto } from '@bioinfood/shared';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import type { ProjectMethodology } from '@/lib/project-pops';
import { MethodologyClient } from './methodology-client';

const patchMock = vi.fn();
const refreshMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: refreshMock, push: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: { patch: (...a: unknown[]) => patchMock(...a) },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

function task(id: string, title: string, assignee: string | null): TaskDto {
  return {
    id,
    title,
    status: 'TODO',
    assignee: assignee ? { id: `u-${assignee}`, name: assignee } : null,
    pops: [],
    requiresSOP: true,
    deletedAt: null,
  } as unknown as TaskDto;
}

function methodology(tasksWithoutPop: TaskDto[]): ProjectMethodology {
  return {
    pops: [
      {
        popId: 'pop-1',
        title: 'Extração de xilose',
        versions: [2],
        doneCount: 3,
        tasks: [
          { taskId: 't-a', taskTitle: 'Preparar bancada', status: 'DONE', assigneeName: 'Marina', versionNumber: 2 },
          { taskId: 't-b', taskTitle: 'Rodar ensaio', status: 'DONE', assigneeName: 'Rafael', versionNumber: 2 },
          { taskId: 't-c', taskTitle: 'Registrar dados', status: 'DONE', assigneeName: 'Marina', versionNumber: 2 },
          { taskId: 't-d', taskTitle: 'Revisar laudo', status: 'TODO', assigneeName: 'Rafael', versionNumber: 2 },
        ],
      },
    ],
    tasksWithoutPop,
    totalTasks: 4 + tasksWithoutPop.length,
    tasksWithPop: 4,
    coverage: 50,
    notApplicable: 0,
  };
}

const TASKS = [
  task('t-1', 'Reunião de kickoff', 'Marina'),
  task('t-2', 'Fechar contrato', 'Marina'),
  task('t-3', 'Comprar reagente', 'Rafael'),
  task('t-4', 'Organizar almoxarifado', null),
];

/**
 * A lista chegava a 44 linhas planas, sempre abertas, empurrando as POPs — o
 * conteúdo principal da tela — para fora da primeira dobra.
 */
describe('MethodologyClient — tarefas sem POP', () => {
  // "Tarefas sem POP" é também o rótulo de um StatCard no topo — a seção só se
  // identifica sem ambiguidade pelo botão que a expande.
  it('should keep the list collapsed until the user opens it', () => {
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    const toggle = screen.getByRole('button', { name: /Tarefas sem POP/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Reunião de kickoff')).not.toBeInTheDocument();
  });

  it('should show the count without opening the list', () => {
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    expect(screen.getByRole('button', { name: /Tarefas sem POP \(4\)/ })).toBeInTheDocument();
  });

  it('should group the tasks by assignee once opened', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    await user.click(screen.getByRole('button', { name: /Tarefas sem POP/ }));

    expect(screen.getByText('Marina')).toBeInTheDocument();
    expect(screen.getByText('Rafael')).toBeInTheDocument();
    expect(screen.getByText('Reunião de kickoff')).toBeInTheDocument();
  });

  // O balde que não é pessoa é justamente o que precisa de ação — no meio da
  // ordem alfabética ele passaria despercebido entre Marina e Rafael.
  it('should sort the unassigned bucket last', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    await user.click(screen.getByRole('button', { name: /Tarefas sem POP/ }));

    const headings = screen.getAllByText(/^(Marina|Rafael|Sem responsável)$/).map((el) => el.textContent);
    expect(headings).toEqual(['Marina (2)', 'Rafael (1)', 'Sem responsável (1)']);
  });

  it('should filter by task title', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    await user.click(screen.getByRole('button', { name: /Tarefas sem POP/ }));
    await user.type(screen.getByLabelText('Buscar tarefas sem POP'), 'reagente');

    expect(screen.getByText('Comprar reagente')).toBeInTheDocument();
    expect(screen.queryByText('Reunião de kickoff')).not.toBeInTheDocument();
  });

  // Procurar por uma pessoa devolve o balde dela inteiro, não só as tarefas cujo
  // título por acaso contém o nome.
  it('should return the whole bucket when searching by assignee', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    await user.click(screen.getByRole('button', { name: /Tarefas sem POP/ }));
    await user.type(screen.getByLabelText('Buscar tarefas sem POP'), 'marina');

    expect(screen.getByText('Reunião de kickoff')).toBeInTheDocument();
    expect(screen.getByText('Fechar contrato')).toBeInTheDocument();
    expect(screen.queryByText('Comprar reagente')).not.toBeInTheDocument();
  });

  it('should say so when the search matches nothing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    await user.click(screen.getByRole('button', { name: /Tarefas sem POP/ }));
    await user.type(screen.getByLabelText('Buscar tarefas sem POP'), 'centrifuga');

    expect(screen.getByText('Nenhuma tarefa sem POP corresponde à busca.')).toBeInTheDocument();
  });
});


/**
 * A classificação acontece AQUI, onde a métrica dói. Escondida no formulário da
 * tarefa ela vira campo que ninguém marca — que era o risco registrado no plano
 * da Onda 5.
 */
describe('MethodologyClient — marcar como não aplicável', () => {
  beforeEach(() => {
    patchMock.mockResolvedValue({});
  });

  async function openList() {
    const user = userEvent.setup();
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);
    await user.click(screen.getByRole('button', { name: /Tarefas sem POP/ }));
    return user;
  }

  it('should hide the bulk bar until something is selected', async () => {
    await openList();

    expect(screen.queryByRole('button', { name: 'Não exige POP' })).not.toBeInTheDocument();
  });

  it('should patch every selected task with requiresSOP false', async () => {
    const user = await openList();

    await user.click(screen.getByLabelText('Selecionar Reunião de kickoff'));
    await user.click(screen.getByLabelText('Selecionar Fechar contrato'));
    await user.click(screen.getByRole('button', { name: 'Não exige POP' }));

    await waitFor(() => expect(patchMock).toHaveBeenCalledTimes(2));
    expect(patchMock).toHaveBeenCalledWith(
      '/projects/proj-1/tasks/t-1', { requiresSOP: false }, TEST_TOKEN,
    );
    expect(patchMock).toHaveBeenCalledWith(
      '/projects/proj-1/tasks/t-2', { requiresSOP: false }, TEST_TOKEN,
    );
  });

  // Sem o refresh a tela continuaria mostrando a métrica antiga — o usuário
  // clicaria de novo achando que não funcionou.
  it('should refresh the page so the coverage reflects the change', async () => {
    const user = await openList();

    await user.click(screen.getByLabelText('Selecionar Comprar reagente'));
    await user.click(screen.getByRole('button', { name: 'Não exige POP' }));

    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it('should clear the selection without touching the API', async () => {
    const user = await openList();

    await user.click(screen.getByLabelText('Selecionar Comprar reagente'));
    await user.click(screen.getByRole('button', { name: 'Limpar' }));

    expect(screen.queryByRole('button', { name: 'Não exige POP' })).not.toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });

  // CLIENTE lê o método do projeto; reclassificar tarefa é escrita.
  it('should not offer the checkboxes to a CLIENTE', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />,
      { session: { sub: 'u-9', email: 'externo@cliente.com', role: 'CLIENTE' as SystemRole } },
    );
    await user.click(screen.getByRole('button', { name: /Tarefas sem POP/ }));

    expect(screen.queryByLabelText('Selecionar Reunião de kickoff')).not.toBeInTheDocument();
  });
});

describe('MethodologyClient — denominador explicável', () => {
  it('should spell out how many tasks were excluded from the coverage', () => {
    renderWithProviders(
      <MethodologyClient
        projectId="proj-1"
        methodology={{ ...methodology(TASKS), totalTasks: 8, tasksWithPop: 4, notApplicable: 3 }}
      />,
    );

    expect(screen.getByText('4 de 8 · 3 não aplicável(is)')).toBeInTheDocument();
  });
});
