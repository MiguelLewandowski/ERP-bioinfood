import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/lib/test-utils';
import type { AssigneeLoad, TaskMetrics } from '@/lib/project-metrics';
import { AssigneeLoadCard } from './assignee-load-card';
import { TasksCard } from './tasks-card';

function metrics(over: Partial<TaskMetrics> = {}): TaskMetrics {
  return {
    total: 46,
    done: 27,
    inProgress: 4,
    todo: 15,
    progress: 59,
    overdue: [],
    unassigned: 0,
    byAssignee: [],
    ...over,
  };
}

/**
 * A revisão relatou "barras não proporcionais". Foi verificado que a conta
 * sempre esteve certa (15/46 = 33%, 4/46 = 9%, 27/46 = 59%) — a percepção vinha
 * de três trilhos de mesma largura com valores próximos. A barra empilhada
 * resolve isso, e este teste fixa a proporção para que ninguém "corrija" a
 * conta depois.
 */
describe('TasksCard — barra empilhada', () => {
  it('should size each segment by its share of the total', () => {
    const { container } = renderWithProviders(<TasksCard projectId="p1" metrics={metrics()} />);

    const widths = Array.from(container.querySelectorAll<HTMLElement>('[role="img"] > div'))
      .map((el) => el.style.width);

    expect(widths).toEqual([
      `${(27 / 46) * 100}%`,
      `${(4 / 46) * 100}%`,
      `${(15 / 46) * 100}%`,
    ]);
  });

  it('should describe the breakdown for screen readers', () => {
    renderWithProviders(<TasksCard projectId="p1" metrics={metrics()} />);

    expect(
      screen.getByRole('img', { name: '46 tarefas — Concluídas: 27, Em andamento: 4, A fazer: 15' }),
    ).toBeInTheDocument();
  });

  it('should omit segments with no tasks', () => {
    const { container } = renderWithProviders(
      <TasksCard projectId="p1" metrics={metrics({ total: 10, done: 10, inProgress: 0, todo: 0 })} />,
    );

    expect(container.querySelectorAll('[role="img"] > div')).toHaveLength(1);
  });

  // Saber que há trabalho sem dono só serve se der para ver qual.
  it('should link the unassigned count to the filtered backlog', () => {
    renderWithProviders(<TasksCard projectId="p1" metrics={metrics({ unassigned: 3 })} />);

    expect(screen.getByRole('link', { name: /3 tarefas em aberto sem responsável/ }))
      .toHaveAttribute('href', '/projects/p1/backlog?assignee=none');
  });

  it('should not link when every task has an owner', () => {
    renderWithProviders(<TasksCard projectId="p1" metrics={metrics({ unassigned: 0 })} />);

    expect(screen.queryByText(/sem responsável/)).not.toBeInTheDocument();
  });
});

/**
 * `computeTaskMetrics` devolve `byAssignee` ordenado por VOLUME. O card responde
 * outra pergunta — quem está mais atrás — e por isso reordena localmente, sem
 * mexer no módulo compartilhado.
 */
describe('AssigneeLoadCard — ordem', () => {
  const LOADS: AssigneeLoad[] = [
    { id: 'u1', name: 'Marina', total: 20, done: 18 }, // 90%
    { id: 'u2', name: 'Rafael', total: 4,  done: 1 },  // 25%
    { id: 'u3', name: 'Thiago', total: 10, done: 5 },  // 50%
  ];

  it('should list the least advanced person first', () => {
    renderWithProviders(<AssigneeLoadCard loads={LOADS} />);

    const names = screen.getAllByRole('progressbar').map((el) => el.getAttribute('aria-label'));
    expect(names.map((n) => n!.split(':')[0])).toEqual(['Rafael', 'Thiago', 'Marina']);
  });

  // Empate de progresso resolvido por volume: sem isso a ordem oscila entre
  // renders e a lista "pula" quando os dados voltam iguais.
  it('should break a progress tie by volume', () => {
    renderWithProviders(
      <AssigneeLoadCard
        loads={[
          { id: 'a', name: 'Ana',  total: 2,  done: 1 },
          { id: 'b', name: 'Bruno', total: 10, done: 5 },
        ]}
      />,
    );

    const names = screen.getAllByRole('progressbar').map((el) => el.getAttribute('aria-label')!.split(':')[0]);
    expect(names).toEqual(['Bruno', 'Ana']);
  });

  it('should say so when nobody has tasks assigned', () => {
    renderWithProviders(<AssigneeLoadCard loads={[]} />);

    expect(screen.getByText('Nenhuma tarefa atribuída ainda.')).toBeInTheDocument();
  });
});
