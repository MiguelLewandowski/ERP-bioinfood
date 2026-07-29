import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ProjectDto, SystemRole } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN, TEST_SESSION } from '@/lib/test-utils';
import { QuickAdd } from './quick-add';

const listProjectsMock = vi.fn();
const listUsersMock = vi.fn();
const postMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

vi.mock('@/lib/api-hooks', () => ({
  projectsApi: { list: (...args: unknown[]) => listProjectsMock(...args) },
  usersApi: { list: (...args: unknown[]) => listUsersMock(...args) },
  // O `TaskFormDialog` delegado busca POPs para vincular à tarefa.
  popsApi: { list: vi.fn().mockResolvedValue([]), listVersions: vi.fn().mockResolvedValue([]) },
}));

// O formulário delegado (`TaskFormDialog`) escreve pelo client `api`, não pelos
// hooks — mockar só `api-hooks` deixaria a criação passar batido.
vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
    patch: vi.fn(),
    get: vi.fn().mockResolvedValue([]),
    delete: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

const PROJECTS = [
  { id: 'proj-1', name: 'Projeto Levedura', status: 'IN_PROGRESS' },
  { id: 'proj-2', name: 'Projeto Encerrado', status: 'COMPLETED' },
] as ProjectDto[];

function setup(role: SystemRole = 'ADMIN') {
  renderWithProviders(<QuickAdd />, { session: { ...TEST_SESSION, role } });
}

async function openTaskDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Novo/ }));
  await user.click(await screen.findByRole('menuitem', { name: /Tarefa/ }));
  // O diálogo do cabeçalho agora só escolhe o projeto — o resto é delegado.
  await screen.findByLabelText('Projeto *');
}

describe('QuickAdd menu — RBAC', () => {
  beforeEach(() => {
    listProjectsMock.mockResolvedValue(PROJECTS);
    listUsersMock.mockResolvedValue([]);
  });

  // CLIENTE é externo: não cria nada, nem tarefa.
  it('should render nothing for a role that cannot create anything', () => {
    setup('CLIENTE');

    expect(screen.queryByRole('button', { name: /Novo/ })).not.toBeInTheDocument();
  });

  it('should offer task and project to the standard role but not the CRM entries', async () => {
    const user = userEvent.setup();
    setup('PADRAO');

    await user.click(screen.getByRole('button', { name: /Novo/ }));

    expect(await screen.findByRole('menuitem', { name: /Tarefa/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Projeto/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Empresa/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Negócio/ })).not.toBeInTheDocument();
  });

  it('should offer every entry to an admin', async () => {
    const user = userEvent.setup();
    setup('ADMIN');

    await user.click(screen.getByRole('button', { name: /Novo/ }));

    expect(await screen.findByRole('menuitem', { name: /Tarefa/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Projeto/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Empresa/ })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: /Negócio/ })).toBeInTheDocument();
  });
});

/**
 * O "Novo → Tarefa" criava tarefa com três campos, enquanto o Backlog abre um
 * formulário completo. Duas portas para a mesma coisa, com resultados
 * diferentes — e a do cabeçalho gerava tarefa sem responsável nem prioridade.
 *
 * Agora este diálogo é só o que ele tem de exclusivo (escolher o projeto, que
 * nas telas de projeto vem da rota) e delega ao mesmo `TaskFormDialog`.
 */
describe('QuickAdd task form', () => {
  beforeEach(() => {
    listProjectsMock.mockResolvedValue(PROJECTS);
    listUsersMock.mockResolvedValue([{ id: 'u-1', name: 'Marina', isActive: true }]);
    postMock.mockResolvedValue({ id: 'task-new', title: 'Revisar protocolo' });
  });

  it('should keep the continue button disabled until a project is chosen', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeEnabled();
  });

  it('should not offer projects that are already closed', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);

    expect(await screen.findByRole('option', { name: 'Projeto Levedura' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Projeto Encerrado' })).not.toBeInTheDocument();
  });

  // O ponto da tarefa: o formulário que abre é o MESMO do Backlog, com os
  // campos que o antigo não tinha.
  it('should open the full backlog form once a project is chosen', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByLabelText('Título *')).toBeInTheDocument();
    expect(screen.getByLabelText('Responsável')).toBeInTheDocument();
    expect(screen.getByLabelText('Prioridade')).toBeInTheDocument();
  });

  it('should create the task on the chosen project', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    await user.type(await screen.findByLabelText('Título *'), 'Revisar protocolo');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][0]).toBe('/projects/proj-1/tasks');
    expect(postMock.mock.calls[0][1]).toMatchObject({ title: 'Revisar protocolo' });
  });

  // A lista de gente vem de `GET /users`, que CLIENTE não pode chamar. A falha
  // não pode derrubar o formulário — ela só deixa o select de responsável vazio.
  it('should still open the form when the people list cannot be loaded', async () => {
    const user = userEvent.setup();
    listUsersMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.click(screen.getByRole('button', { name: 'Continuar' }));

    expect(await screen.findByLabelText('Título *')).toBeInTheDocument();
  });
});
