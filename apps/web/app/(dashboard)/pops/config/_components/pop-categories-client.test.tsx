import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import { PopCategoriesClient, type CategoryWithCount } from './pop-categories-client';

const createMock = vi.fn();
const updateMock = vi.fn();
const removeMock = vi.fn();
const refreshMock = vi.fn();
const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();

vi.mock('@/lib/api-hooks', () => ({
  popsApi: {
    createCategory: (...a: unknown[]) => createMock(...a),
    updateCategory: (...a: unknown[]) => updateMock(...a),
    removeCategory: (...a: unknown[]) => removeMock(...a),
  },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: refreshMock }) }));

vi.mock('sonner', () => ({
  toast: {
    error: (...a: unknown[]) => toastErrorMock(...a),
    success: (...a: unknown[]) => toastSuccessMock(...a),
  },
}));

function cat(overrides: Partial<CategoryWithCount> = {}): CategoryWithCount {
  return { id: 'c1', name: 'Análise laboratorial', isActive: true, order: 0, popCount: 0, ...overrides };
}

function setup(categories: CategoryWithCount[] = [cat()]) {
  renderWithProviders(<PopCategoriesClient categories={categories} />);
}

beforeEach(() => vi.clearAllMocks());

describe('PopCategoriesClient', () => {
  it('should create a category with the typed name', async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValue({ id: 'c2', name: 'Processo' });
    setup([]);

    await user.type(screen.getByLabelText('Nome da nova categoria'), 'Processo');
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));

    await waitFor(() => expect(createMock).toHaveBeenCalledWith('Processo', TEST_TOKEN));
    expect(refreshMock).toHaveBeenCalled();
  });

  it('should trim the name before creating', async () => {
    const user = userEvent.setup();
    createMock.mockResolvedValue({ id: 'c2', name: 'Processo' });
    setup([]);

    await user.type(screen.getByLabelText('Nome da nova categoria'), '  Processo  ');
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));

    await waitFor(() => expect(createMock).toHaveBeenCalledWith('Processo', TEST_TOKEN));
  });

  it('should not create an empty category', async () => {
    const user = userEvent.setup();
    setup([]);

    // Botão desabilitado enquanto o campo está vazio.
    expect(screen.getByRole('button', { name: /Adicionar/ })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Adicionar/ }));
    expect(createMock).not.toHaveBeenCalled();
  });

  it('should rename a category', async () => {
    const user = userEvent.setup();
    updateMock.mockResolvedValue({});
    setup([cat({ id: 'c1', name: 'Antiga' })]);

    await user.click(screen.getByRole('button', { name: 'Renomear Antiga' }));
    const field = screen.getByLabelText('Novo nome de Antiga');
    await user.clear(field);
    await user.type(field, 'Nova');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(updateMock).toHaveBeenCalledWith('c1', { name: 'Nova' }, TEST_TOKEN));
  });

  it('should toggle a category between active and inactive', async () => {
    const user = userEvent.setup();
    updateMock.mockResolvedValue({});
    setup([cat({ id: 'c1', isActive: true })]);

    await user.click(screen.getByRole('button', { name: 'Ativa' }));

    expect(updateMock).toHaveBeenCalledWith('c1', { isActive: false }, TEST_TOKEN);
  });

  it('should show how many POPs use each category', () => {
    setup([cat({ name: 'Qualidade', popCount: 3 })]);

    expect(screen.getByText('3 POPs')).toBeInTheDocument();
  });

  // FK RESTRICT: o backend recusa, mas antecipamos para não oferecer a ação.
  it('should refuse to delete a category still in use, without calling the API', async () => {
    const user = userEvent.setup();
    setup([cat({ id: 'c1', name: 'Em uso', popCount: 2 })]);

    await user.click(screen.getByRole('button', { name: 'Excluir Em uso' }));

    expect(removeMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining('em uso por 2'));
  });

  it('should delete a category that no POP uses', async () => {
    const user = userEvent.setup();
    removeMock.mockResolvedValue(undefined);
    setup([cat({ id: 'c1', name: 'Vazia', popCount: 0 })]);

    await user.click(screen.getByRole('button', { name: 'Excluir Vazia' }));
    // ConfirmProvider real: confirmar no diálogo.
    await user.click(await screen.findByRole('button', { name: 'Excluir' }));

    await waitFor(() => expect(removeMock).toHaveBeenCalledWith('c1', TEST_TOKEN));
  });

  it('should show an empty state when there are no categories', () => {
    setup([]);

    expect(screen.getByText(/Nenhuma categoria ainda/)).toBeInTheDocument();
  });
});
