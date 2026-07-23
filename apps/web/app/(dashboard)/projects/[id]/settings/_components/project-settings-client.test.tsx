import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ProjectDto, SystemRole } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN, TEST_SESSION } from '@/lib/test-utils';
import { ProjectSettingsClient } from './project-settings-client';

const patchMock = vi.fn();
const removeProjectMock = vi.fn();
const listOrganizationsMock = vi.fn();
const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, refresh: vi.fn() }),
}));

vi.mock('@/lib/api', () => ({
  api: { patch: (...args: unknown[]) => patchMock(...args) },
}));

vi.mock('@/lib/api-hooks', () => ({
  projectsApi: { remove: (...args: unknown[]) => removeProjectMock(...args) },
  organizationsApi: {
    list: (...args: unknown[]) => listOrganizationsMock(...args),
    create: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const PROJECT = {
  id: 'proj-1',
  name: 'Projeto Levedura',
  description: 'Fermentação',
  status: 'IN_PROGRESS',
  startDate: '2026-07-01T00:00:00.000Z',
  endDate: '2026-12-31T00:00:00.000Z',
  objective: 'Otimizar rendimento',
  client: { id: 'org-1', legalName: 'ACME LTDA', tradeName: 'ACME' },
} as unknown as ProjectDto;

function setup(role: SystemRole = 'ADMIN', project: ProjectDto | null = PROJECT) {
  renderWithProviders(
    <ProjectSettingsClient projectId="proj-1" token={TEST_TOKEN} project={project} />,
    { session: { ...TEST_SESSION, role } },
  );
}

describe('ProjectSettingsClient', () => {
  beforeEach(() => {
    patchMock.mockResolvedValue(undefined);
    removeProjectMock.mockResolvedValue(undefined);
    listOrganizationsMock.mockResolvedValue([
      { id: 'org-1', legalName: 'ACME LTDA', tradeName: 'ACME' },
    ]);
  });

  it('should prefill the form from the current project', () => {
    setup();

    expect(screen.getByLabelText('Nome do Projeto *')).toHaveValue('Projeto Levedura');
    expect(screen.getByLabelText('Status')).toHaveValue('IN_PROGRESS');
    expect(screen.getByLabelText('Objetivo resumido')).toHaveValue('Otimizar rendimento');
  });

  it('should strip the time component from the stored dates for the date inputs', () => {
    setup();

    expect(screen.getByLabelText('Data de Início')).toHaveValue('2026-07-01');
    expect(screen.getByLabelText('Data de Término')).toHaveValue('2026-12-31');
  });

  it('should keep save disabled until something actually changes', async () => {
    const user = userEvent.setup();
    setup();

    expect(screen.getByRole('button', { name: /Salvar Alterações/ })).toBeDisabled();

    await user.type(screen.getByLabelText('Nome do Projeto *'), ' II');

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Salvar Alterações/ })).toBeEnabled();
    });
  });

  it('should require a name', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(screen.getByLabelText('Nome do Projeto *'));
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }));

    expect(await screen.findByText('Nome é obrigatório')).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });

  it('should reject an end date earlier than the start date', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(screen.getByLabelText('Data de Término'));
    await user.type(screen.getByLabelText('Data de Término'), '2026-06-01');
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }));

    expect(
      await screen.findByText('A data de término não pode ser anterior à data de início'),
    ).toBeInTheDocument();
    expect(patchMock).not.toHaveBeenCalled();
  });

  it('should patch the project with the edited values and the auth token', async () => {
    const user = userEvent.setup();
    setup();

    await user.clear(screen.getByLabelText('Nome do Projeto *'));
    await user.type(screen.getByLabelText('Nome do Projeto *'), 'Projeto Levedura II');
    await user.selectOptions(screen.getByLabelText('Status'), 'COMPLETED');
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }));

    await waitFor(() => expect(patchMock).toHaveBeenCalled());
    const [url, payload, token] = patchMock.mock.calls[0];
    expect(url).toBe('/projects/proj-1');
    expect(payload).toMatchObject({
      name: 'Projeto Levedura II',
      status: 'COMPLETED',
    });
    expect(token).toBe(TEST_TOKEN);
  });

  it('should show the server message when saving fails', async () => {
    const user = userEvent.setup();
    patchMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await user.type(screen.getByLabelText('Nome do Projeto *'), ' II');
    await user.click(screen.getByRole('button', { name: /Salvar Alterações/ }));

    expect(await screen.findByText('Forbidden resource')).toBeInTheDocument();
  });

  // RBAC: permanent deletion is restricted to ADMIN.
  it('should show the danger zone for an admin', () => {
    setup('ADMIN');

    expect(screen.getByRole('button', { name: /Excluir projeto/ })).toBeInTheDocument();
  });

  it('should hide the danger zone from non-admin roles', () => {
    setup('PADRAO');

    expect(screen.queryByRole('button', { name: /Excluir projeto/ })).not.toBeInTheDocument();
    expect(screen.queryByText('Zona de perigo')).not.toBeInTheDocument();
  });

  it('should ask for confirmation before deleting the project', async () => {
    const user = userEvent.setup();
    setup('ADMIN');

    await user.click(screen.getByRole('button', { name: /Excluir projeto/ }));

    expect(await screen.findByText('Excluir projeto definitivamente?')).toBeInTheDocument();
    expect(removeProjectMock).not.toHaveBeenCalled();
  });

  it('should delete the project and leave the page when confirmed', async () => {
    const user = userEvent.setup();
    setup('ADMIN');

    await user.click(screen.getByRole('button', { name: /Excluir projeto/ }));
    await screen.findByText('Excluir projeto definitivamente?');
    await user.click(screen.getByRole('button', { name: 'Excluir definitivamente' }));

    await waitFor(() => {
      expect(removeProjectMock).toHaveBeenCalledWith('proj-1', TEST_TOKEN);
    });
    expect(pushMock).toHaveBeenCalledWith('/projects');
  });

  it('should keep the project when the delete confirmation is dismissed', async () => {
    const user = userEvent.setup();
    setup('ADMIN');

    await user.click(screen.getByRole('button', { name: /Excluir projeto/ }));
    await screen.findByText('Excluir projeto definitivamente?');
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => {
      expect(screen.queryByText('Excluir projeto definitivamente?')).not.toBeInTheDocument();
    });
    expect(removeProjectMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });
});
