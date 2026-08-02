import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { OpportunityDto, UserDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import { OpportunityDialog } from './opportunity-dialog';

const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const freezeMock = vi.fn();
const unfreezeMock = vi.fn();
const listCrmActivitiesMock = vi.fn();
const listOrganizationsMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  opportunitiesApi: {
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    remove: (...args: unknown[]) => removeMock(...args),
    freeze: (...args: unknown[]) => freezeMock(...args),
    unfreeze: (...args: unknown[]) => unfreezeMock(...args),
  },
  crmActivitiesApi: {
    list: (...args: unknown[]) => listCrmActivitiesMock(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  organizationsApi: {
    list: (...args: unknown[]) => listOrganizationsMock(...args),
    create: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

const USERS = [{ id: 'user-5', name: 'Fernanda Alves' }] as UserDto[];

const EXISTING_OPPORTUNITY = {
  id: 'opp-1',
  title: 'Projeto Levedura',
  amount: '100000.00',
  currency: 'BRL',
  stageId: 'stage-1',
  frozenAt: null,
  startDate: '2026-07-01',
  expectedCloseDate: '2026-09-30',
  description: 'Negócio em andamento',
  organization: { id: 'org-1', legalName: 'ACME LTDA', tradeName: 'ACME' },
  responsible: { id: 'user-5', name: 'Fernanda Alves' },
  pipeline: { id: 'pipe-1', name: 'Padrão' },
} as unknown as OpportunityDto;

function setup(props: Partial<React.ComponentProps<typeof OpportunityDialog>> = {}) {
  const onSaved = vi.fn();
  const onDeleted = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <OpportunityDialog
      mode="create"
      pipelineId="pipe-1"
      defaultStageId="stage-1"
      pipelines={[]}
      users={USERS}
      canEdit
      onSaved={onSaved}
      onDeleted={onDeleted}
      onClose={onClose}
      {...props}
    />,
  );
  return { onSaved, onDeleted, onClose };
}

describe('OpportunityDialog — create mode', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ ...EXISTING_OPPORTUNITY, id: 'opp-new' });
    listOrganizationsMock.mockResolvedValue([
      { id: 'org-1', legalName: 'ACME LTDA', tradeName: 'ACME' },
    ]);
    listCrmActivitiesMock.mockResolvedValue([]);
  });

  it('should render the create title when mode is create', () => {
    setup();

    expect(screen.getByText('Nova Oportunidade')).toBeInTheDocument();
  });

  it('should require a title before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Título é obrigatório')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  // The client is mandatory on creation but enforced in the submit handler.
  it('should refuse to create an opportunity without a client', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Projeto Levedura');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Selecione o cliente'));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create the opportunity in the pipeline and stage it was opened from', async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = setup();

    await user.type(screen.getByLabelText('Título *'), 'Projeto Levedura');
    await screen.findByRole('option', { name: 'ACME' });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'org-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [payload, token] = createMock.mock.calls[0];
    expect(payload).toMatchObject({
      title: 'Projeto Levedura',
      orgId: 'org-1',
      pipelineId: 'pipe-1',
      stageId: 'stage-1',
    });
    expect(token).toBe(TEST_TOKEN);
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should convert the masked currency into a number for the API', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Projeto Levedura');
    await user.type(screen.getByLabelText('Valor (R$)'), '150000');
    await screen.findByRole('option', { name: 'ACME' });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'org-1');

    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('1.500,00');

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0].amount).toBe(1500);
  });

  it('should send an undefined amount when the value field is left empty', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Título *'), 'Projeto Levedura');
    await screen.findByRole('option', { name: 'ACME' });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'org-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0].amount).toBeUndefined();
  });

  it('should not offer delete or freeze actions while creating', () => {
    setup();

    expect(screen.queryByRole('button', { name: /Excluir/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Congelar/ })).not.toBeInTheDocument();
  });
});

