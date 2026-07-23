import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { ProjectDto, SystemRole } from '@bioinfood/shared';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import { CharterClient } from './charter-client';

const upsertMock = vi.fn();
const listUsersMock = vi.fn();
const listContactsMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  charterApi: {
    upsert: (...args: unknown[]) => upsertMock(...args),
    approve: vi.fn(),
  },
  contactsApi: { list: (...args: unknown[]) => listContactsMock(...args) },
  usersApi: { list: (...args: unknown[]) => listUsersMock(...args) },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

// O projeto tem UM acesso concedido; os outros usuários são internos e enxergam
// o projeto sem ProjectAccess — é justamente esse o caso que antes ficava de fora.
const PROJECT = {
  id: 'proj-1',
  name: 'Xarope de xilose',
  status: 'IN_PROGRESS',
  startDate: null,
  endDate: null,
  description: null,
  objective: null,
  client: null,
  createdBy: { id: 'user-1', name: 'Miguel' },
  accesses: [{ user: { id: 'user-2', name: 'Marina' } }],
} as unknown as ProjectDto;

const ALL_USERS = [
  { id: 'user-1', name: 'Miguel', isActive: true },
  { id: 'user-2', name: 'Marina', isActive: true },
  { id: 'user-3', name: 'Rafael', isActive: true },
  { id: 'user-4', name: 'Thiago', isActive: true },
  { id: 'user-5', name: 'Desativado', isActive: false },
];

async function setupRecursos(session?: { sub: string; email: string; role: SystemRole }) {
  const user = userEvent.setup();
  renderWithProviders(
    <CharterClient projectId="proj-1" initialData={null} project={PROJECT} />,
    session ? { session } : {},
  );
  await user.click(screen.getByRole('button', { name: /Recursos e Orçamento/ }));
  return user;
}

describe('CharterClient — equipe do TAP', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({});
    listContactsMock.mockResolvedValue([]);
    listUsersMock.mockResolvedValue(ALL_USERS);
  });

  // O bug: a lista saía de `createdBy + accesses`, então quem não tinha
  // ProjectAccess (a maioria do time interno) nunca aparecia para ser marcado.
  it('should offer every active user, not only those with project access', async () => {
    await setupRecursos();

    expect(await screen.findByLabelText('Rafael')).toBeInTheDocument();
    expect(screen.getByLabelText('Thiago')).toBeInTheDocument();
    expect(screen.getByLabelText('Marina')).toBeInTheDocument();
    expect(screen.getByLabelText('Miguel')).toBeInTheDocument();
  });

  it('should leave deactivated users out of the picker', async () => {
    await setupRecursos();

    await screen.findByLabelText('Rafael');
    expect(screen.queryByLabelText('Desativado')).not.toBeInTheDocument();
  });

  // O `<select multiple>` anterior exigia Ctrl+clique: marcar o segundo nome
  // desmarcava o primeiro, que é o "não dá para adicionar mais pessoas".
  it('should keep earlier picks when a second person is selected', async () => {
    const user = await setupRecursos();

    await user.click(await screen.findByLabelText('Rafael'));
    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    await user.click(screen.getByLabelText('Thiago'));

    await waitFor(() => {
      const last = upsertMock.mock.calls[upsertMock.mock.calls.length - 1];
      expect(last[1].teamUserIds).toEqual(['user-3', 'user-4']);
    });
    expect(screen.getByLabelText('Rafael')).toBeChecked();
    expect(screen.getByLabelText('Thiago')).toBeChecked();
  });

  it('should persist the team on the project route with the auth token', async () => {
    const user = await setupRecursos();

    await user.click(await screen.findByLabelText('Rafael'));

    await waitFor(() => {
      expect(upsertMock).toHaveBeenCalledWith('proj-1', expect.anything(), TEST_TOKEN);
    });
    expect(upsertMock.mock.calls[0][0]).toBe('proj-1');
  });

  it('should remove a person when the checkbox is unticked', async () => {
    const user = await setupRecursos();

    await user.click(await screen.findByLabelText('Rafael'));
    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    await user.click(screen.getByLabelText('Rafael'));

    await waitFor(() => {
      const last = upsertMock.mock.calls[upsertMock.mock.calls.length - 1];
      expect(last[1].teamUserIds).toEqual([]);
    });
  });

  // GET /users exige ADMIN ou PADRAO — CLIENTE cai nos membros do projeto em vez
  // de ver a seção vazia.
  it('should fall back to project members when the role cannot list users', async () => {
    await setupRecursos({ sub: 'user-9', email: 'externo@cliente.com', role: 'CLIENTE' as SystemRole });

    expect(await screen.findByLabelText('Miguel')).toBeInTheDocument();
    expect(screen.getByLabelText('Marina')).toBeInTheDocument();
    expect(screen.queryByLabelText('Rafael')).not.toBeInTheDocument();
    expect(listUsersMock).not.toHaveBeenCalled();
  });
});
