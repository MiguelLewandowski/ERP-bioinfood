import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { PopDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, within, TEST_TOKEN } from '@/lib/test-utils';
import { PopsClient } from './pops-client';

const createMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  popsApi: {
    create: (...args: unknown[]) => createMock(...args),
    createVersion: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args), success: vi.fn() },
}));

// Mirrors PopDto exactly — latestVersion.createdBy is non-optional in the
// contract and the API always includes it.
const CREATED_POP: PopDto = {
  id: 'pop-new',
  title: 'Limpeza de bancada',
  description: null,
  category: { id: 'cat-1', name: 'Qualidade' },
  latestVersion: {
    id: 'v1',
    versionNumber: 1,
    changeNotes: null,
    fileUrl: null,
    createdBy: { id: 'user-1', name: 'Tester' },
    createdAt: '2026-07-20T00:00:00.000Z',
  },
  createdAt: '2026-07-20T00:00:00.000Z',
};

const CATEGORIES = [
  { id: 'cat-1', name: 'Qualidade', isActive: true, order: 0 },
  { id: 'cat-2', name: 'Processo', isActive: true, order: 1 },
];

function setup(initialPops: PopDto[] = [], categories = CATEGORIES) {
  renderWithProviders(<PopsClient initialPops={initialPops} categories={categories} />);
}

// With an empty list there are two entry points — the header button and the
// empty-state CTA. Both are valid; the header one is always present.
async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getAllByRole('button', { name: /Nova POP/ })[0]);
  await screen.findByLabelText('Título *');
}

// Categoria virou obrigatória — sem escolher uma, o zod barra o submit.
async function fillRequired(user: ReturnType<typeof userEvent.setup>, title: string) {
  await user.type(screen.getByLabelText('Título *'), title);
  await user.selectOptions(screen.getByLabelText('Categoria *'), 'cat-1');
}

describe('PopsClient form', () => {
  beforeEach(() => {
    createMock.mockResolvedValue(CREATED_POP);
  });

  it('should require a title before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Título é obrigatório')).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should reject a title longer than 200 characters', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'x'.repeat(201));
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Título deve ter no máximo 200 caracteres'),
    ).toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should create the POP with the typed values and the auth token', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await fillRequired(user, 'Limpeza de bancada');
    await user.type(screen.getByLabelText('Descrição'), 'Procedimento diário');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    const [payload, token] = createMock.mock.calls[0];
    expect(payload).toMatchObject({
      title: 'Limpeza de bancada',
      description: 'Procedimento diário',
    });
    expect(token).toBe(TEST_TOKEN);
  });

  it('should prepend the created POP to the list and close the form', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await fillRequired(user, 'Limpeza de bancada');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Limpeza de bancada')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument());
  });

  it('should report the error and keep the form open when creation fails', async () => {
    const user = userEvent.setup();
    createMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await openForm(user);
    await fillRequired(user, 'Limpeza de bancada');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Forbidden resource'));
    expect(screen.getByLabelText('Título *')).toBeInTheDocument();
  });

  it('should close without creating anything when cancel is pressed', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));

    await waitFor(() => expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument());
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe('PopsClient — busca e filtros', () => {
  const LIMPEZA: PopDto = { ...CREATED_POP, id: 'p1', title: 'Limpeza de bancada' };
  const REATOR: PopDto = {
    ...CREATED_POP,
    id: 'p2',
    title: 'Operação do reator piloto',
    description: 'Partida e parada da batelada',
    category: { id: 'cat-2', name: 'Processo' },
  };

  it('should filter the list by the typed name', async () => {
    const user = userEvent.setup();
    setup([LIMPEZA, REATOR]);

    await user.type(screen.getByLabelText('Buscar POP por nome'), 'reator');

    expect(screen.getByText('Operação do reator piloto')).toBeInTheDocument();
    expect(screen.queryByText('Limpeza de bancada')).not.toBeInTheDocument();
  });

  it('should match the description too, not only the title', async () => {
    const user = userEvent.setup();
    setup([LIMPEZA, REATOR]);

    await user.type(screen.getByLabelText('Buscar POP por nome'), 'batelada');

    expect(screen.getByText('Operação do reator piloto')).toBeInTheDocument();
  });

  it('should ignore casing when searching', async () => {
    const user = userEvent.setup();
    setup([LIMPEZA, REATOR]);

    await user.type(screen.getByLabelText('Buscar POP por nome'), 'LIMPEZA');

    expect(screen.getByText('Limpeza de bancada')).toBeInTheDocument();
  });

  it('should narrow the list to the chosen category', async () => {
    const user = userEvent.setup();
    setup([LIMPEZA, REATOR]);

    await user.selectOptions(screen.getByLabelText('Filtrar por categoria'), 'cat-2');

    expect(screen.getByText('Operação do reator piloto')).toBeInTheDocument();
    expect(screen.queryByText('Limpeza de bancada')).not.toBeInTheDocument();
  });

  it('should count the POPs of each category on the filter select', () => {
    setup([LIMPEZA, REATOR]);

    const select = screen.getByLabelText('Filtrar por categoria');
    expect(screen.getByText('Todas as categorias (2)')).toBeInTheDocument();
    expect(within(select).getByText('Qualidade (1)')).toBeInTheDocument();
  });

  it('should offer a way out when nothing matches', async () => {
    const user = userEvent.setup();
    setup([LIMPEZA, REATOR]);

    await user.type(screen.getByLabelText('Buscar POP por nome'), 'inexistente');
    expect(screen.getByText('Nenhuma POP encontrada')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }));
    expect(screen.getByText('Limpeza de bancada')).toBeInTheDocument();
  });
});
