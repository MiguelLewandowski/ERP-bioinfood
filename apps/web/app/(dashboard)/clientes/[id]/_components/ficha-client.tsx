'use client'; // interactive tabbed 360 view

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft, Building2, Users, MessageSquare, Target, Archive, ArchiveRestore,
} from 'lucide-react';
import type {
  OrganizationDetailDto, TaxonomyDto, ContactListItemDto, InteractionDto, OpportunityDto,
} from '@bioinfood/shared';
import { cn } from '@/lib/utils';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { organizationsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { DadosTab } from './dados-tab';
import { ContatosTab } from './contatos-tab';
import { TimelineTab } from './timeline-tab';
import { OportunidadesTab } from './oportunidades-tab';

interface FichaClientProps {
  organizationId: string;
  organization: OrganizationDetailDto;
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
  contacts: ContactListItemDto[];
  interactions: InteractionDto[];
  opportunities: OpportunityDto[];
  canEdit: boolean;
  canManageRoles: boolean;
}

const TABS = [
  { id: 'dados', label: 'Dados', icon: Building2 },
  { id: 'contatos', label: 'Contatos', icon: Users },
  { id: 'timeline', label: 'Timeline', icon: MessageSquare },
  { id: 'oportunidades', label: 'Oportunidades', icon: Target },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function FichaClient(props: FichaClientProps) {
  const { organization, contacts } = props;
  const { token, session } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const [tab, setTab] = useState<TabId>('dados');
  const [archiving, setArchiving] = useState(false);

  async function toggleArchive() {
    const willArchive = organization.status !== 'ARCHIVED';
    const ok = await confirm({
      title: willArchive ? 'Arquivar cliente?' : 'Reativar cliente?',
      description: willArchive
        ? `"${organization.legalName}" deixa de aparecer como ativo, mas todo o histórico (contatos, interações, oportunidades) é preservado. Dá para reativar depois.`
        : `"${organization.legalName}" volta a aparecer como cliente ativo.`,
      confirmLabel: willArchive ? 'Arquivar' : 'Reativar',
      variant: willArchive ? 'destructive' : 'default',
    });
    if (!ok) return;
    setArchiving(true);
    try {
      await organizationsApi.update(props.organizationId, { status: willArchive ? 'ARCHIVED' : 'ACTIVE' }, token);
      toast.success(willArchive ? 'Cliente arquivado' : 'Cliente reativado');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setArchiving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-[#575756] hover:text-[#1D1D1B] mb-4"
      >
        <ArrowLeft size={14} /> Voltar para Clientes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#1D1D1B]">{organization.legalName}</h1>
            {organization.status === 'ARCHIVED' && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">Arquivado</span>
            )}
          </div>
          {organization.tradeName && (
            <p className="text-sm text-[#706F6F] mt-0.5">{organization.tradeName}</p>
          )}
        </div>
        {session.role === 'ADMIN' && (
          <button
            onClick={toggleArchive}
            disabled={archiving}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[#575756] border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
          >
            {organization.status === 'ARCHIVED' ? <ArchiveRestore size={14} /> : <Archive size={14} />}
            {organization.status === 'ARCHIVED' ? 'Reativar cliente' : 'Arquivar cliente'}
          </button>
        )}
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = id === 'contatos'
            ? contacts.length
            : id === 'oportunidades' ? props.opportunities.length : undefined;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                tab === id
                  ? 'border-[#147F23] text-[#147F23]'
                  : 'border-transparent text-[#575756] hover:text-[#1D1D1B]',
              )}
            >
              <Icon size={15} />
              {label}
              {count !== undefined && count > 0 && (
                <span className="ml-1 rounded-full bg-gray-100 px-1.5 text-[11px] text-[#575756]">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'dados' && <DadosTab {...props} />}
      {tab === 'contatos' && (
        <ContatosTab
          organizationId={props.organizationId}
          initialContacts={contacts}
          canEdit={props.canEdit}
        />
      )}
      {tab === 'timeline' && (
        <TimelineTab
          organizationId={props.organizationId}
          initialInteractions={props.interactions}
          contacts={contacts}
          canEdit={props.canEdit}
        />
      )}
      {tab === 'oportunidades' && <OportunidadesTab opportunities={props.opportunities} />}
    </div>
  );
}
