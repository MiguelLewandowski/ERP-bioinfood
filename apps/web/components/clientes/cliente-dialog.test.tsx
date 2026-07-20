import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { TaxonomyDto, UserDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import ClienteDialog from './cliente-dialog';

const createMock = vi.fn();
const enrichMock = vi.fn();
const saveCustomerProfileMock = vi.fn();
const addProductServiceMock = vi.fn();
const toastWarningMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  organizationsApi: {
    create: (...args: unknown[]) => createMock(...args),
    enrich: (...args: unknown[]) => enrichMock(...args),
    saveCustomerProfile: (...args: unknown[]) => saveCustomerProfileMock(...args),
    addProductService: (...args: unknown[]) => addProductServiceMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { warning: (...args: unknown[]) => toastWarningMock(...args) },
}));

const SECTORS = [{ id: 'sec-1', name: 'Alimentos' }] as TaxonomyDto[];
const SOURCES = [{ id: 'src-1', name: 'Indicação' }] as TaxonomyDto[];
const CATEGORIES = [{ id: 'cat-1', name: 'Chave' }] as TaxonomyDto[];
const PRODUCT_SERVICES = [
  { id: 'ps-1', name: 'Análise sensorial' },
  { id: 'ps-2', name: 'Consultoria' },
] as TaxonomyDto[];
const USERS = [{ id: 'user-3', name: 'Elena Costa' }] as UserDto[];

function setup(overrides: Partial<React.ComponentProps<typeof ClienteDialog>> = {}) {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  renderWithProviders(
    <ClienteDialog
      open
      onOpenChange={onOpenChange}
      onCreated={onCreated}
      sectors={SECTORS}
      sources={SOURCES}
      categories={CATEGORIES}
      productServices={PRODUCT_SERVICES}
      users={USERS}
      {...overrides}
    />,
  );
  return { onOpenChange, onCreated };
}