describe('OpportunityDialog — edit mode', () => {
  beforeEach(() => {
    updateMock.mockResolvedValue(EXISTING_OPPORTUNITY);
    removeMock.mockResolvedValue(undefined);
    freezeMock.mockResolvedValue({ ...EXISTING_OPPORTUNITY, frozenAt: '2026-07-20T00:00:00Z' });
    unfreezeMock.mockResolvedValue({ ...EXISTING_OPPORTUNITY, frozenAt: null });
    listCrmActivitiesMock.mockResolvedValue([]);
    listOrganizationsMock.mockResolvedValue([]);
  });

  it('should prefill the form from the opportunity being edited', () => {
    setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    expect(screen.getByText('Editar Oportunidade')).toBeInTheDocument();
    expect(screen.getByLabelText('Título *')).toHaveValue('Projeto Levedura');
    expect(screen.getByLabelText('Valor (R$)')).toHaveValue('100.000,00');
    expect(screen.getByLabelText('Responsável')).toHaveValue('user-5');
    expect(screen.getByLabelText('Previsão de fechamento')).toHaveValue('2026-09-30');
  });

  it('should update the opportunity by id without sending pipeline fields', async () => {
    const user = userEvent.setup();
    const { onSaved } = setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    await user.clear(screen.getByLabelText('Título *'));
    await user.type(screen.getByLabelText('Título *'), 'Projeto Levedura II');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const [id, payload] = updateMock.mock.calls[0];
    expect(id).toBe('opp-1');
    expect(payload).toMatchObject({ title: 'Projeto Levedura II' });
    expect(payload).not.toHaveProperty('pipelineId');
    expect(createMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('should ask for confirmation before deleting the deal', async () => {
    const user = userEvent.setup();
    setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));

    expect(await screen.findByText('Excluir oportunidade')).toBeInTheDocument();
    expect(removeMock).not.toHaveBeenCalled();
  });

  it('should delete the deal when the confirmation is accepted', async () => {
    const user = userEvent.setup();
    const { onDeleted, onClose } = setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));
    await screen.findByText('Excluir oportunidade');
    await user.click(screen.getByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('opp-1', TEST_TOKEN));
    expect(onDeleted).toHaveBeenCalledWith('opp-1');
    expect(onClose).toHaveBeenCalled();
  });

  it('should keep the deal when the delete confirmation is dismissed', async () => {
    const user = userEvent.setup();
    const { onDeleted } = setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    await user.click(screen.getByRole('button', { name: /Excluir/ }));
    await screen.findByText('Excluir oportunidade');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByText('Excluir oportunidade')).not.toBeInTheDocument());
    expect(removeMock).not.toHaveBeenCalled();
    expect(onDeleted).not.toHaveBeenCalled();
  });

  it('should ask for a reason before freezing an active deal', async () => {
    const user = userEvent.setup();
    const { onSaved } = setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    await user.click(screen.getByRole('button', { name: /Congelar/ }));
    await user.type(screen.getByLabelText('Motivo do congelamento'), 'Aguardando orçamento');
    await user.click(screen.getByRole('button', { name: /Congelar/ }));

    await waitFor(() => expect(freezeMock).toHaveBeenCalledWith('opp-1', 'Aguardando orçamento', TEST_TOKEN));
    expect(toastSuccessMock).toHaveBeenCalledWith('Oportunidade congelada');
    expect(onSaved).toHaveBeenCalled();
  });

  it('should freeze without a reason when the field is left blank', async () => {
    const user = userEvent.setup();
    setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    await user.click(screen.getByRole('button', { name: /Congelar/ }));
    await user.click(screen.getByRole('button', { name: /Congelar/ }));

    await waitFor(() => expect(freezeMock).toHaveBeenCalledWith('opp-1', undefined, TEST_TOKEN));
  });

  it('should reactivate a frozen deal', async () => {
    const user = userEvent.setup();
    const frozen = { ...EXISTING_OPPORTUNITY, frozenAt: '2026-07-01T00:00:00Z' } as OpportunityDto;
    setup({ mode: 'edit', opportunity: frozen });

    expect(screen.getByText('Congelado')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Reativar/ }));

    await waitFor(() => expect(unfreezeMock).toHaveBeenCalledWith('opp-1', TEST_TOKEN));
    expect(toastSuccessMock).toHaveBeenCalledWith('Oportunidade reativada');
  });

  it('should report the error and keep the dialog open when the update fails', async () => {
    const user = userEvent.setup();
    updateMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    const { onSaved, onClose } = setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY });

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Forbidden resource'));
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should hide the task creation action for users without write access', async () => {
    setup({ mode: 'edit', opportunity: EXISTING_OPPORTUNITY, canEdit: false });

    await waitFor(() => expect(listCrmActivitiesMock).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Nova tarefa/ })).not.toBeInTheDocument();
  });
});
