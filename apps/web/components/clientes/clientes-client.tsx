'use client';
// Client Component: manages search/filter state, the create dialog and archive actions.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Settings, Archive, ArchiveRestore, Pencil, Search, Mail, Phone, X,
} from 'lucide-react';
import type { OrganizationDto, PartyRoleType, SystemRole } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import ClienteDialog from './cliente-dialog';

interface ClientesClientProps {
  organizations: OrganizationDto[];
}

// Escrita do CRM é exclusiva do ADMIN (decisão do owner).
const canCreate = (role: SystemRole) => role === 'ADMIN';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Ativo',
  ARCHIVED: 'Arquivado',
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

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

export default function ClientesClient({ organizations }: ClientesClientProps) {
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
    // Cadastro rápido só pede nome/documento — manda direto para a ficha completa
    // (aba Dados) para preencher telefone, e-mail, redes sociais etc.
    toast.success('Cliente criado — complete o cadastro na ficha');
    router.push(`/clientes/${organization.id}`);
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
        <div className="flex items-center justify-end gap-2 mb-4">
          {canCreate(session.role) && (
            <button
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              + Novo Cliente
            </button>
          )}
        </div>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-3xl">🏢</span>
          </div>
          <h3 className="text-lg font-semibold text-[#575756]">Nenhum cliente cadastrado</h3>
          <p className="text-sm text-[#706F6F] mt-1 mb-4">Cadastre o primeiro cliente para começar</p>
          {canCreate(session.role) && (
            <button
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              + Novo Cliente
            </button>
          )}
        </div>
        <ClienteDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
      </>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-1 items-center gap-2 min-w-[220px] max-w-sm">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#878787]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, documento ou e-mail…"
              className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#878787] hover:text-[#575756]"
                aria-label="Limpar busca"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {archivedCount > 0 && (
            <label className="flex items-center gap-1.5 text-xs text-[#575756] px-2">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="accent-[#147F23]"
              />
              Mostrar arquivados ({archivedCount})
            </label>
          )}
          {session.role === 'ADMIN' && (
            <Link
              href="/clientes/config"
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-[#575756] border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              <Settings size={15} /> Configurar
            </Link>
          )}
          {canCreate(session.role) && (
            <button
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              + Novo Cliente
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-sm text-[#878787]">Nenhum cliente encontrado para &quot;{search}&quot;.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-[11px] font-semibold uppercase tracking-wide text-[#878787]">
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Papel</th>
                <th className="px-4 py-3">Setor</th>
                <th className="px-4 py-3">Contato</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((org) => (
                <tr key={org.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${org.id}`} className="flex items-center gap-3 group">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#86C175]/25 text-[11px] font-bold text-[#156D1D]">
                        {initials(org.tradeName || org.legalName)}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-medium text-[#1D1D1B] group-hover:text-[#147F23] truncate">
                          {org.tradeName || org.legalName}
                        </span>
                        <span className="block text-xs text-[#878787] truncate">
                          {org.tradeName ? org.legalName : (org.document ?? 'Sem documento')}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {org.roleTypes.length === 0 ? (
                      <span className="text-xs text-[#878787]">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {org.roleTypes.map((r) => (
                          <span key={r} className="rounded-full bg-[#86C175]/20 px-2 py-0.5 text-[10px] font-medium text-[#156D1D]">
                            {ROLE_LABELS[r] ?? r}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[#575756]">{org.sector?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {org.email || org.phone ? (
                      <div className="flex flex-col gap-0.5 text-xs text-[#706F6F]">
                        {org.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{org.email}</span>}
                        {org.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{org.phone}</span>}
                      </div>
                    ) : (
                      <span className="text-xs text-[#878787]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_COLORS[org.status] ?? 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {STATUS_LABELS[org.status] ?? org.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/clientes/${org.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#575756] hover:text-[#147F23]"
                        title="Editar cliente"
                      >
                        <Pencil size={14} /> Editar
                      </Link>
                      {session.role === 'ADMIN' && (
                        <button
                          onClick={() => toggleArchive(org)}
                          disabled={busyId === org.id}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#575756] hover:text-red-600 disabled:opacity-50"
                          title={org.status === 'ARCHIVED' ? 'Reativar cliente' : 'Arquivar cliente'}
                        >
                          {org.status === 'ARCHIVED' ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                          {org.status === 'ARCHIVED' ? 'Reativar' : 'Arquivar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-2 text-xs text-[#878787]">
        {filtered.length} de {organizations.length} cliente{organizations.length === 1 ? '' : 's'}
      </p>

      <ClienteDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
    </>
  );
}
