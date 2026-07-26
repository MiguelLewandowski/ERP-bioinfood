'use client';
// Client Component: manages search/filter state, the create dialog and archive actions.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Settings, Archive, ArchiveRestore, Pencil, Search, Mail, Phone, X, Building2,
} from 'lucide-react';
import type {
  OrganizationDto, PartyRoleType, SystemRole, TaxonomyDto,
} from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/ui/empty-state';
import {
  TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import ClienteDialog from './cliente-dialog';

interface ClientesClientProps {
  organizations: OrganizationDto[];
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
  categories: TaxonomyDto[];
  productServices: TaxonomyDto[];
}

// Escrita do CRM é exclusiva do ADMIN (decisão do owner).
const canCreate = (role: SystemRole) => role === 'ADMIN';

const ROLE_LABELS: Record<PartyRoleType, string> = {
  CUSTOMER: 'Cliente',
  SUPPLIER: 'Fornecedor',
  CARRIER: 'Transportadora',
  PARTNER: 'Parceiro',
  FUNDING_AGENCY: 'Agência de fomento',
  RESEARCH_INSTITUTION: 'Instituição de pesquisa',
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export default function ClientesClient({
  organizations, sectors, sources, categories, productServices,
}: ClientesClientProps) {
  const { session, token } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = organizations.filter((o) => o.status === 'ARCHIVED').length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return organizations.filter((org) => {
      if (!showArchived && org.status === 'ARCHIVED') return false;
      if (!q) return true;
      return (
        org.legalName.toLowerCase().includes(q)
        || (org.tradeName?.toLowerCase().includes(q) ?? false)
        || (org.document?.toLowerCase().includes(q) ?? false)
        || (org.email?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [organizations, search, showArchived]);

  function onCreated(organization: OrganizationDto) {
    setOpen(false);
    toast.success('Cliente criado');
    router.push(`/crm/empresas/${organization.id}`);
  }

  async function toggleArchive(org: OrganizationDto) {
    const archiving = org.status !== 'ARCHIVED';
    const ok = await confirm({
      title: archiving ? 'Arquivar cliente?' : 'Reativar cliente?',
      description: archiving
        ? `"${org.legalName}" deixa de aparecer como ativo, mas todo o histórico (contatos, interações, oportunidades) é preservado. Dá para reativar depois.`
        : `"${org.legalName}" volta a aparecer como cliente ativo.`,
      confirmLabel: archiving ? 'Arquivar' : 'Reativar',
      variant: archiving ? 'destructive' : 'default',
    });
    if (!ok) return;
    setBusyId(org.id);
    try {
      await organizationsApi.update(org.id, { status: archiving ? 'ARCHIVED' : 'ACTIVE' }, token);
      toast.success(archiving ? 'Cliente arquivado' : 'Cliente reativado');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  if (organizations.length === 0) {
    return (
      <>
        <EmptyState
          icon={Building2}
          title="Nenhum cliente cadastrado"
          description="Cadastre o primeiro cliente para começar"
          action={
            canCreate(session.role) && (
              <Button onClick={() => setOpen(true)}>+ Novo Cliente</Button>
            )
          }
          className="py-20"
        />
        <ClienteDialog
          open={open}
          onOpenChange={setOpen}
          onCreated={onCreated}
          sectors={sectors}
          sources={sources}
          categories={categories}
          productServices={productServices}
        />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[220px] max-w-sm flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, documento ou e-mail…"
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
        </div>

        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <label className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="accent-[hsl(var(--primary))]"
              />
              Mostrar arquivados ({archivedCount})
            </label>
          )}
          {session.role === 'ADMIN' && (
            <Link href="/crm/config?tab=taxonomias" className={cn(buttonVariants({ variant: 'outline' }))}>
              <Settings size={15} /> Configurar
            </Link>
          )}
          {canCreate(session.role) && (
            <Button onClick={() => setOpen(true)}>+ Novo Cliente</Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente encontrado para &quot;{search}&quot;.</p>
        </div>
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="uppercase tracking-wide hover:bg-transparent">
                <TableHead>Cliente</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((org) => (
                <TableRow key={org.id}>
                  <TableCell>
                    <Link href={`/crm/empresas/${org.id}`} className="group flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/25 text-[11px] font-bold text-primary-dark">
                        {initials(org.tradeName || org.legalName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-foreground group-hover:text-primary">
                          {org.tradeName || org.legalName}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {org.tradeName ? org.legalName : (org.document ?? 'Sem documento')}
                        </span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {org.roleTypes.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {org.roleTypes.map((r) => (
                          <Badge key={r} variant="success" className="text-[10px]">
                            {ROLE_LABELS[r] ?? r}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{org.sector?.name ?? '—'}</TableCell>
                  <TableCell>
                    {org.email || org.phone ? (
                      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                        {org.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{org.email}</span>}
                        {org.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{org.phone}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={org.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/crm/empresas/${org.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
                        title="Editar cliente"
                      >
                        <Pencil size={14} /> Editar
                      </Link>
                      {session.role === 'ADMIN' && (
                        <button
                          onClick={() => toggleArchive(org)}
                          disabled={busyId === org.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive disabled:opacity-50"
                          title={org.status === 'ARCHIVED' ? 'Reativar cliente' : 'Arquivar cliente'}
                        >
                          {org.status === 'ARCHIVED' ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                          {org.status === 'ARCHIVED' ? 'Reativar' : 'Arquivar'}
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <p className="mt-2 text-xs text-muted-foreground">
        {filtered.length} de {organizations.length} cliente{organizations.length === 1 ? '' : 's'}
      </p>

      <ClienteDialog
          open={open}
          onOpenChange={setOpen}
          onCreated={onCreated}
          sectors={sectors}
          sources={sources}
          categories={categories}
          productServices={productServices}
        />
    </>
  );
}
