import { describe, it, expect } from 'vitest';
import type { ContactListItemDto } from '@bioinfood/shared';
import { renderWithProviders, screen } from '@/lib/test-utils';
import { ContatosTab } from './contatos-tab';

const JOANA = {
  id: 'contact-1',
  name: 'Joana Reis',
  email: 'joana@acme.com',
  whatsapp: '(11) 98888-7777',
  source: { id: 'src-1', name: 'Indicação' },
  organizations: [{ id: 'org-1', name: 'ACME', jobTitle: 'CTO' }],
  // ContactListItemDto['link'] keys the relation as `linkId`, not `id`.
  link: { linkId: 'link-1', jobTitle: 'CTO' },
} as ContactListItemDto;

function setup(contacts: ContactListItemDto[] = [JOANA]) {
  renderWithProviders(<ContatosTab contacts={contacts} />);
}

describe('ContatosTab', () => {
  it('should show the linked person with role, source and contact channels', () => {
    setup();

    expect(screen.getByText('Joana Reis')).toBeInTheDocument();
    expect(screen.getByText('· CTO')).toBeInTheDocument();
    expect(screen.getByText('· Indicação')).toBeInTheDocument();
    expect(screen.getByText('joana@acme.com')).toBeInTheDocument();
    expect(screen.getByText('(11) 98888-7777')).toBeInTheDocument();
  });

  // A aba responde "quem são as pessoas desta empresa". Editar a pessoa ou
  // desfazer o vínculo é responsabilidade da aba Pessoas — aqui um X sem
  // confirmação, colado numa lista que se lê, era fácil de acionar sem querer.
  it('should not offer any way to edit or unlink from the company page', () => {
    setup();

    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Remover vínculo')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Editar contato')).not.toBeInTheDocument();
    expect(screen.queryByText(/Novo contato/)).not.toBeInTheDocument();
  });

  it('should point to where people are linked when there is none', () => {
    setup([]);

    expect(screen.getByText('Nenhuma pessoa vinculada a esta empresa.')).toBeInTheDocument();
    expect(screen.getByText(/aba Pessoas/)).toBeInTheDocument();
  });

  it('should offer the e-mail as a mailto link', () => {
    setup();

    expect(screen.getByRole('link', { name: /joana@acme.com/ }))
      .toHaveAttribute('href', 'mailto:joana@acme.com');
  });
});
