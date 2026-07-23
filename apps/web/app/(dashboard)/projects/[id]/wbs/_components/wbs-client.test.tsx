import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { WbsNodeDto } from '@bioinfood/shared';
import { renderWithProviders, screen } from '@/lib/test-utils';
import { WbsClient } from './wbs-client';

vi.mock('@/lib/api-hooks', () => ({
  wbsApi: { create: vi.fn(), update: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

function makeNode(overrides: Partial<WbsNodeDto> = {}): WbsNodeDto {
  return {
    id: 'n1',
    projectId: 'proj-1',
    code: '1',
    title: 'Extração de coprodutos',
    parentId: null,
    order: 0,
    owner: null,
    readyCriteria: null,
    outputs: null,
    ...overrides,
  } as unknown as WbsNodeDto;
}

// Pacote de trabalho detalhado (folha de nível 2).
const PARENT = makeNode({ id: 'p1', code: '1', title: 'Bancada' });
const LEAF = makeNode({
  id: 'l1',
  code: '1.1',
  title: 'Curva de extração',
  parentId: 'p1',
  owner: 'Juliana',
  readyCriteria: 'Rendimento acima de 70% em triplicata',
  outputs: 'Relatório de extração + planilha bruta',
});

function setup(nodes: WbsNodeDto[] = [PARENT, LEAF]) {
  return renderWithProviders(<WbsClient projectId="proj-1" token="t" initialNodes={nodes} />);
}

describe('WbsClient — detalhes do pacote de trabalho', () => {
  beforeEach(() => vi.clearAllMocks());

  // O motivo da mudança: antes, dono/pronto/saídas só existiam dentro do drawer
  // de edição — nada na árvore dizia se o pacote estava documentado.
  it('should mark which details are filled without opening the panel', () => {
    setup();

    expect(screen.getByText('Juliana')).toBeInTheDocument();
    expect(screen.getByText('pronto')).toBeInTheDocument();
    expect(screen.getByText('saídas')).toBeInTheDocument();
  });

  it('should keep the detail text hidden until the work package is expanded', () => {
    setup();

    expect(screen.queryByText('Rendimento acima de 70% em triplicata')).not.toBeInTheDocument();
  });

  it('should show owner, ready criteria and outputs when the work package is expanded', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Curva de extração' }));

    expect(await screen.findByText('Rendimento acima de 70% em triplicata')).toBeInTheDocument();
    expect(screen.getByText('Relatório de extração + planilha bruta')).toBeInTheDocument();
    expect(screen.getByText('Critério de pronto')).toBeInTheDocument();
  });

  it('should say a field is empty instead of hiding it', async () => {
    const user = userEvent.setup();
    setup([PARENT, makeNode({ id: 'l2', code: '1.1', title: 'Sem detalhes', parentId: 'p1' })]);

    await user.click(screen.getByRole('button', { name: 'Sem detalhes' }));

    expect(await screen.findAllByText('Não preenchido')).toHaveLength(3);
  });

  it('should expand every work package at once from the header toggle', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: /Expandir detalhes/ }));

    expect(await screen.findByText('Rendimento acima de 70% em triplicata')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Recolher detalhes/ })).toBeInTheDocument();
  });

  // O chevron navega a árvore; o título abre os detalhes. Separados porque um
  // agrupador precisa das duas ações e antes o dono dele não aparecia em lugar nenhum.
  it('should collapse children from the chevron, not from the title', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('button', { name: 'Expandir sub-entregáveis' }));

    expect(screen.queryByRole('button', { name: 'Curva de extração' })).not.toBeInTheDocument();
  });

  it('should show the details of a parent node too', async () => {
    const user = userEvent.setup();
    setup([
      makeNode({ id: 'p2', code: '2', title: 'Piloto', owner: 'Thiago' }),
      makeNode({ id: 'l3', code: '2.1', title: 'Comissionamento', parentId: 'p2' }),
    ]);

    expect(screen.getByText('Thiago')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Piloto' }));

    expect(await screen.findByText('Dono')).toBeInTheDocument();
    // Continua sendo agrupador: abrir detalhes não esconde os filhos.
    expect(screen.getByRole('button', { name: 'Comissionamento' })).toBeInTheDocument();
  });
});
