'use client'; // interactive multi-section form

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Save, CheckCircle2, Info, Target, FlaskConical,
  Layers, Package, Users, Link2, Wrench,
  FileDown, Pencil, Mail, Phone,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ProjectDto, ContactListItemDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { getErrorMessage } from '@/lib/errors';
import { charterApi, contactsApi, usersApi } from '@/lib/api-hooks';
import { cn } from '@/lib/utils';
import { extractMembers, type ProjectMember } from '@/lib/project-members';
import { MaskedInput } from '@/components/ui/masked-input';
import { maskCurrencyBRL, parseCurrencyBRL, formatCurrencyForInput } from '@/lib/masks';
import { PROJECT_STATUS_LABELS, printHtml } from '@/lib/project-report';
import { buildCharterHtml } from '@/lib/charter-report';

const PRIORITY_OPTIONS = ['Alta', 'Média', 'Baixa'] as const;

function fmtDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString('pt-BR') : '—';
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

const schema = z.object({
  projectType:        z.string().max(200).optional(),
  priority:           z.string().max(100).optional(),
  problem:            z.string().max(4000).optional(),
  justification:      z.string().max(4000).optional(),
  assumptions:        z.string().max(4000).optional(),
  mainObjective:      z.string().max(4000).optional(),
  specificObjectives: z.string().max(4000).optional(),
  kpis:               z.string().max(4000).optional(),
  scope:              z.string().max(4000).optional(),
  outOfScope:         z.string().max(4000).optional(),
  deliverables:       z.string().max(4000).optional(),
  infrastructure:     z.string().max(4000).optional(),
  // Mascarado em tela ("1.234,56"); convertido para número só no boundary
  // (persist/print) via parseCurrencyBRL — ver lib/masks.ts.
  budget:             z.string().optional(),
  teamUserIds:        z.array(z.string()).optional(),
  governance:         z.string().max(4000).optional(),
  dependencies:       z.string().max(4000).optional(),
  constraints:        z.string().max(4000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CharterInitialData {
  projectType?: string | null;
  priority?: string | null;
  problem?: string | null;
  justification?: string | null;
  assumptions?: string | null;
  mainObjective?: string | null;
  specificObjectives?: string | null;
  kpis?: string | null;
  scope?: string | null;
  outOfScope?: string | null;
  deliverables?: string | null;
  infrastructure?: string | null;
  budget?: number | null;
  team?: { id: string; name: string }[];
  governance?: string | null;
  dependencies?: string | null;
  constraints?: string | null;
  approvedAt?: string | null;
  lastEditedBy?: { id: string; name: string } | null;
  lastEditedAt?: string | null;
}

interface CharterClientProps {
  projectId: string;
  initialData: CharterInitialData | null;
  project: ProjectDto | null;
}

type FieldDef = {
  key: keyof FormValues;
  label: string;
  placeholder?: string;
  rows?: number;
  options?: readonly string[];
};

const SECTIONS: Array<{
  id: string; label: string; icon: typeof Info; color: string; fields: FieldDef[];
}> = [
  {
    id: 'identificacao',
    label: 'Identificação do Projeto',
    icon: Info,
    color: 'hsl(var(--primary))',
    fields: [
      { key: 'projectType', label: 'Tipo', placeholder: 'Ex: Subvenção, P&D Interno, Consultoria…', rows: 1 },
      { key: 'priority',    label: 'Prioridade', options: PRIORITY_OPTIONS },
    ],
  },
  {
    id: 'contexto',
    label: 'Contexto e Justificativa',
    icon: FlaskConical,
    color: '#46AD48',
    fields: [
      { key: 'problem',       label: 'Problema / Oportunidade', placeholder: 'Qual o problema ou oportunidade que motiva este projeto?', rows: 4 },
      { key: 'justification', label: 'Justificativa (por que agora?)', placeholder: 'Por que este projeto precisa ser feito neste momento?', rows: 3 },
      { key: 'assumptions',   label: 'Premissas', placeholder: 'Fatores considerados verdadeiros sem confirmação formal…', rows: 3 },
    ],
  },
  {
    id: 'objetivos',
    label: 'Objetivos',
    icon: Target,
    color: 'hsl(var(--accent))',
    fields: [
      { key: 'mainObjective',      label: 'Objetivo Principal',     placeholder: 'O que este projeto precisa alcançar?', rows: 3 },
      { key: 'specificObjectives', label: 'Objetivos Específicos',  placeholder: 'Liste os objetivos específicos, um por linha…', rows: 4 },
      { key: 'kpis',               label: 'Critérios de Sucesso / KPIs', placeholder: 'Métricas objetivas que definem o sucesso do projeto…', rows: 3 },
    ],
  },
  {
    id: 'escopo',
    label: 'Escopo',
    icon: Layers,
    color: 'hsl(var(--primary))',
    fields: [
      { key: 'scope',       label: 'Em Escopo',      placeholder: 'O que está incluído neste projeto…', rows: 4 },
      { key: 'outOfScope',  label: 'Fora de Escopo', placeholder: 'O que está explicitamente excluído…', rows: 3 },
      { key: 'constraints', label: 'Restrições',     placeholder: 'Limitações de prazo, recursos, regulação…', rows: 2 },
    ],
  },
  {
    id: 'entregaveis',
    label: 'Entregáveis',
    icon: Package,
    color: '#46AD48',
    fields: [
      { key: 'deliverables', label: 'Lista de Entregáveis', placeholder: 'Liste os entregáveis principais, um por linha…', rows: 4 },
    ],
  },
  {
    id: 'recursos',
    label: 'Recursos e Orçamento',
    icon: Wrench,
    color: 'hsl(var(--accent))',
    // Renderizado com bloco próprio (equipe é multi-select + orçamento é numérico) — ver activeSection === 'recursos'.
    fields: [],
  },
  {
    id: 'stakeholders',
    label: 'Partes Interessadas e Governança',
    icon: Users,
    color: 'hsl(var(--primary))',
    fields: [
      { key: 'governance', label: 'RACI / Cadência / Reporting', placeholder: 'Papéis (RACI), ritmo de acompanhamento e comunicação…', rows: 3 },
    ],
  },
  {
    id: 'dependencias',
    label: 'Dependências',
    icon: Link2,
    color: 'hsl(var(--muted-foreground))',
    fields: [
      { key: 'dependencies', label: 'Dependências Externas e Internas', placeholder: 'Dependências externas, interfaces entre frentes (ex: Bioprocessos ↔ Genética)…', rows: 3 },
    ],
  },
];

export function CharterClient({ projectId, initialData, project }: CharterClientProps) {
  const { token, session } = useAuth();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('identificacao');
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(SECTIONS.map((s) => s.id));
  const [contacts, setContacts] = useState<ContactListItemDto[] | null>(null);
  const [allUsers, setAllUsers] = useState<ProjectMember[] | null>(null);
  const [lastEdit, setLastEdit] = useState(
    initialData?.lastEditedAt
      ? { name: initialData.lastEditedBy?.name ?? 'Alguém', at: initialData.lastEditedAt }
      : null,
  );

  const members = useMemo(() => extractMembers(project), [project]);

  const {
    register, handleSubmit, getValues, setValue, watch, reset, formState: { isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      projectType:        initialData?.projectType ?? undefined,
      priority:           initialData?.priority ?? undefined,
      problem:            initialData?.problem ?? undefined,
      justification:      initialData?.justification ?? undefined,
      assumptions:        initialData?.assumptions ?? undefined,
      mainObjective:      initialData?.mainObjective ?? undefined,
      specificObjectives: initialData?.specificObjectives ?? undefined,
      kpis:               initialData?.kpis ?? undefined,
      scope:              initialData?.scope ?? undefined,
      outOfScope:         initialData?.outOfScope ?? undefined,
      deliverables:       initialData?.deliverables ?? undefined,
      infrastructure:     initialData?.infrastructure ?? undefined,
      governance:         initialData?.governance ?? undefined,
      dependencies:       initialData?.dependencies ?? undefined,
      constraints:        initialData?.constraints ?? undefined,
      budget:             formatCurrencyForInput(initialData?.budget),
      teamUserIds:        initialData?.team?.map((m) => m.id) ?? [],
    },
  });

  const values = watch();

  // Contatos reais do cliente do projeto, para a seção de Stakeholders.
  useEffect(() => {
    if (!project?.client) { setContacts([]); return; }
    let cancelled = false;
    contactsApi.list(token, { orgId: project.client.id })
      .then((list) => { if (!cancelled) setContacts(list); })
      .catch(() => { if (!cancelled) setContacts([]); });
    return () => { cancelled = true; };
  }, [project?.client, token]);

  // A equipe do TAP é documentação de quem toca o projeto, não controle de acesso:
  // usuário interno enxerga todos os projetos sem precisar de ProjectAccess, então
  // limitar a lista a `project.accesses` deixava quase todo mundo de fora.
  // `GET /users` é ADMIN/APROVA — nos demais papéis cai nos membros do projeto.
  const canListUsers = session.role === 'ADMIN' || session.role === 'APROVA';

  useEffect(() => {
    if (!canListUsers) return;
    let cancelled = false;
    usersApi.list(token)
      .then((users) => {
        if (cancelled) return;
        setAllUsers(users.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name })));
      })
      .catch(() => { if (!cancelled) setAllUsers(null); });
    return () => { cancelled = true; };
  }, [canListUsers, token]);

  // Membros do projeto + todos os usuários ativos + quem já está no TAP (mesmo
  // que tenha sido desativado depois — senão salvar apagaria a pessoa da lista).
  const teamCandidates = useMemo(() => {
    const map = new Map<string, ProjectMember>();
    for (const m of members) map.set(m.id, m);
    for (const u of allUsers ?? []) map.set(u.id, u);
    for (const t of initialData?.team ?? []) if (!map.has(t.id)) map.set(t.id, t);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [members, allUsers, initialData?.team]);

  // Seções com pelo menos um campo preenchido — alimenta o dot de progresso no nav.
  const sectionHasContent = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const section of SECTIONS) {
      if (section.id === 'recursos') {
        map[section.id] = !!(
          values.infrastructure?.trim()
          || values.budget?.trim()
          || (values.teamUserIds?.length ?? 0) > 0
        );
        continue;
      }
      map[section.id] = section.fields.some((f) => (values[f.key] ?? '').toString().trim() !== '');
    }
    return map;
  }, [values]);
  const filledCount = Object.values(sectionHasContent).filter(Boolean).length;

  function toggleSection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  }

  function handleExport() {
    const html = buildCharterHtml(getValues(), selectedIds, members, SECTIONS);
    printHtml(html);
    setExportOpen(false);
  }

  async function persist(values: FormValues) {
    setSaving(true);
    try {
      await charterApi.upsert(projectId, {
        ...values,
        budget: parseCurrencyBRL(values.budget ?? ''),
      }, token);
      // Rebaseia com o valor ATUAL do form (não o `values` capturado no blur) —
      // se o usuário já começou a editar outro campo enquanto isso salvava,
      // isso evita que o reset apague o que ele digitou nesse meio-tempo.
      reset(getValues());
      setLastEdit({ name: 'você', at: new Date().toISOString() });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Autosave: sai do campo (ou clica em outra seção, que também dispara blur)
  // com alteração pendente → salva sozinho, sem esperar o botão Salvar.
  function handleFieldBlur() {
    if (isDirty) persist(getValues());
  }

  // Checkbox não dispara blur de forma confiável — salva no próprio clique.
  function toggleTeamMember(userId: string) {
    const current = getValues('teamUserIds') ?? [];
    const next = current.includes(userId)
      ? current.filter((id) => id !== userId)
      : [...current, userId];
    setValue('teamUserIds', next, { shouldDirty: true });
    persist({ ...getValues(), teamUserIds: next });
  }

  async function handleApprove() {
    const ok = await confirm({
      title: 'Aprovar o Termo de Abertura?',
      description: 'O TAP passa a valer como referência formal do projeto. Você ainda pode editar o conteúdo depois, mas a aprovação fica registrada com a data de hoje.',
      confirmLabel: 'Aprovar',
    });
    if (!ok) return;
    setApproving(true);
    try {
      await charterApi.approve(projectId, token);
      toast.success('TAP aprovado');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setApproving(false);
    }
  }

  const isApproved = !!initialData?.approvedAt;
  const activeData = SECTIONS.find((s) => s.id === activeSection)!;

  return (
    <div className="flex h-full">
      {/* Sidebar navigation */}
      <aside className="w-56 shrink-0 border-r border-gray-200 bg-white py-4 overflow-y-auto">
        <div className="px-4 mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Seções do TAP</p>
          <p className="text-[10px] font-medium text-muted-foreground">{filledCount}/{SECTIONS.length}</p>
        </div>
        <nav className="space-y-0.5 px-2">
          {SECTIONS.map(({ id, label, icon: Icon, color }, i) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors',
                activeSection === id
                  ? 'text-white'
                  : 'text-muted-foreground hover:bg-gray-50 hover:text-foreground',
              )}
              style={activeSection === id ? { backgroundColor: color } : {}}
            >
              <Icon size={13} className="shrink-0" />
              <span className="leading-snug flex-1">{i + 1}. {label}</span>
              {sectionHasContent[id] && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    activeSection === id ? 'bg-white' : 'bg-success',
                  )}
                  aria-label="Seção preenchida"
                />
              )}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main form area */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(persist)}>
          <div className="px-8 pt-6 pb-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{ backgroundColor: activeData.color }}
              >
                <activeData.icon size={16} className="text-white" />
              </span>
              <div>
                <h2 className="text-base font-bold text-foreground">{activeData.label}</h2>
                <p className="text-xs text-muted-foreground">
                  Termo de Abertura do Projeto (TAP)
                  {lastEdit && <> · editado por {lastEdit.name} em {fmtDateTime(lastEdit.at)}</>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-muted-foreground hover:bg-gray-50 transition-colors"
              >
                <FileDown size={13} />
                Exportar PDF
              </button>
              {isApproved ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: 'hsl(var(--success) / 0.6)', color: 'hsl(var(--primary-dark))' }}>
                  <CheckCircle2 size={12} /> Aprovado em {fmtDate(initialData!.approvedAt!)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-primary text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={12} />
                  {approving ? 'Aprovando…' : 'Aprovar TAP'}
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: 'hsl(var(--primary))' }}
              >
                <Save size={13} />
                {saving ? 'Salvando…' : saved ? 'Salvo ✓' : 'Salvar'}
              </button>
            </div>
          </div>

          <div className="px-8 py-6 space-y-5 max-w-3xl">
            {activeSection === 'identificacao' && project && (
              <div className="rounded-xl border border-gray-200 bg-white p-5">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Dados do Projeto</h3>
                    <p className="text-xs text-muted-foreground">Vêm do cadastro do projeto — edite em Configurações.</p>
                  </div>
                  <Link
                    href={`/projects/${projectId}/settings`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-gray-50"
                  >
                    <Pencil size={12} /> Editar
                  </Link>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="col-span-2">
                    <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Nome</dt>
                    <dd className="text-foreground">{project.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Status</dt>
                    <dd className="text-foreground">{PROJECT_STATUS_LABELS[project.status] ?? project.status}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Cliente</dt>
                    <dd className="text-foreground">{project.client?.tradeName ?? project.client?.legalName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Início</dt>
                    <dd className="text-foreground">{fmtDate(project.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Término (plan.)</dt>
                    <dd className="text-foreground">{fmtDate(project.endDate)}</dd>
                  </div>
                  {project.objective && (
                    <div className="col-span-2">
                      <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Objetivo</dt>
                      <dd className="text-muted-foreground whitespace-pre-wrap">{project.objective}</dd>
                    </div>
                  )}
                  {project.description && (
                    <div className="col-span-2">
                      <dt className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Descrição</dt>
                      <dd className="text-muted-foreground whitespace-pre-wrap">{project.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {activeSection === 'stakeholders' && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-2 text-xs font-bold text-foreground">Contatos do cliente</h3>
                {!project?.client ? (
                  <p className="text-xs text-muted-foreground">Este projeto não tem cliente vinculado — associe um em Configurações para ver os contatos aqui.</p>
                ) : contacts === null ? (
                  <p className="text-xs text-muted-foreground">Carregando contatos…</p>
                ) : contacts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhum contato cadastrado para{' '}
                    <Link href={`/crm/empresas/${project.client.id}`} className="font-medium text-primary hover:underline">
                      {project.client.tradeName ?? project.client.legalName}
                    </Link>{' '}
                    ainda.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {contacts.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.name}</span>
                        {c.link?.jobTitle && <span className="text-muted-foreground">{c.link.jobTitle}</span>}
                        {c.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{c.email}</span>}
                        {c.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeSection === 'recursos' && (
              <>
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label className="block text-sm font-semibold text-foreground">Equipe</label>
                    <span className="text-xs text-muted-foreground">
                      {(values.teamUserIds?.length ?? 0)} de {teamCandidates.length} selecionados
                    </span>
                  </div>
                  {teamCandidates.length === 0 ? (
                    <p className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-xs text-muted-foreground">
                      Nenhum usuário disponível para montar a equipe.
                    </p>
                  ) : (
                    <div className="max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white divide-y divide-gray-100">
                      {teamCandidates.map((m) => {
                        const checked = values.teamUserIds?.includes(m.id) ?? false;
                        return (
                          <label
                            key={m.id}
                            className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-gray-50"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleTeamMember(m.id)}
                              className="h-4 w-4 rounded border-gray-300 accent-[hsl(var(--primary))]"
                            />
                            <span className={cn('text-sm', checked ? 'font-medium text-foreground' : 'text-muted-foreground')}>
                              {m.name}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Marque quem faz parte da equipe. Salva sozinho a cada mudança.
                    {!canListUsers && ' Seu perfil só enxerga quem já tem acesso ao projeto.'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Infraestrutura</label>
                  <textarea
                    {...register('infrastructure', { onBlur: handleFieldBlur })}
                    rows={3}
                    placeholder="Equipamentos, insumos, laboratórios, ferramentas necessárias…"
                    className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-ring focus:outline-none resize-y transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Orçamento estimado (R$)</label>
                  <MaskedInput
                    format={maskCurrencyBRL}
                    {...register('budget', { onBlur: handleFieldBlur })}
                    placeholder="0,00"
                    className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-ring focus:outline-none transition-colors"
                  />
                </div>
              </>
            )}

            {activeData.fields.map(({ key, label, placeholder, rows, options }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-foreground mb-1.5">{label}</label>
                {options ? (
                  <select
                    {...register(key, { onBlur: handleFieldBlur })}
                    className="w-full text-sm text-foreground bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-ring focus:outline-none transition-colors"
                  >
                    <option value="">—</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : rows === 1 ? (
                  <input
                    {...register(key, { onBlur: handleFieldBlur })}
                    placeholder={placeholder}
                    className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-ring focus:outline-none transition-colors"
                  />
                ) : (
                  <textarea
                    {...register(key, { onBlur: handleFieldBlur })}
                    rows={rows}
                    placeholder={placeholder}
                    className="w-full text-sm text-foreground placeholder:text-muted-foreground bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-ring focus:outline-none resize-y transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </form>
      </div>

      {/* Modal de exportação PDF */}
      {exportOpen && (
        <Dialog open onOpenChange={(v) => !v && setExportOpen(false)}>
          <DialogContent className="max-w-md gap-0 p-0">
            <DialogHeader className="border-b border-border px-5 py-4">
              <DialogTitle className="flex items-center gap-2 text-sm">
                <FileDown size={16} className="text-primary" /> Exportar TAP para PDF
              </DialogTitle>
            </DialogHeader>

            <div className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground">Seções a exportar</p>
                <div className="flex gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(SECTIONS.map((s) => s.id))}
                    className="font-medium text-primary hover:underline"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="font-medium text-muted-foreground hover:underline"
                  >
                    Nenhuma
                  </button>
                </div>
              </div>
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {SECTIONS.map(({ id, label, icon: Icon, color }) => (
                  <label
                    key={id}
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-gray-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(id)}
                      onChange={() => toggleSection(id)}
                      className="h-4 w-4 rounded border-gray-300 accent-[hsl(var(--primary))]"
                    />
                    <Icon size={13} style={{ color }} />
                    <span className="text-xs font-medium text-foreground">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <Button type="button" variant="ghost" size="sm" onClick={() => setExportOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" onClick={handleExport} disabled={selectedIds.length === 0}>
                <FileDown size={13} /> Gerar PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
