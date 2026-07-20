import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import ProjectDialog from './project-dialog';

const createMock = vi.fn();
const listOrganizationsMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  projectsApi: {
    create: (...args: unknown[]) => createMock(...args),
  },
  organizationsApi: {
    list: (...args: unknown[]) => listOrganizationsMock(...args),
    create: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

function setup() {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  renderWithProviders(
    <ProjectDialog open onOpenChange={onOpenChange} onCreated={onCreated} />,
  );
  return { onOpenChange, onCreated };
}

describe('ProjectDialog', () => {
  beforeEach(() => {
    createMock.mockResolvedValue({ id: 'proj-1', name: 'Projeto Levedura' });
    listOrganizationsMock.mockResolvedValue([
      { id: 'org-1', legalName: 'ACME LTDA', tradeName: 'ACME' },
    ]);
  });

  it('should render the create title and default the status to planning', () => {
    setup();

    expect(screen.getByText('Novo Projeto')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toHaveValue('PLANNING');
  });

  it('should require the project name', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should reject a name longer than 200 characters', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nome *'), 'x'.repeat(201));
    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    expect(
      await screen.findByText('Nome deve ter no máximo 200 caracteres'),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  // Business rule from the shared projectSchema: the range must be coherent.
  it('should reject an end date earlier than the start date', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nome *'), 'Projeto Levedura');
    await user.type(screen.getByLabelText('Data de início'), '2026-08-10');
    await user.type(screen.getByLabelText('Data de fim'), '2026-08-01');
    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    expect(
      await screen.findByText('A data de fim não pode ser anterior à data de início'),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should accept an end date equal to the start date', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nome *'), 'Projeto Levedura');
    await user.type(screen.getByLabelText('Data de início'), '2026-08-10');
    await user.type(screen.getByLabelText('Data de fim'), '2026-08-10');
    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
  });

  it('should create the project with the typed values and the auth token', async () => {
    const user = userEvent.setup();
    const { onCreated } = setup();

    await user.type(screen.getByLabelText('Nome *'), 'Projeto Levedura');
    await user.type(screen.getByLabelText('Descrição'), 'Fermentação otimizada');
    await user.selectOptions(screen.getByLabelText('Status'), 'IN_PROGRESS');
    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [payload, token] = createMock.mock.calls[0];
    expect(payload).toMatchObject({
      name: 'Projeto Levedura',
      description: 'Fermentação otimizada',
      status: 'IN_PROGRESS',
    });
    expect(token).toBe(TEST_TOKEN);
    expect(onCreated).toHaveBeenCalledWith({ id: 'proj-1', name: 'Projeto Levedura' });
  });

  it('should send undefined instead of empty strings for untouched dates', async () => {
    const user = userEvent.setup();
    setup();

    await user.type(screen.getByLabelText('Nome *'), 'Projeto Levedura');
    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const payload = createMock.mock.calls[0][0];
    expect(payload.startDate).toBeUndefined();
    expect(payload.endDate).toBeUndefined();
  });

  it('should load the client options from the API', async () => {
    setup();

    await waitFor(() => expect(listOrganizationsMock).toHaveBeenCalledWith(TEST_TOKEN));
    expect(await screen.findByRole('option', { name: 'ACME' })).toBeInTheDocument();
  });

  it('should show the server message and not report success when creation fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['name should not be empty'], 400));
    const { onCreated } = setup();

    await user.type(screen.getByLabelText('Nome *'), 'Projeto Levedura');
    await user.click(screen.getByRole('button', { name: 'Criar Projeto' }));

    // getErrorMessage translates the class-validator message into Portuguese.
    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
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
