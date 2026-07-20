import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ContactDetailDto, TaxonomyDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import { PessoaDialog } from './pessoa-dialog';

const getMock = vi.fn();
const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const addLinkMock = vi.fn();
const updateLinkMock = vi.fn();
const removeLinkMock = vi.fn();
const listOrganizationsMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  contactsApi: {
    get: (...args: unknown[]) => getMock(...args),
    create: (...args: unknown[]) => createMock(...args),
    update: (...args: unknown[]) => updateMock(...args),
    remove: (...args: unknown[]) => removeMock(...args),
    addLink: (...args: unknown[]) => addLinkMock(...args),
    updateLink: (...args: unknown[]) => updateLinkMock(...args),
    removeLink: (...args: unknown[]) => removeLinkMock(...args),
  },
  organizationsApi: {
    list: (...args: unknown[]) => listOrganizationsMock(...args),
    create: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args), success: vi.fn() },
}));

const SOURCES = [{ id: 'src-1', name: 'Indicação' }] as TaxonomyDto[];

const CONTACT_DETAIL = {
  id: 'contact-1',
  name: 'Gabriel Nunes',
  email: 'gabriel@acme.com',
  whatsapp: '11988887777',
  linkedin: 'linkedin.com/in/gabriel',
  source: { id: 'src-1', name: 'Indicação' },
  orgLinks: [
    {
      id: 'link-1',
      orgId: 'org-1',
      jobTitle: 'CTO',
      organization: { id: 'org-1', legalName: 'ACME LTDA', tradeName: 'ACME' },
    },
  ],
} as unknown as ContactDetailDto;

function setup(props: Partial<React.ComponentProps<typeof PessoaDialog>> = {}) {
  const onSaved = vi.fn();
  const onDeleted = vi.fn();
  const onClose = vi.fn();
  renderWithProviders(
    <PessoaDialog
      mode="create"
      sources={SOURCES}
      onSaved={onSaved}
      onDeleted={onDeleted}
      onClose={onClose}
      {...props}
    />,
  );
  return { onSaved, onDeleted, onClose };
}

