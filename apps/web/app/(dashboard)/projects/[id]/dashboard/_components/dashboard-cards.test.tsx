import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/lib/test-utils';
import type { AssigneeLoad, ScheduleHealth, TaskMetrics } from '@/lib/project-metrics';
import { AssigneeLoadCard } from './assignee-load-card';
import { TasksCard } from './tasks-card';
import { ScheduleCard } from './schedule-card';

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

/**
 * O desvio de cronograma é o número que decide se alguém age, e ficava como
 * texto cinza de rodapé — do mesmo peso do aviso de linha de base.
 */
describe('ScheduleCard — peso do desvio', () => {
  function schedule(over: Partial<ScheduleHealth> = {}): ScheduleHealth {
    return {
      startDate: '2026-01-05',
      endDate: '2026-12-31',
      forecastEndDate: '2027-01-12',
      driftDays: 12,
      status: 'LATE',
      hasBaseline: true,
      ...over,
    };
  }

  it('should print the drift as a signed number', () => {
    renderWithProviders(<ScheduleCard schedule={schedule()} />);

    expect(screen.getByText('+12')).toBeInTheDocument();
  });

  it('should not sign a negative drift twice', () => {
    renderWithProviders(<ScheduleCard schedule={schedule({ driftDays: -5, status: 'ON_TRACK' })} />);

    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  // Badge e bloco de desvio são duas leituras do MESMO estado: discordar de cor
  // faria a tela dizer duas coisas ao mesmo tempo.
  it('should tone the drift block with the schedule status', () => {
    renderWithProviders(<ScheduleCard schedule={schedule({ driftDays: 3, status: 'AT_RISK' })} />);

    expect(screen.getByText('+3').parentElement).toHaveClass('bg-warning/20');
  });

  it('should tone a late schedule as destructive', () => {
    renderWithProviders(<ScheduleCard schedule={schedule({ driftDays: 12, status: 'LATE' })} />);

    expect(screen.getByText('+12').parentElement).toHaveClass('bg-destructive/10');
  });

  // Sem as duas datas não há desvio para exibir — e um "0" ali mentiria.
  it('should explain what is missing instead of showing a fake zero', () => {
    renderWithProviders(<ScheduleCard schedule={schedule({ driftDays: null, status: 'UNKNOWN' })} />);

    expect(screen.getByText(/Defina a data de término/)).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
