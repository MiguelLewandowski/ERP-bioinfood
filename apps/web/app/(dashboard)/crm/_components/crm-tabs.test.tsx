import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen } from '@/lib/test-utils';
import { CrmTabs } from './crm-tabs';

// As abas montam telas inteiras do CRM; aqui o alvo é só a navegação entre elas.
vi.mock('@/components/clientes/clientes-client', () => ({
  default: () => <div>painel de empresas</div>,
}));
vi.mock('./crm-client', () => ({ CrmClient: () => <div>painel de oportunidades</div> }));
vi.mock('./pessoas-tab', () => ({ PessoasTab: () => <div>painel de pessoas</div> }));
vi.mock('./tarefas-tab', () => ({ TarefasTab: () => <div>painel de tarefas</div> }));

const PROPS = {
  initialTab: 'empresas' as const,
  organizations: [], contacts: [], sources: [], sectors: [], categories: [],
  productServices: [], users: [], pipelines: [], currentPipeline: null,
  initialOpportunities: [], summary: null, opportunityTasks: [], canEdit: true,
};

function setup(initialTab: 'empresas' | 'pessoas' | 'oportunidades' | 'tarefas' = 'empresas') {
  renderWithProviders(<CrmTabs {...PROPS} initialTab={initialTab} />);
}

beforeEach(() => {
  window.history.replaceState(null, '', '/crm');
});

describe('CrmTabs', () => {
  it('should open on the tab the server resolved', () => {
    setup('oportunidades');

    expect(screen.getByText('painel de oportunidades')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Oportunidades/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('should switch the panel when another tab is clicked', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('tab', { name: /Pessoas/ }));

    expect(screen.getByText('painel de pessoas')).toBeInTheDocument();
    expect(screen.queryByText('painel de empresas')).not.toBeInTheDocument();
  });

  // O motivo da mudança: antes a aba só existia em estado local, então recarregar
  // ou compartilhar o link caía sempre na aba inicial.
  it('should put the active tab in the URL so the link can be shared', async () => {
    const user = userEvent.setup();
    setup();

    await user.click(screen.getByRole('tab', { name: /Tarefas/ }));

    expect(new URL(window.location.href).searchParams.get('tab')).toBe('tarefas');
  });

  it('should keep the other query params when switching tabs', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/crm?pipeline=abc');
    setup();

    await user.click(screen.getByRole('tab', { name: /Pessoas/ }));

    const params = new URL(window.location.href).searchParams;
    expect(params.get('pipeline')).toBe('abc');
    expect(params.get('tab')).toBe('pessoas');
  });

  // Padrão ARIA de tabs: só a aba ativa é tabulável, as outras vêm pelas setas.
  it('should keep only the active tab in the tab order', () => {
    setup();

    expect(screen.getByRole('tab', { name: /Empresas/ })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: /Pessoas/ })).toHaveAttribute('tabindex', '-1');
  });

  it('should move to the next tab with the right arrow', async () => {
    const user = userEvent.setup();
    setup();

    screen.getByRole('tab', { name: /Empresas/ }).focus();
    await user.keyboard('{ArrowRight}');

    expect(screen.getByRole('tab', { name: /Pessoas/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('should wrap around to the last tab with the left arrow', async () => {
    const user = userEvent.setup();
    setup();

    screen.getByRole('tab', { name: /Empresas/ }).focus();
    await user.keyboard('{ArrowLeft}');

    expect(screen.getByRole('tab', { name: /Tarefas/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('should tie the panel to its tab for assistive tech', () => {
    setup();

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveAttribute('aria-labelledby', 'crm-tab-empresas');
  });
});
