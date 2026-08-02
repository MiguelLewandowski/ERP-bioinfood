import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { TaskDto } from '@bioinfood/shared';
import { renderWithProviders, screen } from '@/lib/test-utils';
import { BacklogClient } from './backlog-client';

let params = new URLSearchParams();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => params,
  usePathname: () => '/projects/p1/backlog',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: (...a: unknown[]) => replaceMock(...a) }),
}));

vi.mock('@/lib/api', () => ({
  api: { patch: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

function task(id: string, title: string, assignee: string | null): TaskDto {
  return {
    id,
    title,
    status: 'TODO',
    priority: 'MEDIUM',
    storyPoints: 3,
    dueDate: null,
    assignee: assignee ? { id: `u-${assignee}`, name: assignee } : null,
    deletedAt: null,
    checklist: [],
    pops: [],
  } as unknown as TaskDto;
}

const TASKS = [
  task('t-1', 'Preparar bancada', 'Marina'),
  task('t-2', 'Comprar reagente', null),
  task('t-3', 'Revisar laudo', null),
];

function setup() {
  return renderWithProviders(
    <BacklogClient projectId="p1" initialTasks={TASKS} members={[]} />,
  );
}

/**
 * O filtro nasceu junto com o link "N tarefas sem responsável" do dashboard: o
 * backlog só filtrava status, e não havia para onde aquele link apontar.
 */
describe('BacklogClient — filtro por responsável', () => {
  beforeEach(() => {
    params = new URLSearchParams();
  });

  it('should show every task when no assignee filter is present', () => {
    setup();

    expect(screen.getByText('Preparar bancada')).toBeInTheDocument();
    expect(screen.getByText('Comprar reagente')).toBeInTheDocument();
  });

  it('should show only ownerless tasks when arriving with ?assignee=none', () => {
    params = new URLSearchParams('assignee=none');
    setup();

    expect(screen.getByText('Comprar reagente')).toBeInTheDocument();
    expect(screen.getByText('Revisar laudo')).toBeInTheDocument();
    expect(screen.queryByText('Preparar bancada')).not.toBeInTheDocument();
  });

  // Lista curta sem explicação lê como dado faltando — o chip diz por que ela
  // está curta, e é o caminho de volta.
  //
  // O filtro é derivado da URL, então dispensar o chip tem de REESCREVER a URL.
  // Um booleano local sairia de sincronia com o botão "voltar" do navegador.
  it('should surface the active filter as a chip that rewrites the URL', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams('assignee=none');
    setup();

    await user.click(screen.getByRole('button', { name: /Sem responsável/ }));

    expect(replaceMock).toHaveBeenCalledWith('/projects/p1/backlog', { scroll: false });
  });

  it('should keep unrelated query params when clearing the assignee filter', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams('assignee=none&task=t-9');
    setup();

    await user.click(screen.getByRole('button', { name: /Sem responsável/ }));

    expect(replaceMock).toHaveBeenCalledWith('/projects/p1/backlog?task=t-9', { scroll: false });
  });

  it('should not show the chip without the query param', () => {
    setup();

    expect(screen.queryByRole('button', { name: /Sem responsável/ })).not.toBeInTheDocument();
  });

  // Os dois filtros são independentes: status continua funcionando por cima do
  // recorte de responsável.
  it('should combine the status filter with the assignee filter', async () => {
    const user = userEvent.setup();
    params = new URLSearchParams('assignee=none');
    setup();

    await user.click(screen.getByRole('button', { name: 'Concluído' }));

    expect(screen.getByText('Nenhuma tarefa encontrada.')).toBeInTheDocument();
  });
});
