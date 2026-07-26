import { Mail, Phone } from 'lucide-react';
import type { ContactListItemDto } from '@bioinfood/shared';

/**
 * Somente leitura, de propósito.
 *
 * Esta aba responde "quem são as pessoas desta empresa". Editar a pessoa ou
 * desfazer o vínculo é outra coisa, e ficava a um clique de distância num X sem
 * confirmação — perto de uma lista que se lê, não que se opera. Quem cuida da
 * pessoa e das empresas dela é a aba Pessoas, onde o cadastro já exige a empresa
 * e permite vincular a outras.
 */
export function ContatosTab({ contacts }: { contacts: ContactListItemDto[] }) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border py-12 text-center">
        <p className="text-sm text-muted-foreground">Nenhuma pessoa vinculada a esta empresa.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Pessoas são cadastradas e vinculadas na aba Pessoas do CRM.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {contacts.map((c) => (
        <li key={c.id} className="rounded-xl border border-border bg-card px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium text-foreground">{c.name}</span>
            {c.link?.jobTitle && <span className="text-xs text-muted-foreground">· {c.link.jobTitle}</span>}
            {c.source && <span className="text-xs text-muted-foreground">· {c.source.name}</span>}
          </div>
          {(c.email || c.whatsapp) && (
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {c.email && (
                <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-primary">
                  <Mail size={12} />{c.email}
                </a>
              )}
              {c.whatsapp && (
                <span className="inline-flex items-center gap-1"><Phone size={12} />{c.whatsapp}</span>
              )}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