describe('ClienteDialog', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ id: 'org-1', legalName: 'ACME LTDA' });
    enrichMock.mockResolvedValue({ enriched: false });
    saveCustomerProfileMock.mockResolvedValue(undefined);
    addProductServiceMock.mockResolvedValue(undefined);
  });

  it('should default the document type to CNPJ when opened', () => {
    setup();

    expect(screen.getByLabelText('Tipo')).toHaveValue('CNPJ');
    expect(screen.getByLabelText('CNPJ *')).toBeInTheDocument();
  });

  it('should require the legal name', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    expect(await screen.findByText('Razão social é obrigatória')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  // Business rule (decision 5 of crm-redesign-2026-07): the document is
  // mandatory unless the company is flagged as foreign.
  it('should require the document when the company is not foreign', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Razão social *'), 'ACME LTDA');
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    expect(
      await screen.findByText('CNPJ é obrigatório (ou marque a empresa como estrangeira)'),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should accept an empty document when the company is foreign', async () => {
    const user = userEvent.setup();
    setup();

    await user.selectOptions(screen.getByLabelText('Tipo'), 'FOREIGN');
    await user.type(screen.getByLabelText('Razão social *'), 'ACME INC');
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    expect(createMock.mock.calls[0][0]).toMatchObject({
      legalName: 'ACME INC',
      documentType: 'FOREIGN',
    });
  });

  it('should relabel the document field as optional when the company is foreign', async () => {
    const user = userEvent.setup();
    setup();

    await user.selectOptions(screen.getByLabelText('Tipo'), 'FOREIGN');

    expect(await screen.findByLabelText('Documento (opcional)')).toBeInTheDocument();
    expect(screen.queryByLabelText('CNPJ *')).not.toBeInTheDocument();
  });

  it('should create the organization with the selected taxonomies and auth token', async () => {
    const user = userEvent.setup();
    const { onCreated } = setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.type(screen.getByLabelText('Razão social *'), 'ACME LTDA');
    await user.type(screen.getByLabelText('Nome'), 'ACME');
    await user.selectOptions(screen.getByLabelText('Setor'), 'sec-1');
    await user.selectOptions(screen.getByLabelText('Origem'), 'src-1');
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [payload, token] = createMock.mock.calls[0];
    expect(payload).toMatchObject({
      legalName: 'ACME LTDA',
      tradeName: 'ACME',
      sectorId: 'sec-1',
      sourceId: 'src-1',
    });
    expect(token).toBe(TEST_TOKEN);
    expect(onCreated).toHaveBeenCalledWith({ id: 'org-1', legalName: 'ACME LTDA' });
  });

  it('should omit unselected taxonomies instead of sending empty strings', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.type(screen.getByLabelText('Razão social *'), 'ACME LTDA');
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const payload = createMock.mock.calls[0][0];
    expect(payload.sectorId).toBeUndefined();
    expect(payload.sourceId).toBeUndefined();
    expect(payload.categoryId).toBeUndefined();
  });

  it('should mask the typed document as a CNPJ', async () => {
    const user = userEvent.setup();
    setup();

    const document = screen.getByLabelText('CNPJ *');
    await user.type(document, '11222333000181');

    expect(document).toHaveValue('11.222.333/0001-81');
  });

  it('should prefill the name fields when CNPJ enrichment succeeds', async () => {
    const user = userEvent.setup();
    enrichMock.mockResolvedValue({
      enriched: true,
      legalName: 'ACME INDUSTRIA LTDA',
      tradeName: 'ACME',
      description: 'Fabricação de alimentos',
    });
    setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.tab();

    await waitFor(() => {
      expect(screen.getByLabelText('Razão social *')).toHaveValue('ACME INDUSTRIA LTDA');
    });
    expect(screen.getByLabelText('Nome')).toHaveValue('ACME');
    expect(enrichMock).toHaveBeenCalledWith('11222333000181', TEST_TOKEN);
    expect(screen.getByText(/revise antes de salvar/i)).toBeInTheDocument();
  });

  it('should tell the user to fill in manually when enrichment finds nothing', async () => {
    const user = userEvent.setup();
    enrichMock.mockResolvedValue({ enriched: false });
    setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.tab();

    expect(
      await screen.findByText('Não foi possível consultar o CNPJ. Preencha manualmente.'),
    ).toBeInTheDocument();
  });

  it('should not attempt enrichment for an incomplete CNPJ', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('CNPJ *'), '112223');
    await user.tab();

    expect(enrichMock).not.toHaveBeenCalled();
  });

  it('should link the sales rep after the organization exists', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.type(screen.getByLabelText('Razão social *'), 'ACME LTDA');
    await user.selectOptions(screen.getByLabelText('Responsável'), 'user-3');
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    await waitFor(() => {
      expect(saveCustomerProfileMock).toHaveBeenCalledWith(
        'org-1', { salesRepId: 'user-3' }, TEST_TOKEN,
      );
    });
    // salesRepId belongs to the profile call, not to the organization payload.
    expect(createMock.mock.calls[0][0].salesRepId).toBeUndefined();
  });

  it('should attach each selected product or service to the new organization', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.type(screen.getByLabelText('Razão social *'), 'ACME LTDA');
    await user.click(screen.getByRole('button', { name: 'Análise sensorial' }));
    await user.click(screen.getByRole('button', { name: 'Consultoria' }));
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    await waitFor(() => expect(addProductServiceMock).toHaveBeenCalledTimes(2));
    expect(addProductServiceMock).toHaveBeenCalledWith('org-1', 'ps-1', TEST_TOKEN);
    expect(addProductServiceMock).toHaveBeenCalledWith('org-1', 'ps-2', TEST_TOKEN);
  });

  it('should warn but still report success when a follow-up call fails', async () => {
    const user = userEvent.setup();
    addProductServiceMock.mockRejectedValue(new ApiError(['Erro'], 500));
    const { onCreated } = setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.type(screen.getByLabelText('Razão social *'), 'ACME LTDA');
    await user.click(screen.getByRole('button', { name: 'Análise sensorial' }));
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    await waitFor(() => expect(toastWarningMock).toHaveBeenCalled());
    // The organization itself was created, so the caller must still be notified.
    expect(onCreated).toHaveBeenCalled();
  });

  it('should surface the server message and not report success when creation fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['CNPJ já cadastrado'], 409));
    const { onCreated } = setup();

    await user.type(screen.getByLabelText('CNPJ *'), '11222333000181');
    await user.type(screen.getByLabelText('Razão social *'), 'ACME LTDA');
    await user.click(screen.getByRole('button', { name: 'Criar Empresa' }));

    expect(await screen.findByText('CNPJ já cadastrado')).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('should close without creating anything when cancel is pressed', async () => {
    const user = userEvent.setup();
    const { onOpenChange, onCreated } = setup();

    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(createMock).not.toHaveBeenCalled();
    expect(onCreated).not.toHaveBeenCalled();
  });
});
