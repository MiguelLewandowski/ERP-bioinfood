import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import type { MilestoneDto } from '@bioinfood/shared';
import { ApiError } from '@/lib/errors';
import { renderWithProviders, screen, waitFor, TEST_TOKEN } from '@/lib/test-utils';
import { RoadmapClient } from './roadmap-client';

const postMock = vi.fn();
const patchMock = vi.fn();
const toastErrorMock = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    post: (...args: unknown[]) => postMock(...args),
    patch: (...args: unknown[]) => patchMock(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { error: (...args: unknown[]) => toastErrorMock(...args), success: vi.fn() },
}));

const EXISTING_MILESTONE = {
  id: 'ms-1',
  title: 'Entrega da fase 1',
  date: '2026-09-01',
  reached: false,
} as MilestoneDto;

function setup(initialMilestones: MilestoneDto[] = []) {
  renderWithProviders(
    <RoadmapClient projectId="proj-1" initialMilestones={initialMilestones} />,
  );
}

async function openForm(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: /Novo Marco/ }));
  await screen.findByLabelText('Título *');
}

describe('RoadmapClient milestone form', () => {
  beforeEach(() => {
    postMock.mockResolvedValue({
      id: 'ms-new', title: 'Entrega da fase 2', date: '2026-10-01', reached: false,
    });
    patchMock.mockResolvedValue(undefined);
  });

  it('should require a title and a date before calling the API', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(await screen.findByText('Título é obrigatório')).toBeInTheDocument();
    expect(screen.getByText('Data é obrigatória')).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should reject a title longer than 200 characters', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'x'.repeat(201));
    await user.type(screen.getByLabelText('Data *'), '2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    expect(
      await screen.findByText('Título deve ter no máximo 200 caracteres'),
    ).toBeInTheDocument();
    expect(postMock).not.toHaveBeenCalled();
  });

  it('should create the milestone on the project route with the auth token', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Entrega da fase 2');
    await user.type(screen.getByLabelText('Descrição'), 'Protótipo validado');
    await user.type(screen.getByLabelText('Data *'), '2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(postMock).toHaveBeenCalled());
    const [url, payload, token] = postMock.mock.calls[0];
    expect(url).toBe('/projects/proj-1/milestones');
    expect(payload).toMatchObject({
      title: 'Entrega da fase 2',
      description: 'Protótipo validado',
      date: '2026-10-01',
    });
    expect(token).toBe(TEST_TOKEN);
  });

  it('should show the created milestone and close the form', async () => {
    const user = userEvent.setup();
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Entrega da fase 2');
    await user.type(screen.getByLabelText('Data *'), '2026-10-01');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    // The title renders twice: the timeline marker tooltip and the list below.
    await waitFor(() => expect(screen.getAllByText('Entrega da fase 2')).not.toHaveLength(0));
    await waitFor(() => expect(screen.queryByLabelText('Título *')).not.toBeInTheDocument());
  });

  // Regression: a date-only value parsed with `new Date('2026-10-01')` lands on
  // UTC midnight and renders as 30/09 in America/Sao_Paulo (UTC-3), showing
  // every milestone a day early. Must render the calendar day as stored.
  it('should render the milestone date without shifting it by timezone', () => {
    setup([{ ...EXISTING_MILESTONE, date: '2026-09-01' } as MilestoneDto]);

    expect(screen.getByText('01 de set de 2026')).toBeInTheDocument();
    expect(screen.queryByText('31 de ago de 2026')).not.toBeInTheDocument();
  });

  it('should render an ISO timestamp date on its own calendar day', () => {
    setup([{ ...EXISTING_MILESTONE, date: '2026-09-01T00:00:00.000Z' } as MilestoneDto]);

    expect(screen.getByText('01 de set de 2026')).toBeInTheDocument();
  });

  it('should keep milestones ordered by date after inserting an earlier one', async () => {
    const user = userEvent.setup();
    postMock.mockResolvedValue({
      id: 'ms-new', title: 'Kickoff', date: '2026-08-01', reached: false,
    });
    setup([EXISTING_MILESTONE]);

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Kickoff');
    await user.type(screen.getByLabelText('Data *'), '2026-08-01');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(() => expect(screen.getAllByText('Kickoff')).not.toHaveLength(0));
    // The list section renders one <p> per milestone, in render order.
    const titles = screen.getAllByRole('paragraph')
      .map((el) => el.textContent)
      .filter((text) => text === 'Kickoff' || text === 'Entrega da fase 1');
    expect(titles.indexOf('Kickoff')).toBeLessThan(titles.indexOf('Entrega da fase 1'));
  });

  it('should report the error and keep the form open when creation fails', async () => {
    const user = userEvent.setup();
    postMock.mockRejectedValue(new ApiError(['Forbidden resource'], 403));
    setup();

    await openForm(user);
    await user.type(screen.getByLabelText('Título *'), 'Entrega da fase 2');
    await user.type(screen.getByLabelText('Data *'), '2026-10-01');
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
    expect(postMock).not.toHaveBeenCalled();
  });
});
