import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { WbsNodeDto } from '@bioinfood/shared';
import type { WbsRollup } from '@/lib/project-wbs';
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

const MEMBERS = [
  { id: 'user-2', name: 'Juliana' },
  { id: 'user-3', name: 'Thiago' },
];

function setup(
  nodes: WbsNodeDto[] = [PARENT, LEAF],
  members = MEMBERS,
  rollup: Record<string, WbsRollup> = {},
) {
  return renderWithProviders(
    <WbsClient projectId="proj-1" initialNodes={nodes} members={members} rollup={rollup} />,
  );
}

describe('WbsClient — andamento do pacote', () => {
  it('should show progress and task count on the package row', () => {
    setup([PARENT, LEAF], MEMBERS, {
      p1: { total: 12, done: 7, progress: 58 },
      l1: { total: 4, done: 4, progress: 100 },
    });

    expect(screen.getByText('7/12 tarefas')).toBeInTheDocument();
    expect(screen.getByText('58%')).toBeInTheDocument();
    expect(screen.getByText('4/4 tarefas')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('should say a package has no tasks instead of showing 0%', () => {
    setup([PARENT, LEAF], MEMBERS, { p1: { total: 0, done: 0, progress: 0 } });

    expect(screen.getAllByText('sem tarefas').length).toBeGreaterThan(0);
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });
});

describe('WbsClient — detalhes do pacote de trabalho', () => {
  beforeEach(() => vi.clearAllMocks());

  // Antes a linha marcava o que estava preenchido — como quase tudo está, os
  // selos apareciam em toda linha e viravam ruído. Agora a linha só fala quando
  // falta alguma coisa: um pacote completo não gera selo nenhum.
  it('should stay silent on a work package that has nothing missing', () => {
    setup();

    expect(screen.getByText('Juliana')).toBeInTheDocument();
    expect(screen.queryByText('pronto')).not.toBeInTheDocument();
    expect(screen.queryByText('saídas')).not.toBeInTheDocument();
    expect(screen.queryByText(/falta/)).not.toBeInTheDocument();
  });

  it('should flag exactly what is missing on an incomplete work package', () => {
    setup([PARENT, makeNode({ id: 'l2', code: '1.2', title: 'Sem saídas', parentId: 'p1', owner: 'Juliana', readyCriteria: 'Pronto quando validado' })]);

    expect(screen.getByRole('button', { name: /falta saídas/ })).toBeInTheDocument();
    expect(screen.queryByText(/falta critério de pronto/)).not.toBeInTheDocument();
  });

  it('should flag a work package that has no owner', () => {
    setup([makeNode({ id: 'l2', code: '2', title: 'Órfã', owner: null, readyCriteria: 'x', outputs: 'y' })]);

    expect(screen.getByText('sem dono')).toBeInTheDocument();
  });

  // Critério de pronto e saídas se cobram de quem executa, não de quem agrupa.
  it('should not demand ready criteria from a package that only groups children', () => {
    setup();

    // PARENT ('Bancada') não tem readyCriteria nem outputs, mas tem filho.
    expect(screen.queryAllByRole('button', { name: /falta/ })).toHaveLength(0);
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

// O dono era texto livre: cada um digitava o nome de um jeito e nada garantia
// que a pessoa estivesse no projeto.
describe('WbsClient — dono do pacote', () => {
  beforeEach(() => vi.clearAllMocks());

  async function openEditor(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Curva de extração' }));
    await user.click(await screen.findByRole('button', { name: /Editar/ }));
    return screen.findByLabelText(/Dono/);
  }

  it('should offer the project team as owner options instead of a free text field', async () => {
    const user = userEvent.setup();
    setup();

    const select = await openEditor(user);

    expect(select.tagName).toBe('SELECT');
    expect(screen.getByRole('option', { name: 'Juliana' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Thiago' })).toBeInTheDocument();
  });

  it('should allow clearing the owner', async () => {
    const user = userEvent.setup();
    setup();

    await openEditor(user);

    expect(screen.getByRole('option', { name: '— Sem responsável —' })).toBeInTheDocument();
  });

  // Nó antigo com nome digitado à mão não pode perder o dono só por abrir o drawer.
  it('should keep an owner that is not on the team as a selectable option', async () => {
    const user = userEvent.setup();
    setup([PARENT, { ...LEAF, owner: 'Fulano Antigo' } as WbsNodeDto]);

    const select = await openEditor(user);

    expect(select).toHaveValue('Fulano Antigo');
    expect(screen.getByText(/não está na equipe do projeto/)).toBeInTheDocument();
  });

  it('should point to the charter when the project has no team yet', async () => {
    const user = userEvent.setup();
    setup([PARENT, LEAF], []);

    await openEditor(user);

    expect(screen.getByRole('link', { name: 'Termo de Abertura' })).toHaveAttribute(
      'href', '/projects/proj-1/charter',
    );
  });
});
