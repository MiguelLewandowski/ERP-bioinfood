import { describe, it, expect } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { TaskDto } from '@bioinfood/shared';
import { renderWithProviders, screen } from '@/lib/test-utils';
import type { ProjectMethodology } from '@/lib/project-pops';
import { MethodologyClient } from './methodology-client';

function task(id: string, title: string, assignee: string | null): TaskDto {
  return {
    id,
    title,
    status: 'TODO',
    assignee: assignee ? { id: `u-${assignee}`, name: assignee } : null,
    pops: [],
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

describe('MethodologyClient — progresso das POPs', () => {
  // A barra era `w-28` e sem número: não dava para diferenciar 40% de 60%.
  it('should print the percentage next to the bar', () => {
    renderWithProviders(<MethodologyClient projectId="proj-1" methodology={methodology(TASKS)} />);

    expect(screen.getByText('75%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: /Extração de xilose/ })).toHaveAttribute('aria-valuenow', '75');
  });
});
