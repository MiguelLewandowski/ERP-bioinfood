import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { StakeholderDto, SystemRole } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN, TEST_SESSION } from '@/lib/test-utils';
import { StakeholdersClient } from './stakeholders-client';

const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const listContactsMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  stakeholdersApi: {
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    remove: (...args: unknown[]) => removeMock(...args),
  },
  contactsApi: {
    list: (...args: unknown[]) => listContactsMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args), success: vi.fn() },
}));

const EXISTING = {
  id: 'sh-1',
  contactId: 'contact-1',
  type: 'SPONSOR',
  roleNote: 'Diretora de P&D',
  influence: 'HIGH',
  interest: 'HIGH',
  contact: { id: 'contact-1', name: 'Joana Reis', email: 'joana@acme.com' },
} as unknown as StakeholderDto;

function setup(role: SystemRole = 'ADMIN', initial: StakeholderDto[] = []) {
  renderWithProviders(
    <StakeholdersClient projectId="proj-1" initialStakeholders={initial} />,
    { session: { ...TEST_SESSION, role } },
  );
}

async function openCreateForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('button', { name: /Nova Parte Interessada/ })[0]);
  await screen.findByLabelText('Papel');
}

describe('StakeholdersClient form', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ ...EXISTING, id: 'sh-new' });
    updateMock.mockResolvedValue(EXISTING);
    removeMock.mockResolvedValue(undefined);
    listContactsMock.mockResolvedValue([
      { id: 'contact-1', name: 'Joana Reis', email: 'joana@acme.com' },
    ]);
  });

  it('should require a contact before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Selecione um contato')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should default the role to the least specific type', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);

    expect(screen.getByLabelText('Papel')).toHaveValue('STAKEHOLDER');
  });

  it('should create the stakeholder on the project with the auth token', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await screen.findByRole('option', { name: /Joana Reis/ });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'contact-1');
    await user.selectOptions(screen.getByLabelText('Papel'), 'SPONSOR');
    await user.selectOptions(screen.getByLabelText('Poder (influência)'), 'HIGH');
    await user.selectOptions(screen.getByLabelText('Interesse'), 'VERY_HIGH');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [projectId, payload, token] = createMock.mock.calls[0];
    expect(projectId).toBe('proj-1');
    expect(payload).toMatchObject({
      contactId: 'contact-1',
      type: 'SPONSOR',
      influence: 'HIGH',
      interest: 'VERY_HIGH',
    });
    expect(token).toBe(TEST_TOKEN);
  });

  it('should send undefined for the optional levels left blank', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await screen.findByRole('option', { name: /Joana Reis/ });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'contact-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const payload = createMock.mock.calls[0][1];
    expect(payload.influence).toBeUndefined();
    expect(payload.interest).toBeUndefined();
    expect(payload.roleNote).toBeUndefined();
  });

  it('should prefill and lock the contact when editing an existing stakeholder', async () => {
    const user = userEvent.setup();
    setup('ADMIN', [EXISTING]);

    await user.click(screen.getByRole('button', { name: /Editar/ }));

    await waitFor(() => expect(screen.getByLabelText('Papel')).toHaveValue('SPONSOR'));
    expect(screen.getByLabelText('Papel específico (opcional)')).toHaveValue('Diretora de P&D');
    // The contact cannot be swapped on an existing link.
    expect(screen.getByRole('combobox', { name: '' })).toBeDisabled();
  });

  it('should update the existing stakeholder instead of creating a new one', async () => {
    const user = userEvent.setup();
    setup('ADMIN', [EXISTING]);

    await user.click(screen.getByRole('button', { name: /Editar/ }));
    await waitFor(() => expect(screen.getByLabelText('Papel')).toHaveValue('SPONSOR'));
    await user.selectOptions(screen.getByLabelText('Papel'), 'OWNER');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    const [projectId, id, payload] = updateMock.mock.calls[0];
    expect(projectId).toBe('proj-1');
    expect(id).toBe('sh-1');
    expect(payload).toMatchObject({ type: 'OWNER' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should report the error and keep the form open when saving fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await openCreateForm(user);
    await screen.findByRole('option', { name: /Joana Reis/ });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'contact-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Forbidden resource'));
    expect(screen.getByLabelText('Papel')).toBeInTheDocument();
  });

  // RBAC: writing needs INSERE and up; deleting needs APROVA and up.
  it('should hide the create action from a read-only role', () => {
    setup('CONSULTA');

    expect(
      screen.queryByRole('button', { name: /Nova Parte Interessada/ }),
    ).not.toBeInTheDocument();
  });

  it('should offer the create action to a writer role', () => {
    setup('INSERE');

    expect(
      screen.getAllByRole('button', { name: /Nova Parte Interessada/ }).length,
    ).toBeGreaterThan(0);
  });

  it('should not offer deletion to a writer role that cannot delete', () => {
    setup('INSERE', [EXISTING]);

    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument();
  });

  it('should offer deletion to an approver role', () => {
    setup('APROVA', [EXISTING]);

    expect(screen.getByRole('button', { name: /Remover/ })).toBeInTheDocument();
  });
});
