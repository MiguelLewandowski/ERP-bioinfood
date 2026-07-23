import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { TaskDto as Task } from '@bioinfood/shared';
import type { ProjectMember } from '@/lib/project-members';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import { TaskFormDialog } from './task-form-dialog';

const getMock = vi.fn();
const postMock = vi.fn();
const patchMock = vi.fn();
const deleteMock = vi.fn();
const listPopsMock = vi.fn();
const addPopMock = vi.fn();
const toastErrorMock = vi.fn();
const toastWarningMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => getMock(...args),
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('@/lib/api-hooks', () => ({
  popsApi: { list: (...args: unknown[]) => listPopsMock(...args) },
  tasksApi: {
    addPop: (...args: unknown[]) => addPopMock(...args), removePop: vi.fn(),
    addChecklistItem: vi.fn(), updateChecklistItem: vi.fn(), deleteChecklistItem: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    warning: (...args: unknown[]) => toastWarningMock(...args),
    success: vi.fn(),
  },
}));

const MEMBERS = [{ id: 'user-2', name: 'Igor Prado' }] as ProjectMember[];

const EXISTING_TASK = {
  id: 'task-1',
  title: 'Preparar meio de cultura',
  description: 'Seguir POP 3',
  status: 'IN_PROGRESS',
  priority: 'HIGH',
  storyPoints: 5,
  startDate: '2026-08-10T00:00:00.000Z',
  dueDate: '2026-08-20T00:00:00.000Z',
  assignee: { id: 'user-2', name: 'Igor Prado' },
  predecessors: [],
  checklist: [],
  pops: [],
} as unknown as Task;

function setup(props: Partial<React.ComponentProps<typeof TaskFormDialog>> = {}) {
  const onClose = vi.fn();
  const onCreated = vi.fn();
  const onUpdated = vi.fn();
  const onDeleted = vi.fn();
  renderWithProviders(
    <TaskFormDialog
      projectId="proj-1"
      members={MEMBERS}
      mode="create"
      onClose={onClose}
      onCreated={onCreated}
      onUpdated={onUpdated}
      onDeleted={onDeleted}
      {...props}
    />,
  );
  return { onClose, onCreated, onUpdated, onDeleted };
}

