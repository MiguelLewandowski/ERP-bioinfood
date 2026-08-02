import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { CrmActivityDto, UserDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN, TEST_SESSION } from '@/lib/test-utils';
import { TaskDialog } from './task-dialog';

const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const toastSuccessMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  crmActivitiesApi: {
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    remove: (...args: unknown[]) => removeMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccessMock(...args),
    error: (...args: unknown[]) => toastErrorMock(...args),
  },
}));

const USERS = [
  { id: TEST_SESSION.sub, name: 'Tester' },
  { id: 'user-5', name: 'Fernanda Alves' },
] as UserDto[];

const EXISTING_TASK = {
  id: 'task-1',
  title: 'Retornar ligação',
  type: 'CALL',
  priority: 'HIGH',
  status: 'PENDING',
  dueDate: '2026-08-15',
  responsibleId: 'user-5',
  description: 'Falar sobre a proposta',
  opportunityId: 'opp-1',
  orgId: 'org-1',
} as CrmActivityDto;

function setup(props: Partial<React.ComponentProps<typeof TaskDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onSaved = vi.fn();
  const onDeleted = vi.fn();
  renderWithProviders(
    <TaskDialog
      open
      onOpenChange={onOpenChange}
      users={USERS}
      onSaved={onSaved}
      onDeleted={onDeleted}
      {...props}
    />,
  );
  return { onOpenChange, onSaved, onDeleted };
}

describe('TaskDialog — create mode', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ ...EXISTING_TASK, id: 'task-new' });
  });

  it('should render the create title when no task is given', () => {
    setup();

    expect(screen.getByText('Nova tarefa')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar tarefa' })).toBeInTheDocument();
  });

  it('should create a task with no fields filled in beyond the defaults', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
  });

  it('should default the responsible to the logged-in user', () => {
    setup();

    expect(screen.getByLabelText('Responsável')).toHaveValue(TEST_SESSION.sub);
  });

  it('should default type to call and priority to medium', () => {
    setup();

    expect(screen.getByLabelText('Tipo')).toHaveValue('CALL');
    expect(screen.getByLabelText('Prioridade')).toHaveValue('MEDIUM');
  });

  it('should attach the opportunity and organization the dialog was opened from', async () => {
    const user = userEvent.setup();
    const { onSaved } = setup({ defaults: { opportunityId: 'opp-9', orgId: 'org-9' } });

    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [payload, token] = createMock.mock.calls[0];
    expect(payload).toMatchObject({
      opportunityId: 'opp-9',
      orgId: 'org-9',
    });
    expect(token).toBe(TEST_TOKEN);
    expect(onSaved).toHaveBeenCalled();
  });

  it('should send undefined instead of an empty string for an unset due date', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0].dueDate).toBeUndefined();
  });

  it('should not offer a delete action while creating', () => {
    setup();

    expect(screen.queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument();
  });

  it('should report the error and keep the dialog open when creation fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    const { onSaved, onOpenChange } = setup();

    await user.click(screen.getByRole('button', { name: 'Criar tarefa' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Forbidden resource'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('TaskDialog — edit mode', () => {
  beforeEach(() => {
    updateMock.mockResolvedValue(EXISTING_TASK);
    removeMock.mockResolvedValue(undefined);
  });

  it('should prefill every field from the task being edited', () => {
    setup({ task: EXISTING_TASK });

    expect(screen.getByText('Editar tarefa')).toBeInTheDocument();
    expect(screen.getByLabelText('Tipo')).toHaveValue('CALL');
    expect(screen.getByLabelText('Prioridade')).toHaveValue('HIGH');
    expect(screen.getByLabelText('Prazo')).toHaveValue('2026-08-15');
    expect(screen.getByLabelText('Responsável')).toHaveValue('user-5');
    expect(screen.getByLabelText('Observações')).toHaveValue('Falar sobre a proposta');
  });

  it('should update the existing task by id instead of creating a new one', async () => {
    const user = userEvent.setup();
    const { onSaved } = setup({ task: EXISTING_TASK });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const [id, , token] = updateMock.mock.calls[0];
    expect(id).toBe('task-1');
    expect(token).toBe(TEST_TOKEN);
    expect(createMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('should ask for confirmation before deleting', async () => {
    const user = userEvent.setup();
    setup({ task: EXISTING_TASK });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));

    expect(await screen.findByText('Excluir tarefa')).toBeInTheDocument();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('should delete the task when the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const { onDeleted } = setup({ task: EXISTING_TASK });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));
    const confirmButton = await screen.findByRole('button', { name: 'Excluir' });
    await user.click(confirmButton);

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('task-1', TEST_TOKEN));
    expect(onDeleted).toHaveBeenCalledWith('task-1');
  });

  it('should keep the task when the confirmation is dismissed', async () => {
    const user = userEvent.setup();
    const { onDeleted } = setup({ task: EXISTING_TASK });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));
    await screen.findByText('Excluir tarefa');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByText('Excluir tarefa')).not.toBeInTheDocument());
    expect(removeMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});
