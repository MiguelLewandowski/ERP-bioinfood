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

/**
 * O botão "Salvar" saiu na Onda 2 de UI: ele ficava `disabled` quase o tempo todo
 * — porque o autosave do blur já tinha salvado — e botão apagado lê como defeito.
 * O que entrou no lugar não é uma ação, é o estado do documento.
 *
 * O caso que protege a troca é o terceiro: sem botão, o único jeito de salvar é o
 * blur. Se ele parar de disparar, o usuário perde texto em silêncio.
 */
describe('CharterClient — estado de salvamento', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({});
    listContactsMock.mockResolvedValue([]);
    listUsersMock.mockResolvedValue(ALL_USERS);
  });

  it('should not offer a Salvar button, since the blur already persists', () => {
    renderWithProviders(
      <CharterClient projectId="proj-1" initialData={null} project={PROJECT} />,
    );

    expect(screen.queryByRole('button', { name: /^Salvar/ })).not.toBeInTheDocument();
  });

  it('should warn that changes are pending while the field is still focused', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CharterClient projectId="proj-1" initialData={null} project={PROJECT} />,
    );

    await user.type(screen.getByPlaceholderText(/Subvenção/), 'P&D Interno');

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it('should report the time of the autosave once the field loses focus', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <CharterClient projectId="proj-1" initialData={null} project={PROJECT} />,
    );

    await user.type(screen.getByPlaceholderText(/Subvenção/), 'P&D Interno');
    await user.tab();

    await waitFor(() => expect(upsertMock).toHaveBeenCalled());
    expect(await screen.findByText(/^Salvo às \d{2}:\d{2}$/)).toBeInTheDocument();
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument();
  });
});

/**
 * "Todas as bolinhas verdes" não era mapa de cor errado: a bolinha só era
 * renderizada quando a seção tinha conteúdo, então nunca havia uma segunda cor
 * para comparar. Os dois casos precisam existir juntos — testar só a preenchida
 * passa com o comportamento antigo.
 */
describe('CharterClient — progresso das seções no nav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({});
    listContactsMock.mockResolvedValue([]);
    listUsersMock.mockResolvedValue(ALL_USERS);
  });

  // A contagem sai do próprio nav: acrescentar uma seção ao TAP não deve
  // quebrar este teste por um número fixo desatualizado.
  it('should mark every section as empty when the charter has no content', () => {
    renderWithProviders(
      <CharterClient projectId="proj-1" initialData={null} project={PROJECT} />,
    );

    const sections = screen.getAllByRole('button').filter((b) => /^\d+\./.test(b.textContent ?? ''));
    expect(screen.getAllByLabelText('Seção vazia')).toHaveLength(sections.length);
    expect(screen.queryByLabelText('Seção preenchida')).not.toBeInTheDocument();
  });

  it('should distinguish a filled section from the empty ones', () => {
    const charter = {
      mainObjective: 'Reduzir o custo do xarope de xilose em 30%.',
      team: [],
    } as unknown as Parameters<typeof CharterClient>[0]['initialData'];

    renderWithProviders(
      <CharterClient projectId="proj-1" initialData={charter} project={PROJECT} />,
    );

    const sections = screen.getAllByRole('button').filter((b) => /^\d+\./.test(b.textContent ?? ''));
    expect(screen.getAllByLabelText('Seção preenchida')).toHaveLength(1);
    expect(screen.getAllByLabelText('Seção vazia')).toHaveLength(sections.length - 1);
  });

  // A seção Riscos não tem campo de formulário — quem a preenche são os riscos
  // cadastrados na aba. Sem isso ela ficaria eternamente cinza.
  it('should mark the risks section as filled when the project has risks', () => {
    renderWithProviders(
      <CharterClient
        projectId="proj-1"
        initialData={null}
        project={PROJECT}
        risks={[{ id: 'r-1', title: 'Fornecedor único', score: 12, probability: 3, impact: 4, owner: null }] as never}
      />,
    );

    expect(screen.getAllByLabelText('Seção preenchida')).toHaveLength(1);
  });
});

/**
 * O `charter-client` tinha UM `fmtDate` servindo aos dois tipos de data — e por
 * isso estava errado nas duas pontas: corrigir o dia de calendário quebraria o
 * instante, e deixar como estava mantinha o dia deslocado. O split em
 * `fmtDay`/`fmtInstant` foi a única mudança do bloco 2 que alterou assinatura de
 * função, e era a única sem teste.
 *
 * Os dois casos abaixo precisam existir juntos: um teste que só exercita dia de
 * calendário passa com um helper que quebra instantes, e vice-versa — é
 * exatamente a armadilha registrada no CLAUDE.md.
 *
 * O fuso é fixado em `vitest.config.ts` (America/Sao_Paulo): o caso de instante
 * depende do relógio local.
 */
describe('CharterClient — dia de calendário vs instante', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertMock.mockResolvedValue({});
    listContactsMock.mockResolvedValue([]);
    listUsersMock.mockResolvedValue(ALL_USERS);
  });

  // Dia de calendário: o usuário escolheu 01/10 num type="date". A API devolve
  // meia-noite UTC, que `new Date()` renderizaria como 30/09 em Brasília.
  it('should show the calendar day the API sent for the project dates', () => {
    const project = {
      ...PROJECT,
      startDate: '2026-10-01T00:00:00.000Z',
      endDate: '2026-12-31T00:00:00.000Z',
    } as unknown as ProjectDto;

    renderWithProviders(
      <CharterClient projectId="proj-1" initialData={null} project={project} />,
    );

    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getByText('31/12/2026')).toBeInTheDocument();
  });

  // Instante: aprovação carimbada às 22h de Brasília é 01:00Z do dia seguinte.
  // A hora local é a informação correta — `parseCalendarDate` mostraria 02/10.
  it('should show the local day for an approval stamped late at night', () => {
    const charter = {
      id: 'charter-1',
      projectId: 'proj-1',
      approvedAt: '2026-10-02T01:00:00.000Z',
      team: [],
    } as unknown as Parameters<typeof CharterClient>[0]['initialData'];

    renderWithProviders(
      <CharterClient projectId="proj-1" initialData={charter} project={PROJECT} />,
    );

    expect(screen.getByText(/Aprovado em 01\/10\/2026/)).toBeInTheDocument();
  });
});
