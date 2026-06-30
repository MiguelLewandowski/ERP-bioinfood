'use client'; // interactive multi-section form

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, CheckCircle2, Info, Target, FlaskConical,
  Layers, Package, Users, Link2, AlertCircle, Wrench,
  FileDown, X,
} from 'lucide-react';
import type { ProjectDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { projectsApi } from '@/lib/api-hooks';
import { cn } from '@/lib/utils';

const PROJECT_STATUS_OPTIONS = [
  { value: 'PLANNING', label: 'Planejamento' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'ON_HOLD', label: 'Pausado' },
  { value: 'COMPLETED', label: 'Concluído' },
  { value: 'CANCELLED', label: 'Cancelado' },
] as const;

interface ProjectFormValues {
  name: string;
  description: string;
  status: string;
  startDate: string;
  endDate: string;
  clientName: string;
  objective: string;
  sponsor: string;
}

function isoToDateInput(iso: string | null): string {
  return iso ? iso.slice(0, 10) : '';
}

function projectToForm(project: ProjectDto): ProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? '',
    status: project.status,
    startDate: isoToDateInput(project.startDate),
    endDate: isoToDateInput(project.endDate),
    clientName: project.clientName ?? '',
    objective: project.objective ?? '',
    sponsor: project.sponsor ?? '',
  };
}

function buildProjectPayload(v: ProjectFormValues): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: v.name,
    description: v.description,
    status: v.status,
    clientName: v.clientName,
    objective: v.objective,
    sponsor: v.sponsor,
  };
  // Datas só vão quando preenchidas (a API valida ISO date).
  if (v.startDate) payload.startDate = new Date(v.startDate).toISOString();
  if (v.endDate) payload.endDate = new Date(v.endDate).toISOString();
  return payload;
}

