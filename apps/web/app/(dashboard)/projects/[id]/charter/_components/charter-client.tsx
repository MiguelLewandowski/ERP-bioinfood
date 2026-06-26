'use client'; // interactive multi-section form

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Save, CheckCircle2, Info, Target, FlaskConical,
  Layers, Package, Users, Link2, AlertCircle, Wrench,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

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

export function CharterClient({ projectId, initialData }: CharterClientProps) {
  const { token } = useAuth();
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState('identificacao');

  const { register, handleSubmit, formState: { isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialData ?? {},
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    try {
      await api.put(`/projects/${projectId}/charter`, values, token);
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
    </div>
  );
}