describe('TaskFormDialog — create mode', () => {
  beforeEach(() => {
    postMock.mockResolvedValue({ ...EXISTING_TASK, id: 'task-new' });
    getMock.mockResolvedValue([]);
    listPopsMock.mockResolvedValue([]);
  });

  it('should require a title before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    expect(await screen.findByText('Título é obrigatório')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should reject a title longer than 200 characters', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'x'.repeat(201));
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    expect(
      await screen.findByText('Título deve ter no máximo 200 caracteres'),
    ).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should default the priority to medium', () => {
    setup();

    expect(screen.getByLabelText('Prioridade')).toHaveValue('MEDIUM');
  });

  it('should not offer a status field while creating', () => {
    setup();

    expect(screen.queryByLabelText('Status')).not.toBeInTheDocument();
  });

  // Business rule: the range must be coherent.
  it('should reject a due date earlier than the start date', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.type(screen.getByLabelText('Data de Início'), '2026-08-20');
    await user.type(screen.getByLabelText('Prazo'), '2026-08-10');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    expect(
      await screen.findByText('O prazo não pode ser anterior à data de início'),
    ).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  // Business rule: times only conflict when both fall on the same day.
  it('should reject an end time earlier than the start time on the same day', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.type(screen.getByLabelText('Data de Início'), '2026-08-10');
    await user.type(screen.getByLabelText('Prazo'), '2026-08-10');
    await user.type(screen.getByLabelText('Hora de Início'), '14:00');
    await user.type(screen.getByLabelText('Hora Final'), '09:00');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    expect(
      await screen.findByText('A hora final não pode ser anterior à hora de início'),
    ).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should accept an earlier end time when the dates differ', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.type(screen.getByLabelText('Data de Início'), '2026-08-10');
    await user.type(screen.getByLabelText('Prazo'), '2026-08-11');
    await user.type(screen.getByLabelText('Hora de Início'), '14:00');
    await user.type(screen.getByLabelText('Hora Final'), '09:00');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
  });

  // Story points are bounded by the native min/max on `type="number"`, which
  // blocks submission before react-hook-form runs. Unlike every other field in
  // this form there is no inline `errors.storyPoints` message rendered, so the
  // zod texts ("Mínimo 1"/"Máximo 100") are unreachable — the guarantee that
  // holds is that an out-of-range value never reaches the API.
  it('should not send story points above the allowed maximum', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    const storyPoints = screen.getByLabelText('Story Points') as HTMLInputElement;
    await user.type(storyPoints, '101');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    expect(storyPoints.validity.rangeOverflow).toBe(true);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should not send story points below the allowed minimum', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    const storyPoints = screen.getByLabelText('Story Points') as HTMLInputElement;
    await user.type(storyPoints, '0');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    expect(storyPoints.validity.rangeUnderflow).toBe(true);
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should create the task on the project route with the auth token', async () => {
    const user = userEvent.setup();
    const { onCreated, onClose } = setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio de cultura');
    await user.selectOptions(screen.getByLabelText('Prioridade'), 'CRITICAL');
    await user.selectOptions(screen.getByLabelText('Responsável'), 'user-2');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const [url, payload, token] = postMock.mock.calls[0];
    expect(url).toBe('/projects/proj-1/tasks');
    expect(payload).toMatchObject({
      title: 'Preparar meio de cultura',
      priority: 'CRITICAL',
      assigneeId: 'user-2',
    });
    expect(token).toBe(TEST_TOKEN);
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should never send a status when creating', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1]).not.toHaveProperty('status');
  });

  it('should send undefined instead of empty strings for untouched optional fields', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const payload = postMock.mock.calls[0][1];
    expect(payload.description).toBeUndefined();
    expect(payload.assigneeId).toBeUndefined();
    expect(payload.storyPoints).toBeUndefined();
    expect(payload.startDate).toBeUndefined();
    expect(payload.dueDate).toBeUndefined();
  });

  it('should combine the date and time fields into a single timestamp', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.type(screen.getByLabelText('Data de Início'), '2026-08-10');
    await user.type(screen.getByLabelText('Hora de Início'), '09:30');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const sent = new Date(postMock.mock.calls[0][1].startDate);
    expect(sent.getFullYear()).toBe(2026);
    expect(sent.getMonth()).toBe(7); // August, zero-based
    expect(sent.getDate()).toBe(10);
    expect(sent.getHours()).toBe(9);
    expect(sent.getMinutes()).toBe(30);
  });

  it('should show the server message and keep the dialog open when creation fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    const { onClose } = setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.click(screen.getByRole('button', { name: /Criar|Salvar/ }));

    expect(await screen.findByText('Forbidden resource')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('TaskFormDialog — edit mode', () => {
  beforeEach(() => {
    patchMock.mockResolvedValue(EXISTING_TASK);
    deleteMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue([]);
    listPopsMock.mockResolvedValue([]);
  });

  it('should prefill the form from the task being edited', () => {
    setup({ mode: 'edit', task: EXISTING_TASK });

    expect(screen.getByLabelText('Título *')).toHaveValue('Preparar meio de cultura');
    expect(screen.getByLabelText('Prioridade')).toHaveValue('HIGH');
    expect(screen.getByLabelText('Responsável')).toHaveValue('user-2');
    expect(screen.getByLabelText('Story Points')).toHaveValue(5);
  });

  it('should split the stored timestamps back into date inputs', () => {
    setup({ mode: 'edit', task: EXISTING_TASK });

    expect(screen.getByLabelText('Data de Início')).toHaveValue('2026-08-10');
    expect(screen.getByLabelText('Prazo')).toHaveValue('2026-08-20');
  });

  it('should offer the status field only when editing', () => {
    setup({ mode: 'edit', task: EXISTING_TASK });

    expect(screen.getByLabelText('Status')).toHaveValue('IN_PROGRESS');
  });

  it('should patch the existing task including its status', async () => {
    const user = userEvent.setup();
    const { onUpdated } = setup({ mode: 'edit', task: EXISTING_TASK });

    await user.selectOptions(screen.getByLabelText('Status'), 'DONE');
    await user.click(screen.getByRole('button', { name: /Salvar/ }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    const [url, payload] = patchMock.mock.calls[0];
    expect(url).toBe('/projects/proj-1/tasks/task-1');
    expect(payload).toMatchObject({ status: 'DONE' });
    expect(postMock).not.toHaveBeenCalled();
    expect(onUpdated).toHaveBeenCalled();
  });

  it('should ask for confirmation before deleting the task', async () => {
    const user = userEvent.setup();
    setup({ mode: 'edit', task: EXISTING_TASK });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));

    expect(deleteMock).not.toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: /Confirmar|Sim/ })).toBeInTheDocument();
  });

  it('should delete the task once the deletion is confirmed', async () => {
    const user = userEvent.setup();
    const { onDeleted, onClose } = setup({ mode: 'edit', task: EXISTING_TASK });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));
    await user.click(await screen.findByRole('button', { name: /Confirmar|Sim/ }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/projects/proj-1/tasks/task-1', TEST_TOKEN);
    });
    expect(onDeleted).toHaveBeenCalledWith('task-1');
    expect(onClose).toHaveBeenCalled();
  });
});

