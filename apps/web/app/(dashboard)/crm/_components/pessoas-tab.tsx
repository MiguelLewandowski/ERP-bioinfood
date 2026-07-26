'use client';

import { useMemo, useState } from 'react';
import { Search, Mail, Phone, Pencil, UserRound, X } from 'lucide-react';
import type { ContactListItemDto, TaxonomyDto } from '@bioinfood/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { PessoaDialog } from './pessoa-dialog';

interface PessoasTabProps {
  initialContacts: ContactListItemDto[];
  sources: TaxonomyDto[];
  canEdit: boolean;
}

export function PessoasTab({ initialContacts, sources, canEdit }: PessoasTabProps) {
  const [contacts, setContacts] = useState(initialContacts);
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ kind: 'closed' } | { kind: 'create' } | { kind: 'edit'; id: string }>({ kind: 'closed' });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => (
      c.name.toLowerCase().includes(q)
      || (c.email?.toLowerCase().includes(q) ?? false)
      || (c.whatsapp?.toLowerCase().includes(q) ?? false)
      || c.organizations.some((o) => o.name.toLowerCase().includes(q))
    ));
  }, [contacts, search]);

  function onSaved(saved: ContactListItemDto) {
    setContacts((prev) => {
      const exists = prev.some((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [saved, ...prev];
    });
    setDialog({ kind: 'closed' });
  }

  function onDeleted(id: string) {
    setContacts((prev) => prev.filter((c) => c.id !== id));
  }

  const empty = contacts.length === 0;

  return (
    <>
      {!empty && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[220px] max-w-sm flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou telefone…"
              className="pl-9 pr-8"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {canEdit && <Button onClick={() => setDialog({ kind: 'create' })}>+ Nova Pessoa</Button>}
        </div>
      )}

      {empty ? (
        <EmptyState
          icon={UserRound}
          title="Nenhuma pessoa cadastrada"
          description="Cadastre a primeira pessoa para começar"
          action={canEdit && <Button onClick={() => setDialog({ kind: 'create' })}>+ Nova Pessoa</Button>}
          className="py-20"
        />
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma pessoa encontrada para &quot;{search}&quot;.</p>
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="uppercase tracking-wide hover:bg-transparent">
                <TableHead>Pessoa</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Origem</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <span className="font-medium text-foreground">{c.name}</span>
                    {c.organizations[0]?.jobTitle && (
                      <span className="block text-xs text-muted-foreground">{c.organizations[0].jobTitle}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {c.organizations.length === 0 ? '—' : (
                      <>
                        {c.organizations[0].name}
                        {c.organizations.length > 1 && (
                          <span className="ml-1 text-xs">+{c.organizations.length - 1}</span>
                        )}
                      </>
                    )}
                  </TableCell>
                  <TableCell>
                    {c.email || c.whatsapp ? (
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {c.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{c.email}</span>}
                        {c.whatsapp && <span className="inline-flex items-center gap-1"><Phone size={11} />{c.whatsapp}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.source?.name ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    {canEdit && (
                      <button
                        onClick={() => setDialog({ kind: 'edit', id: c.id })}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
                        title="Editar pessoa"
                      >
                        <Pencil size={14} /> Editar
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {!empty && (
        <p className="mt-2 text-xs text-muted-foreground">
          {filtered.length} de {contacts.length} pessoa{contacts.length === 1 ? '' : 's'}
        </p>
      )}

      {dialog.kind !== 'closed' && (
        <PessoaDialog
          mode={dialog.kind}
          contactId={dialog.kind === 'edit' ? dialog.id : undefined}
          sources={sources}
          onSaved={onSaved}
          onDeleted={onDeleted}
          onClose={() => setDialog({ kind: 'closed' })}
        />
      )}
    </>
  );
}
