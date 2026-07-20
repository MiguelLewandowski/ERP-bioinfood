import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ContactListItemDto, TaxonomyDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import { ContatosTab } from './contatos-tab';

const getMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const addLinkMock = vi.fn();
const updateLinkMock = vi.fn();
const removeLinkMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/api-hooks', () => ({
  contactsApi: {
    get: (...args: unknown[]) => getMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    addLink: (...args: unknown[]) => addLinkMock(...args),
    updateLink: (...args: unknown[]) => updateLinkMock(...args),
    removeLink: (...args: unknown[]) => removeLinkMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => toastErrorMock(...args),
    success: (...args: unknown[]) => toastSuccessMock(...args),
  },
}));

const SOURCES = [{ id: 'src-1', name: 'Indicação' }] as TaxonomyDto[];

const EXISTING_CONTACT = {
  id: 'contact-1',
  name: 'Joana Reis',
  email: 'joana@acme.com',
  // ContactListItemDto['link'] keys the relation as `linkId`, not `id`.
  link: {
    linkId: 'link-1',
    jobTitle: 'CTO',
    isPrimary: true,
    isDecision: true,
    isFinance: false,
    isTechnical: false,
  },
} as unknown as ContactListItemDto;

function setup(canEdit = true, contacts: ContactListItemDto[] = [EXISTING_CONTACT]) {
  renderWithProviders(
    <ContatosTab
      organizationId="org-1"
      initialContacts={contacts}
      sources={SOURCES}
      canEdit={canEdit}
    />,
  );
}

async function openCreateForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('button', { name: /Adicionar contato|Novo contato/ })[0]);
  await screen.findByPlaceholderText('Nome *');
}

describe('ContatosTab form', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ id: 'contact-new' });
    addLinkMock.mockResolvedValue({ id: 'link-new' });
    updateMock.mockResolvedValue({ id: 'contact-1' });
    updateLinkMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue({
      ...EXISTING_CONTACT,
      cpf: null,
      orgLinks: [{ ...EXISTING_CONTACT.link, orgId: 'org-1' }],
      source: { id: 'src-1', name: 'Indicação' },
    });
  });

  it('should hide the write actions from users without permission', () => {
    setup(false);

    expect(screen.queryByRole('button', { name: 'Editar contato' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remover vínculo' })).not.toBeInTheDocument();
  });

  it('should require a name before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create the contact and link it to the organization', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await user.type(screen.getByPlaceholderText('Nome *'), 'Marcos Vinicius');
    await user.type(screen.getByPlaceholderText('Cargo'), 'Analista');
    await user.type(screen.getByPlaceholderText('E-mail'), 'marcos@acme.com');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [contactPayload, token] = createMock.mock.calls[0];
    expect(contactPayload).toMatchObject({
      name: 'Marcos Vinicius',
      email: 'marcos@acme.com',
    });
    expect(token).toBe(TEST_TOKEN);
    expect(addLinkMock).toHaveBeenCalledWith(
      'contact-new',
      expect.objectContaining({ orgId: 'org-1', jobTitle: 'Analista' }),
      TEST_TOKEN,
    );
  });

  it('should send the relationship markers on the link, not on the contact', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await user.type(screen.getByPlaceholderText('Nome *'), 'Marcos Vinicius');
    await user.click(screen.getByLabelText('Decisor'));
    await user.click(screen.getByLabelText('Financeiro'));
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(addLinkMock).toHaveBeenCalled());
    expect(addLinkMock.mock.calls[0][1]).toMatchObject({
      isDecision: true,
      isFinance: true,
      isTechnical: false,
      isPrimary: false,
    });
    expect(createMock.mock.calls[0][0]).not.toHaveProperty('isDecision');
  });

  it('should send undefined instead of empty strings for the optional fields', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await user.type(screen.getByPlaceholderText('Nome *'), 'Marcos Vinicius');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const payload = createMock.mock.calls[0][0];
    expect(payload.email).toBeUndefined();
    expect(payload.cpf).toBeUndefined();
    expect(payload.phone).toBeUndefined();
    expect(payload.sourceId).toBeUndefined();
  });

  it('should mask the typed phone and CPF', async () => {
    const user = userEvent.setup();
    setup();

    await openCreateForm(user);
    await user.type(screen.getByPlaceholderText('Celular'), '11988887777');
    await user.type(screen.getByPlaceholderText('CPF'), '12345678901');

    expect(screen.getByPlaceholderText('Celular')).toHaveValue('(11) 98888-7777');
    expect(screen.getByPlaceholderText('CPF')).toHaveValue('123.456.789-01');
  });

  it('should load the contact detail and switch to edit mode', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Editar contato' }));

    expect(await screen.findByText('Editar contato')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nome *')).toHaveValue('Joana Reis');
    });
    expect(getMock).toHaveBeenCalledWith('contact-1', TEST_TOKEN);
  });

  it('should update both the contact and its link when editing', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Editar contato' }));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Nome *')).toHaveValue('Joana Reis');
    });
    await user.clear(screen.getByPlaceholderText('Nome *'));
    await user.type(screen.getByPlaceholderText('Nome *'), 'Joana R. Reis');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(updateMock.mock.calls[0][0]).toBe('contact-1');
    expect(updateMock.mock.calls[0][1]).toMatchObject({ name: 'Joana R. Reis' });
    expect(updateLinkMock).toHaveBeenCalledWith(
      'contact-1', 'link-1', expect.any(Object), TEST_TOKEN,
    );
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should report the error and keep the form open when saving fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['E-mail já cadastrado'], 409));
    setup();

    await openCreateForm(user);
    await user.type(screen.getByPlaceholderText('Nome *'), 'Marcos Vinicius');
    await user.click(screen.getByRole('button', { name: 'Adicionar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('E-mail já cadastrado'));
    expect(screen.getByPlaceholderText('Nome *')).toBeInTheDocument();
  });
});