describe('PessoaDialog — create mode', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ id: 'contact-new', name: 'Helena Braga' });
    addLinkMock.mockResolvedValue({ id: 'link-new' });
    listOrganizationsMock.mockResolvedValue([
      { id: 'org-1', legalName: 'ACME LTDA', tradeName: 'ACME' },
    ]);
  });

  it('should render the create title when mode is create', () => {
    setup();

    expect(screen.getByText('Nova Pessoa')).toBeInTheDocument();
  });

  it('should require a name before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  // The organization link is mandatory on creation but is enforced imperatively
  // in the submit handler, not by a resolver — so it surfaces as a toast.
  it('should refuse to create a person without an organization', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nome *'), 'Helena Braga');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Selecione a empresa'));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create the contact and link it to the chosen organization', async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = setup();

    await user.type(screen.getByLabelText('Nome *'), 'Helena Braga');
    await screen.findByRole('option', { name: 'ACME' });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'org-1');
    await user.type(screen.getByLabelText('Cargo'), 'COO');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0]).toMatchObject({ name: 'Helena Braga' });
    expect(addLinkMock).toHaveBeenCalledWith(
      'contact-new', { orgId: 'org-1', jobTitle: 'COO' }, TEST_TOKEN,
    );
    expect(onSaved).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should mask the typed whatsapp number', async () => {
    const user = userEvent.setup();
    setup();

    const whatsapp = screen.getByLabelText('WhatsApp');
    await user.type(whatsapp, '11988887777');

    expect(whatsapp).toHaveValue('(11) 98888-7777');
  });

  it('should send undefined instead of empty strings for untouched optional fields', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nome *'), 'Helena Braga');
    await screen.findByRole('option', { name: 'ACME' });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'org-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const payload = createMock.mock.calls[0][0];
    expect(payload.email).toBeUndefined();
    expect(payload.whatsapp).toBeUndefined();
    expect(payload.linkedin).toBeUndefined();
    expect(payload.sourceId).toBeUndefined();
  });

  it('should report the error and not notify the caller when creation fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['E-mail já cadastrado'], 409));
    const { onSaved } = setup();

    await user.type(screen.getByLabelText('Nome *'), 'Helena Braga');
    await screen.findByRole('option', { name: 'ACME' });
    await user.selectOptions(screen.getByRole('combobox', { name: '' }), 'org-1');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('E-mail já cadastrado'));
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe('PessoaDialog — edit mode', () => {
  beforeEach(() => {
    getMock.mockResolvedValue(CONTACT_DETAIL);
    updateMock.mockResolvedValue({ id: 'contact-1', name: 'Gabriel Nunes' });
    updateLinkMock.mockResolvedValue(undefined);
    removeMock.mockResolvedValue(undefined);
    removeLinkMock.mockResolvedValue(undefined);
    listOrganizationsMock.mockResolvedValue([]);
  });

  it('should load and prefill the contact being edited', async () => {
    setup({ mode: 'edit', contactId: 'contact-1' });

    expect(await screen.findByDisplayValue('Gabriel Nunes')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('contact-1', TEST_TOKEN);
    expect(screen.getByLabelText('E-mail')).toHaveValue('gabriel@acme.com');
    expect(screen.getByLabelText('Cargo')).toHaveValue('CTO');
    expect(screen.getByLabelText('Origem')).toHaveValue('src-1');
  });

  it('should show a loading placeholder until the contact arrives', () => {
    getMock.mockReturnValue(new Promise(() => {}));
    setup({ mode: 'edit', contactId: 'contact-1' });

    expect(screen.getByText('Carregando…')).toBeInTheDocument();
  });

  it('should update the contact by id without creating a new one', async () => {
    const user = userEvent.setup();
    const { onSaved } = setup({ mode: 'edit', contactId: 'contact-1' });

    await screen.findByDisplayValue('Gabriel Nunes');
    await user.clear(screen.getByLabelText('Nome *'));
    await user.type(screen.getByLabelText('Nome *'), 'Gabriel N. Souza');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(updateMock.mock.calls[0][0]).toBe('contact-1');
    expect(updateMock.mock.calls[0][1]).toMatchObject({ name: 'Gabriel N. Souza' });
    expect(createMock).not.toHaveBeenCalled();
    expect(onSaved).toHaveBeenCalled();
  });

  it('should only touch the org link when the job title actually changed', async () => {
    const user = userEvent.setup();
    setup({ mode: 'edit', contactId: 'contact-1' });

    await screen.findByDisplayValue('Gabriel Nunes');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    expect(updateLinkMock).not.toHaveBeenCalled();
  });

  it('should update the org link when the job title changed', async () => {
    const user = userEvent.setup();
    setup({ mode: 'edit', contactId: 'contact-1' });

    await screen.findByDisplayValue('Gabriel Nunes');
    await user.clear(screen.getByLabelText('Cargo'));
    await user.type(screen.getByLabelText('Cargo'), 'CEO');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => {
      expect(updateLinkMock).toHaveBeenCalledWith(
        'contact-1', 'link-1', { jobTitle: 'CEO' }, TEST_TOKEN,
      );
    });
  });

  it('should list the linked organizations instead of the picker', async () => {
    setup({ mode: 'edit', contactId: 'contact-1' });

    expect(await screen.findByText('ACME')).toBeInTheDocument();
    expect(screen.getByText('Empresas vinculadas')).toBeInTheDocument();
  });

  it('should remove an organization link when its remove button is pressed', async () => {
    const user = userEvent.setup();
    setup({ mode: 'edit', contactId: 'contact-1' });

    await screen.findByText('ACME');
    await user.click(screen.getByRole('button', { name: 'Remover vínculo' }));

    await waitFor(() => {
      expect(removeLinkMock).toHaveBeenCalledWith('contact-1', 'link-1', TEST_TOKEN);
    });
  });

  it('should delete the contact and notify the caller', async () => {
    const user = userEvent.setup();
    const { onDeleted, onClose } = setup({ mode: 'edit', contactId: 'contact-1' });

    await screen.findByDisplayValue('Gabriel Nunes');
    await user.click(screen.getByRole('button', { name: /Excluir/ }));

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('contact-1', TEST_TOKEN));
    expect(onDeleted).toHaveBeenCalledWith('contact-1');
    expect(onClose).toHaveBeenCalled();
  });
});
