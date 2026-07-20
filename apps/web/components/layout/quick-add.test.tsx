import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ProjectDto, SystemRole } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN, TEST_SESSION } from '@/lib/test-utils';
import { QuickAdd } from './quick-add';

const listProjectsMock = vi.fn();
const createTaskMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

vi.mock('@/lib/api-hooks', () => ({
  projectsApi: { list: (...args: unknown[]) => listProjectsMock(...args) },
  tasksApi: { create: (...args: unknown[]) => createTaskMock(...args) },
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
  await screen.findByLabelText('Título *');
}

describe('QuickAdd menu — RBAC', () => {
  beforeEach(() => {
    listProjectsMock.mockResolvedValue(PROJECTS);
    createTaskMock.mockResolvedValue({ id: 'task-new' });
  });

  it('should render nothing for a role that cannot create anything', () => {
    setup('CONSULTA');

    expect(screen.queryByRole('button', { name: /Novo/ })).not.toBeInTheDocument();
  });

  it('should offer only the task entry to a writer role', async () => {
    const user = userEvent.setup();
    setup('INSERE');

    await user.click(screen.getByRole('button', { name: /Novo/ }));

    expect(await screen.findByRole('menuitem', { name: /Tarefa/ })).toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Projeto/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menuitem', { name: /Empresa/ })).not.toBeInTheDocument();
  });

  it('should offer task and project to an approver but not the CRM entries', async () => {
    const user = userEvent.setup();
    setup('APROVA');

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

describe('QuickAdd task form', () => {
  beforeEach(() => {
    listProjectsMock.mockResolvedValue(PROJECTS);
    createTaskMock.mockResolvedValue({ id: 'task-new' });
  });

  it('should keep submit disabled until a project and a title are provided', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    expect(screen.getByRole('button', { name: 'Criar tarefa' })).toBeDisabled();

    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    expect(screen.getByRole('button', { name: 'Criar tarefa' })).toBeDisabled();

    await user.type(screen.getByLabelText('Título *'), 'Revisar protocolo');
    expect(screen.getByRole('button', { name: 'Criar tarefa' })).toBeEnabled();
  });

  it('should not offer projects that are already closed', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);

    expect(await screen.findByRole('option', { name: 'Projeto Levedura' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Projeto Encerrado' })).not.toBeInTheDocument();
  });

  it('should create the task on the chosen project with the auth token', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.type(screen.getByLabelText('Título *'), 'Revisar protocolo');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(createTaskMock).toHaveBeenCalled());
    const [projectId, payload, token] = createTaskMock.mock.calls[0];
    expect(projectId).toBe('proj-1');
    expect(payload).toMatchObject({ title: 'Revisar protocolo' });
    expect(token).toBe(TEST_TOKEN);
    expect(toastSuccessMock).toHaveBeenCalled();
  });

  it('should trim the title before sending it', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.type(screen.getByLabelText('Título *'), '   Revisar protocolo   ');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(createTaskMock).toHaveBeenCalled());
    expect(createTaskMock.mock.calls[0][1].title).toBe('Revisar protocolo');
  });

  it('should omit the due date entirely when it is left empty', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.type(screen.getByLabelText('Título *'), 'Revisar protocolo');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(createTaskMock).toHaveBeenCalled());
    expect(createTaskMock.mock.calls[0][1]).not.toHaveProperty('dueDate');
  });

  it('should include the due date when one is chosen', async () => {
    const user = userEvent.setup();
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.type(screen.getByLabelText('Título *'), 'Revisar protocolo');
    await user.type(screen.getByLabelText('Prazo'), '2026-09-15');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(createTaskMock).toHaveBeenCalled());
    expect(createTaskMock.mock.calls[0][1].dueDate).toBe('2026-09-15');
  });

  it('should report the error and keep the dialog open when creation fails', async () => {
    const user = userEvent.setup();
    createTaskMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await openTaskDialog(user);
    await user.selectOptions(screen.getByLabelText('Projeto *'), 'proj-1');
    await user.type(screen.getByLabelText('Título *'), 'Revisar protocolo');
    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Forbidden resource'));
    expect(screen.getByLabelText('Título *')).toBeInTheDocument();
  });
});
