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
  FileDown, X, Pencil, Mail, Phone,
} from 'lucide-react';
import type { ProjectDto, ContactListItemDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { getErrorMessage } from '@/lib/errors';
import { charterApi, contactsApi } from '@/lib/api-hooks';
import { cn } from '@/lib/utils';

const PROJECT_STATUS_LABELS: Record<string, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em andamento',
  ON_HOLD: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

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
  resources:          z.string().max(4000).optional(),
  governance:         z.string().max(4000).optional(),
  dependencies:       z.string().max(4000).optional(),
  constraints:        z.string().max(4000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CharterClientProps {
  projectId: string;
  initialData: (FormValues & {
    approvedAt?: string;
    lastEditedBy?: { id: string; name: string } | null;
    lastEditedAt?: string | null;
  }) | null;
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
    color: '#147F23',
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
    color: '#DD8005',
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
    color: '#147F23',
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
    color: '#C16C06',
    fields: [
      { key: 'resources', label: 'Equipe / Infraestrutura / Orçamento', placeholder: 'Descreva os recursos necessários: equipe, equipamentos, insumos, orçamento estimado…', rows: 4 },
    ],
  },
  {
    id: 'stakeholders',
    label: 'Partes Interessadas e Governança',
    icon: Users,
    color: '#147F23',
    fields: [
      { key: 'governance', label: 'RACI / Cadência / Reporting', placeholder: 'Papéis (RACI), ritmo de acompanhamento e comunicação…', rows: 3 },
    ],
  },
  {
    id: 'dependencias',
    label: 'Dependências',
    icon: Link2,
    color: '#575756',
    fields: [
      { key: 'dependencies', label: 'Dependências Externas e Internas', placeholder: 'Dependências externas, interfaces entre frentes (ex: Bioprocessos ↔ Genética)…', rows: 3 },
    ],
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

function buildPrintHtml(values: FormValues, sectionIds: string[]): string {
  const date = new Date().toLocaleDateString('pt-BR');
  const blocks = SECTIONS.filter((s) => sectionIds.includes(s.id)).map((section) => {
    const fields = section.fields
      .map(({ key, label }) => {
        const raw = (values[key] ?? '').toString().trim();
        if (!raw) return '';
        return `<div class="field"><h3>${escapeHtml(label)}</h3><p>${escapeHtml(raw)}</p></div>`;
      })
      .join('');
    if (!fields) return '';
    return `<section><h2 style="color:${section.color}">${escapeHtml(section.label)}</h2>${fields}</section>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Termo de Abertura do Projeto</title>
<style>
  @page { margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1D1D1B; font-size: 12px; line-height: 1.5; }
  header { border-bottom: 3px solid #147F23; padding-bottom: 12px; margin-bottom: 20px; }
  header h1 { color: #147F23; font-size: 20px; margin: 0 0 4px; }
  header p { color: #706F6F; font-size: 11px; margin: 0; }
  section { page-break-inside: avoid; margin-bottom: 22px; }
  section h2 { font-size: 14px; margin: 0 0 10px; padding-bottom: 4px; border-bottom: 1px solid #E5E5E5; }
  .field { margin-bottom: 12px; }
  .field h3 { font-size: 12px; color: #1D1D1B; margin: 0 0 2px; }
  .field p { margin: 0; color: #575756; white-space: normal; }
</style></head>
<body>
  <header>
    <h1>Termo de Abertura do Projeto</h1>
    <p>Bioinfood &middot; Gerado em ${date}</p>
  </header>
  ${blocks || '<p>Nenhuma seção com conteúdo selecionada.</p>'}
</body></html>`;
}

export function CharterClient({ projectId, initialData, project }: CharterClientProps) {
  const { token } = useAuth();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('identificacao');
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(SECTIONS.map((s) => s.id));
  const [contacts, setContacts] = useState<ContactListItemDto[] | null>(null);
  const [lastEdit, setLastEdit] = useState(
    initialData?.lastEditedAt
      ? { name: initialData.lastEditedBy?.name ?? 'Alguém', at: initialData.lastEditedAt }
      : null,
  );

  const {
    register, handleSubmit, getValues, watch, reset, formState: { isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData ?? {},
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

  // Seções com pelo menos um campo preenchido — alimenta o dot de progresso no nav.
  const sectionHasContent = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const section of SECTIONS) {
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
    const html = buildPrintHtml(getValues(), selectedIds);
    const win = window.open('', '_blank'); // aba nova, não pop-up
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    win.onload = () => {
      win.print();
    };
    // fallback if onload já disparou
    setTimeout(() => win.print(), 500);
    setExportOpen(false);
  }

  async function persist(values: FormValues) {
    setSaving(true);
    try {
      await charterApi.upsert(projectId, values, token);
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
          <p className="text-[10px] font-bold text-[#878787] uppercase tracking-wider">Seções do TAP</p>
          <p className="text-[10px] font-medium text-[#878787]">{filledCount}/{SECTIONS.length}</p>
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
                  : 'text-[#575756] hover:bg-gray-50 hover:text-[#1D1D1B]',
              )}
              style={activeSection === id ? { backgroundColor: color } : {}}
            >
              <Icon size={13} className="shrink-0" />
              <span className="leading-snug flex-1">{i + 1}. {label}</span>
              {sectionHasContent[id] && (
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full shrink-0',
                    activeSection === id ? 'bg-white' : 'bg-[#46AD48]',
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
                <h2 className="text-base font-bold text-[#1D1D1B]">{activeData.label}</h2>
                <p className="text-xs text-[#706F6F]">
                  Termo de Abertura do Projeto (TAP)
                  {lastEdit && <> · editado por {lastEdit.name} em {fmtDateTime(lastEdit.at)}</>}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setExportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-[#575756] hover:bg-gray-50 transition-colors"
              >
                <FileDown size={13} />
                Exportar PDF
              </button>
              {isApproved ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#86C175', color: '#156D1D' }}>
                  <CheckCircle2 size={12} /> Aprovado em {fmtDate(initialData!.approvedAt!)}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={approving}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#147F23] text-[#147F23] hover:bg-[#147F23] hover:text-white transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 size={12} />
                  {approving ? 'Aprovando…' : 'Aprovar TAP'}
                </button>
              )}
              <button
                type="submit"
                disabled={saving || !isDirty}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#147F23' }}
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
                    <h3 className="text-sm font-bold text-[#1D1D1B]">Dados do Projeto</h3>
                    <p className="text-xs text-[#878787]">Vêm do cadastro do projeto — edite em Configurações.</p>
                  </div>
                  <Link
                    href={`/projects/${projectId}/settings`}
                    className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-[#575756] hover:bg-gray-50"
                  >
                    <Pencil size={12} /> Editar
                  </Link>
                </div>

                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  <div className="col-span-2">
                    <dt className="text-[11px] font-semibold text-[#878787] uppercase tracking-wide">Nome</dt>
                    <dd className="text-[#1D1D1B]">{project.name}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-[#878787] uppercase tracking-wide">Status</dt>
                    <dd className="text-[#1D1D1B]">{PROJECT_STATUS_LABELS[project.status] ?? project.status}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-[#878787] uppercase tracking-wide">Cliente</dt>
                    <dd className="text-[#1D1D1B]">{project.client?.tradeName ?? project.client?.legalName ?? '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-[#878787] uppercase tracking-wide">Início</dt>
                    <dd className="text-[#1D1D1B]">{fmtDate(project.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold text-[#878787] uppercase tracking-wide">Término (plan.)</dt>
                    <dd className="text-[#1D1D1B]">{fmtDate(project.endDate)}</dd>
                  </div>
                  {project.objective && (
                    <div className="col-span-2">
                      <dt className="text-[11px] font-semibold text-[#878787] uppercase tracking-wide">Objetivo</dt>
                      <dd className="text-[#575756] whitespace-pre-wrap">{project.objective}</dd>
                    </div>
                  )}
                  {project.description && (
                    <div className="col-span-2">
                      <dt className="text-[11px] font-semibold text-[#878787] uppercase tracking-wide">Descrição</dt>
                      <dd className="text-[#575756] whitespace-pre-wrap">{project.description}</dd>
                    </div>
                  )}
                </dl>
              </div>
            )}

            {activeSection === 'stakeholders' && (
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <h3 className="mb-2 text-xs font-bold text-[#1D1D1B]">Contatos do cliente</h3>
                {!project?.client ? (
                  <p className="text-xs text-[#878787]">Este projeto não tem cliente vinculado — associe um em Configurações para ver os contatos aqui.</p>
                ) : contacts === null ? (
                  <p className="text-xs text-[#878787]">Carregando contatos…</p>
                ) : contacts.length === 0 ? (
                  <p className="text-xs text-[#878787]">
                    Nenhum contato cadastrado para{' '}
                    <Link href={`/clientes/${project.client.id}`} className="font-medium text-[#147F23] hover:underline">
                      {project.client.tradeName ?? project.client.legalName}
                    </Link>{' '}
                    ainda.
                  </p>
                ) : (
                  <ul className="space-y-1.5">
                    {contacts.map((c) => (
                      <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#575756]">
                        <span className="font-medium text-[#1D1D1B]">{c.name}</span>
                        {c.link?.jobTitle && <span className="text-[#878787]">{c.link.jobTitle}</span>}
                        {c.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{c.email}</span>}
                        {c.phone && <span className="inline-flex items-center gap-1"><Phone size={11} />{c.phone}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeData.fields.map(({ key, label, placeholder, rows, options }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-[#1D1D1B] mb-1.5">{label}</label>
                {options ? (
                  <select
                    {...register(key, { onBlur: handleFieldBlur })}
                    className="w-full text-sm text-[#1D1D1B] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors"
                  >
                    <option value="">—</option>
                    {options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : rows === 1 ? (
                  <input
                    {...register(key, { onBlur: handleFieldBlur })}
                    placeholder={placeholder}
                    className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors"
                  />
                ) : (
                  <textarea
                    {...register(key, { onBlur: handleFieldBlur })}
                    rows={rows}
                    placeholder={placeholder}
                    className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none resize-y transition-colors"
                  />
                )}
              </div>
            ))}
          </div>
        </form>
      </div>

      {/* Modal de exportação PDF */}
      {exportOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setExportOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div className="flex items-center gap-2">
                <FileDown size={16} className="text-[#147F23]" />
                <h3 className="text-sm font-bold text-[#1D1D1B]">Exportar TAP para PDF</h3>
              </div>
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="text-[#878787] hover:text-[#1D1D1B]"
              >
                <X size={16} />
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-semibold text-[#575756]">Seções a exportar</p>
                <div className="flex gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(SECTIONS.map((s) => s.id))}
                    className="font-medium text-[#147F23] hover:underline"
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="font-medium text-[#878787] hover:underline"
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
                      className="h-4 w-4 rounded border-gray-300 accent-[#147F23]"
                    />
                    <Icon size={13} style={{ color }} />
                    <span className="text-xs font-medium text-[#1D1D1B]">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                onClick={() => setExportOpen(false)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#575756] hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: '#147F23' }}
              >
                <FileDown size={13} />
                Gerar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