const schema = z.object({
  projectType:        z.string().max(200).optional(),
  priority:           z.string().max(100).optional(),
  projectOwner:       z.string().max(200).optional(),
  team:               z.string().max(2000).optional(),
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
  stakeholders:       z.string().max(4000).optional(),
  governance:         z.string().max(4000).optional(),
  dependencies:       z.string().max(4000).optional(),
  constraints:        z.string().max(4000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface CharterClientProps {
  projectId: string;
  initialData: (FormValues & { approvedAt?: string }) | null;
  project: ProjectDto | null;
}

const SECTIONS = [
  {
    id: 'identificacao',
    label: '1. Identificação do Projeto',
    icon: Info,
    color: '#147F23',
    fields: [
      { key: 'projectType',  label: 'Tipo',         placeholder: 'Ex: Subvenção, P&D Interno, Consultoria…', rows: 1 },
      { key: 'priority',     label: 'Prioridade',   placeholder: 'Alta / Média / Baixa', rows: 1 },
      { key: 'projectOwner', label: 'Proprietário', placeholder: 'Nome do responsável técnico pelo projeto', rows: 1 },
      { key: 'team',         label: 'Equipe envolvida', placeholder: 'Ex: Genética, Bioprocessos, Planta Piloto…', rows: 2 },
    ],
  },
  {
    id: 'contexto',
    label: '2. Contexto e Justificativa',
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
    label: '3. Objetivos',
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
    label: '4. Escopo',
    icon: Layers,
    color: '#147F23',
    fields: [
      { key: 'scope',      label: 'Em Escopo',       placeholder: 'O que está incluído neste projeto…', rows: 4 },
      { key: 'outOfScope', label: 'Fora de Escopo',  placeholder: 'O que está explicitamente excluído…', rows: 3 },
      { key: 'constraints', label: 'Restrições',     placeholder: 'Limitações de prazo, recursos, regulação…', rows: 2 },
    ],
  },
  {
    id: 'entregaveis',
    label: '5. Entregáveis',
    icon: Package,
    color: '#46AD48',
    fields: [
      { key: 'deliverables', label: 'Lista de Entregáveis', placeholder: 'Liste os entregáveis principais, um por linha…', rows: 4 },
    ],
  },
  {
    id: 'recursos',
    label: '6. Recursos e Orçamento',
    icon: Wrench,
    color: '#C16C06',
    fields: [
      { key: 'resources', label: 'Equipe / Infraestrutura / Orçamento', placeholder: 'Descreva os recursos necessários: equipe, equipamentos, insumos, orçamento estimado…', rows: 4 },
    ],
  },
  {
    id: 'stakeholders',
    label: '7. Partes Interessadas e Governança',
    icon: Users,
    color: '#147F23',
    fields: [
      { key: 'stakeholders', label: 'Stakeholders Chave', placeholder: 'Quem são os stakeholders e qual o papel de cada um?', rows: 3 },
      { key: 'governance',   label: 'RACI / Cadência / Reporting', placeholder: 'Papéis (RACI), ritmo de acompanhamento e comunicação…', rows: 3 },
    ],
  },
  {
    id: 'dependencias',
    label: '8. Dependências',
    icon: Link2,
    color: '#575756',
    fields: [
      { key: 'dependencies', label: 'Dependências Externas e Internas', placeholder: 'Dependências externas, interfaces entre frentes (ex: Bioprocessos ↔ Genética)…', rows: 3 },
    ],
  },
] as const;

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
        const raw = (values[key as keyof FormValues] ?? '').toString().trim();
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
  const { token, session } = useAuth();
  const isAdmin = session.role === 'ADMIN';
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('identificacao');
  const [exportOpen, setExportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>(SECTIONS.map((s) => s.id));

  const { register, handleSubmit, getValues, formState: { isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData ?? {},
  });

  // Form separado para os dados do Projeto (model Project, não Charter).
  const projectForm = useForm<ProjectFormValues>({
    defaultValues: project ? projectToForm(project) : undefined,
  });
  const projectDirty = projectForm.formState.isDirty;

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

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/charter`, values, token);
      // Dados do projeto: só ADMIN edita, e só persiste se houve alteração.
      if (isAdmin && projectDirty) {
        const projectValues = projectForm.getValues();
        await projectsApi.update(projectId, buildProjectPayload(projectValues), token);
        projectForm.reset(projectValues);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    setApproving(true);
    try {
      await api.post(`/projects/${projectId}/charter/approve`, {}, token);
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
        <p className="px-4 text-[10px] font-bold text-[#878787] uppercase tracking-wider mb-2">Seções do TAP</p>
        <nav className="space-y-0.5 px-2">
          {SECTIONS.map(({ id, label, icon: Icon, color }) => (
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
              <Icon size={13} />
              <span className="leading-snug">{label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main form area */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
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
                <p className="text-xs text-[#706F6F]">Termo de Abertura do Projeto (TAP)</p>
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
              {isApproved && (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold" style={{ backgroundColor: '#86C175', color: '#156D1D' }}>
                  <CheckCircle2 size={12} /> Aprovado
                </span>
              )}
              {!isApproved && (
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
                disabled={saving || (!isDirty && !projectDirty)}
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
              <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-[#1D1D1B]">Dados do Projeto</h3>
                  <p className="text-xs text-[#878787]">
                    Preenchidos automaticamente a partir do cadastro do projeto.
                    {isAdmin ? ' Você pode alterá-los aqui.' : ' Somente ADMIN pode alterar.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Nome do Projeto</label>
                    <input
                      {...projectForm.register('name')}
                      disabled={!isAdmin}
                      className="w-full text-sm text-[#1D1D1B] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Status</label>
                      <select
                        {...projectForm.register('status')}
                        disabled={!isAdmin}
                        className="w-full text-sm text-[#1D1D1B] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      >
                        {PROJECT_STATUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Cliente</label>
                      <input
                        {...projectForm.register('clientName')}
                        disabled={!isAdmin}
                        placeholder="—"
                        className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Data de início</label>
                      <input
                        type="date"
                        {...projectForm.register('startDate')}
                        disabled={!isAdmin}
                        className="w-full text-sm text-[#1D1D1B] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Término (planejado)</label>
                      <input
                        type="date"
                        {...projectForm.register('endDate')}
                        disabled={!isAdmin}
                        className="w-full text-sm text-[#1D1D1B] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Término (estimado)</label>
                    <div className="w-full text-sm bg-gray-100 rounded-lg px-3 py-2.5 border border-gray-200 text-[#575756]">
                      {project.forecastEndDate
                        ? new Date(project.forecastEndDate).toLocaleDateString('pt-BR')
                        : '— sem atividades com prazo —'}
                    </div>
                    <p className="mt-1 text-[11px] text-[#878787]">
                      Calculado automaticamente: maior prazo entre as atividades do projeto.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Sponsor</label>
                    <input
                      {...projectForm.register('sponsor')}
                      disabled={!isAdmin}
                      placeholder="—"
                      className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Objetivo</label>
                    <textarea
                      {...projectForm.register('objective')}
                      disabled={!isAdmin}
                      rows={2}
                      placeholder="—"
                      className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none resize-y transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1D1D1B] mb-1.5">Descrição</label>
                    <textarea
                      {...projectForm.register('description')}
                      disabled={!isAdmin}
                      rows={3}
                      placeholder="—"
                      className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-white rounded-lg px-3 py-2.5 border border-gray-200 focus:border-[#52B552] focus:outline-none resize-y transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeData.fields.map(({ key, label, placeholder, rows }) => (
              <div key={key}>
                <label className="block text-sm font-semibold text-[#1D1D1B] mb-1.5">{label}</label>
                {rows === 1 ? (
                  <input
                    {...register(key as keyof FormValues)}
                    placeholder={placeholder}
                    className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-gray-50 rounded-lg px-3 py-2.5 border border-transparent focus:border-[#52B552] focus:bg-white focus:outline-none transition-colors"
                  />
                ) : (
                  <textarea
                    {...register(key as keyof FormValues)}
                    rows={rows}
                    placeholder={placeholder}
                    className="w-full text-sm text-[#1D1D1B] placeholder:text-[#878787] bg-gray-50 rounded-lg px-3 py-2.5 border border-transparent focus:border-[#52B552] focus:bg-white focus:outline-none resize-y transition-colors"
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
                <p className="text-xs font-semibold text-[#575756]">Índices a exportar</p>
                <div className="flex gap-3 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(SECTIONS.map((s) => s.id))}
                    className="font-medium text-[#147F23] hover:underline"
                  >
                    Todos
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="font-medium text-[#878787] hover:underline"
                  >
                    Nenhum
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