// Antes, checklist/dependências/POPs só existiam no modo edição: era preciso
// criar a tarefa, reabrir e só então detalhá-la. Agora os itens ficam em memória
// e são gravados logo depois do POST da tarefa.
describe('TaskFormDialog — sub-recursos no modo criação', () => {
  const OTHER_TASK = { ...EXISTING_TASK, id: 'task-9', title: 'Esterilizar vidraria' };
  const POP = {
    id: 'pop-1',
    title: 'POP de esterilização',
    latestVersion: { id: 'popver-1', versionNumber: 3 },
  };

  beforeEach(() => {
    postMock.mockReset();
    getMock.mockResolvedValue([OTHER_TASK]);
    listPopsMock.mockResolvedValue([POP]);
    addPopMock.mockReset();
    toastWarningMock.mockReset();
  });

  it('should offer checklist, dependencies and POPs while creating', async () => {
    setup();

    expect(await screen.findByText('Checklist')).toBeInTheDocument();
    expect(screen.getByText('Dependências')).toBeInTheDocument();
    expect(screen.getByText('POPs utilizadas')).toBeInTheDocument();
  });

  it('should stage a checklist item without calling the API before the task exists', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(await screen.findByRole('button', { name: /Adicionar item/ }));
    await user.type(screen.getByPlaceholderText('Descreva o item…'), 'Pesar reagentes');
    await user.keyboard('{Enter}');

    expect(await screen.findByDisplayValue('Pesar reagentes')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should persist the staged checklist right after creating the task', async () => {
    const user = userEvent.setup();
    postMock.mockImplementation((path: string) =>
      path.endsWith('/checklist')
        ? Promise.resolve({ id: 'item-1', taskId: 'task-new', text: 'Pesar reagentes', checked: false, order: 0 })
        : Promise.resolve({ ...EXISTING_TASK, id: 'task-new' }));
    const { onCreated } = setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.click(await screen.findByRole('button', { name: /Adicionar item/ }));
    await user.type(screen.getByPlaceholderText('Descreva o item…'), 'Pesar reagentes');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /^Criar$/ }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/projects/proj-1/tasks/task-new/checklist',
        { text: 'Pesar reagentes' },
        TEST_TOKEN,
      );
    });
    // A tarefa devolvida ao chamador já leva o item com o id real do banco.
    expect(onCreated.mock.calls[0][0].checklist).toEqual([
      { id: 'item-1', taskId: 'task-new', text: 'Pesar reagentes', checked: false, order: 0 },
    ]);
  });

  it('should persist a staged dependency after creating the task', async () => {
    const user = userEvent.setup();
    postMock.mockImplementation((path: string) =>
      path.endsWith('/dependencies')
        ? Promise.resolve({ id: 'dep-1', predecessorId: 'task-9', type: 'FS', lag: 0 })
        : Promise.resolve({ ...EXISTING_TASK, id: 'task-new' }));
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.click(await screen.findByRole('button', { name: 'Adicionar dependência' }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Tarefa predecessora' }), 'task-9');
    await user.click(screen.getByRole('button', { name: 'OK' }));
    await user.click(screen.getByRole('button', { name: /^Criar$/ }));

    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith(
        '/projects/proj-1/tasks/task-new/dependencies',
        { predecessorId: 'task-9' },
        TEST_TOKEN,
      );
    });
  });

  it('should warn but still create the task when a staged item fails to save', async () => {
    const user = userEvent.setup();
    postMock.mockImplementation((path: string) =>
      path.endsWith('/checklist')
        ? Promise.reject(new ApiError(['Falha ao salvar o item'], 500))
        : Promise.resolve({ ...EXISTING_TASK, id: 'task-new' }));
    const { onCreated, onClose } = setup();

    await user.type(screen.getByLabelText('Título *'), 'Preparar meio');
    await user.click(await screen.findByRole('button', { name: /Adicionar item/ }));
    await user.type(screen.getByPlaceholderText('Descreva o item…'), 'Pesar reagentes');
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: /^Criar$/ }));

    await waitFor(() => expect(toastWarningMock).toHaveBeenCalled());
    expect(toastWarningMock.mock.calls[0][0]).toContain('Pesar reagentes');
    // A tarefa existe no banco — fechar e avisar é melhor que travar o usuário.
    expect(onCreated).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
