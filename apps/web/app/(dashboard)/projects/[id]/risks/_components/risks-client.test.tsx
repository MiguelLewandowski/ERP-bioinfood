import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { RiskDto } from '@bioinfood/shared';
import type { ProjectMember } from '@/lib/project-members';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, fireEvent, TEST_TOKEN } from '@/lib/test-utils';
import { RisksClient } from './risks-client';

const postMock = vi.fn();
const deleteMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
    delete: (...args: unknown[]) => deleteMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args), success: vi.fn() },
}));

const MEMBERS = [{ id: 'user-2', name: 'Igor Prado' }] as ProjectMember[];

const EXISTING_RISK = {
  id: 'risk-1',
  title: 'Atraso no fornecedor',
  probability: 'HIGH',
  impact: 'HIGH',
  score: 16,
} as RiskDto;

function setup(initialRisks: RiskDto[] = []) {
  renderWithProviders(
    <RisksClient projectId="proj-1" initialRisks={initialRisks} members={MEMBERS} />,
  );
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Novo Risco/ }));
  await screen.findByLabelText('Título *');
}

describe('RisksClient form', () => {
  beforeEach(() => {
    postMock.mockResolvedValue({ ...EXISTING_RISK, id: 'risk-new', title: 'Falta de insumo' });
    deleteMock.mockResolvedValue(undefined);
  });

  it('should require a title before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Título é obrigatório')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should reject a title longer than 200 characters', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    // Ver docs/tasks/test-suite-web-instavel-sob-carga.md: 201 caracteres tecla a
    // tecla estouravam o timeout sob carga. O zod valida no submit, não por tecla.
    fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'x'.repeat(201) } });
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Título deve ter no máximo 200 caracteres'),
    ).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should default both probability and impact to medium', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);

    expect(screen.getByLabelText('Probabilidade')).toHaveValue('MEDIUM');
    expect(screen.getByLabelText('Impacto')).toHaveValue('MEDIUM');
  });

  it('should create the risk on the project route with the auth token', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Falta de insumo');
    await user.selectOptions(screen.getByLabelText('Probabilidade'), 'VERY_HIGH');
    await user.selectOptions(screen.getByLabelText('Impacto'), 'HIGH');
    await user.selectOptions(screen.getByLabelText('Responsável'), 'user-2');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const [url, payload, token] = postMock.mock.calls[0];
    expect(url).toBe('/projects/proj-1/risks');
    expect(payload).toMatchObject({
      title: 'Falta de insumo',
      probability: 'VERY_HIGH',
      impact: 'HIGH',
      ownerId: 'user-2',
    });
    expect(token).toBe(TEST_TOKEN);
  });

  it('should send an undefined owner when none is selected', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Falta de insumo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    expect(postMock.mock.calls[0][1].ownerId).toBeUndefined();
  });

  it('should add the created risk to the list and close the form', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Falta de insumo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Falta de insumo')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument());
  });

  it('should report the error and keep the form open when creation fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Falta de insumo');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith('Forbidden resource'));
    expect(screen.getByLabelText('Título *')).toBeInTheDocument();
  });

  it('should ask for confirmation inline before deleting a risk', async () => {
    const user = userEvent.setup();
    setup([EXISTING_RISK]);

    await user.click(screen.getByRole('button', { name: 'Excluir risco Atraso no fornecedor' }));

    expect(await screen.findByText('Excluir?')).toBeInTheDocument();
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('should delete the risk when the inline confirmation is accepted', async () => {
    const user = userEvent.setup();
    setup([EXISTING_RISK]);

    await user.click(screen.getByRole('button', { name: 'Excluir risco Atraso no fornecedor' }));
    await user.click(await screen.findByRole('button', { name: 'Sim' }));

    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/projects/proj-1/risks/risk-1', TEST_TOKEN);
    });
    await waitFor(() => {
      expect(screen.queryByText('Atraso no fornecedor')).not.toBeInTheDocument();
    });
  });

  it('should keep the risk when the inline confirmation is dismissed', async () => {
    const user = userEvent.setup();
    setup([EXISTING_RISK]);

    await user.click(screen.getByRole('button', { name: 'Excluir risco Atraso no fornecedor' }));
    await user.click(await screen.findByRole('button', { name: 'Não' }));

    expect(deleteMock).not.toHaveBeenCalled();
    expect(screen.getByText('Atraso no fornecedor')).toBeInTheDocument();
  });
});
