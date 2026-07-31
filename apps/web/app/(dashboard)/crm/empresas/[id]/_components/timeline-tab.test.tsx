import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ContactListItemDto, InteractionDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN, TEST_SESSION } from '@/lib/test-utils';
import { TimelineTab } from './timeline-tab';

const createInteractionMock = vi.fn();
const createActivityMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api-hooks', () => ({
  interactionsApi: { create: (...args: unknown[]) => createInteractionMock(...args) },
  crmActivitiesApi: {
    create: (...args: unknown[]) => createActivityMock(...args),
    list: () => Promise.resolve([]),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

const CONTACTS = [{ id: 'contact-1', name: 'Joana Reis' }] as ContactListItemDto[];

const EXISTING_INTERACTION = {
  id: 'int-1',
  type: 'MEETING',
  direction: 'OUTBOUND',
  subject: 'Kickoff',
  summary: 'Alinhamento inicial',
  interactionAt: '2026-07-10T00:00:00.000Z',
  createdBy: { id: 'user-1', name: 'Tester' },
} as unknown as InteractionDto;

function setup(canEdit = true, interactions: InteractionDto[] = [EXISTING_INTERACTION]) {
  renderWithProviders(
    <TimelineTab
      organizationId="org-1"
      initialInteractions={interactions}
      contacts={CONTACTS}
      canEdit={canEdit}
    />,
  );
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Registrar interação/ }));
  await screen.findByPlaceholderText('Assunto');
}

describe('TimelineTab interaction form', () => {
  beforeEach(() => {
    createInteractionMock.mockResolvedValue({ id: 'int-new' });
    createActivityMock.mockResolvedValue({ id: 'act-new' });
  });

  it('should hide the register action from users without write access', () => {
    setup(false);

    expect(screen.queryByRole('button', { name: /Registrar interação/ })).not.toBeInTheDocument();
  });

  it('should default to an outbound meeting', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);

    expect(screen.getByLabelText('Tipo de interação')).toHaveValue('MEETING');
    expect(screen.getByLabelText('Direção')).toHaveValue('OUTBOUND');
  });

  it('should create the interaction for the organization with the auth token', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.selectOptions(screen.getByLabelText('Tipo de interação'), 'CALL');
    await user.selectOptions(screen.getByLabelText('Direção'), 'INBOUND');
    await user.selectOptions(screen.getByLabelText('Contato'), 'contact-1');
    await user.type(screen.getByPlaceholderText('Assunto'), 'Retorno do cliente');
    await user.type(screen.getByPlaceholderText('Resumo (3 linhas)'), 'Pediu proposta');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(createInteractionMock).toHaveBeenCalled());
    const [payload, token] = createInteractionMock.mock.calls[0];
    expect(payload).toMatchObject({
      orgId: 'org-1',
      contactId: 'contact-1',
      type: 'CALL',
      direction: 'INBOUND',
      subject: 'Retorno do cliente',
      summary: 'Pediu proposta',
    });
    expect(token).toBe(TEST_TOKEN);
    expect(toastSuccessMock).toHaveBeenCalledWith('Interação registrada');
  });

  it('should send undefined instead of empty strings for the optional fields', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(createInteractionMock).toHaveBeenCalled());
    const payload = createInteractionMock.mock.calls[0][0];
    expect(payload.contactId).toBeUndefined();
    expect(payload.subject).toBeUndefined();
    expect(payload.summary).toBeUndefined();
    expect(payload.fullContent).toBeUndefined();
  });

  it('should not create a follow-up when the option is left unchecked', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByPlaceholderText('Assunto'), 'Kickoff');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(createInteractionMock).toHaveBeenCalled());
    expect(createActivityMock).not.toHaveBeenCalled();
  });

  it('should reveal the follow-up fields only after the option is checked', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    expect(screen.queryByPlaceholderText('Ex: Enviar proposta')).not.toBeInTheDocument();

    await user.click(screen.getByLabelText('Criar follow-up junto'));

    expect(await screen.findByPlaceholderText('Ex: Enviar proposta')).toBeInTheDocument();
  });

  it('should link the follow-up task to the interaction it came from', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByPlaceholderText('Assunto'), 'Kickoff');
    await user.click(screen.getByLabelText('Criar follow-up junto'));
    await user.type(await screen.findByPlaceholderText('Ex: Enviar proposta'), 'Enviar proposta');
    await user.type(screen.getByLabelText('Prazo do follow-up'), '2026-08-05');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(createActivityMock).toHaveBeenCalled());
    const [payload, token] = createActivityMock.mock.calls[0];
    expect(payload).toMatchObject({
      orgId: 'org-1',
      interactionId: 'int-new',
      title: 'Enviar proposta',
      dueDate: '2026-08-05',
      responsibleId: TEST_SESSION.sub,
    });
    expect(token).toBe(TEST_TOKEN);
  });

  it('should skip the follow-up when it is checked but left untitled', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.click(screen.getByLabelText('Criar follow-up junto'));
    await screen.findByPlaceholderText('Ex: Enviar proposta');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(createInteractionMock).toHaveBeenCalled());
    expect(createActivityMock).not.toHaveBeenCalled();
  });

  it('should report the error and keep the form open when the interaction fails', async () => {
    const user = userEvent.setup();
    createInteractionMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await openForm(user);
    await user.type(screen.getByPlaceholderText('Assunto'), 'Kickoff');
    await user.click(screen.getByRole('button', { name: 'Registrar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Forbidden resource'));
    expect(screen.getByPlaceholderText('Assunto')).toBeInTheDocument();
  });
});
