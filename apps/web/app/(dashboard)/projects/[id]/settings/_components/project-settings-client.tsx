'use client'; // edit form with save feedback

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, AlertTriangle } from 'lucide-react';
import type { ProjectDto } from '@bioinfood/shared';

const STATUS_OPTIONS = [
  { value: 'PLANNING',    label: 'Planejamento' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'ON_HOLD',     label: 'Pausado' },
  { value: 'COMPLETED',   label: 'Concluído' },
  { value: 'CANCELLED',   label: 'Cancelado' },
];

const schema = z.object({
  name:        z.string().min(1, 'Nome obrigatório').max(200),
  description: z.string().max(2000).optional(),
  status:      z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
  clientName:  z.string().max(200).optional(),
  objective:   z.string().max(2000).optional(),
  sponsor:     z.string().max(200).optional(),
});

type FormValues = z.infer<typeof schema>;

interface ProjectSettingsClientProps {
  projectId: string;
  token: string;
  project: ProjectDto | null;
}

function toDateInput(d: string | null | undefined): string {
  if (!d) return '';
  return d.split('T')[0];
}

export function ProjectSettingsClient({ projectId, token, project }: ProjectSettingsClientProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        project?.name ?? '',
      description: project?.description ?? '',
      status:      (project?.status as FormValues['status']) ?? 'PLANNING',
      startDate:   toDateInput(project?.startDate),
      endDate:     toDateInput(project?.endDate),
      clientName:  project?.clientName ?? '',
      objective:   project?.objective ?? '',
      sponsor:     project?.sponsor ?? '',
    },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(values),
      });
      if (!res.ok) { setError('Erro ao salvar. Tente novamente.'); return; }
      setSaved(true);
      setTimeout(() => { setSaved(false); router.refresh(); }, 1500);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-[#1D1D1B]">Configurações do Projeto</h2>
        <p className="text-sm text-[#706F6F] mt-0.5">Edite as informações gerais do projeto</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Identificação */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#1D1D1B] border-b border-gray-100 pb-2">Identificação</h3>

          <div>
            <label className="block text-xs font-semibold text-[#575756] mb-1">Nome do Projeto *</label>
            <input
              {...register('name')}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#575756] mb-1">Descrição</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Cliente</label>
              <input
                {...register('clientName')}
                placeholder="Ex: FINEP, Ambev, Interno…"
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Patrocinador</label>
              <input
                {...register('sponsor')}
                placeholder="Nome do sponsor"
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#575756] mb-1">Objetivo resumido</label>
            <input
              {...register('objective')}
              placeholder="Resumo do objetivo do projeto em uma linha"
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
            />
          </div>
        </section>

        {/* Status e datas */}
        <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="text-sm font-bold text-[#1D1D1B] border-b border-gray-100 pb-2">Status e Cronograma</h3>

          <div>
            <label className="block text-xs font-semibold text-[#575756] mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white"
            >
              {STATUS_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Data de Início</label>
              <input
                {...register('startDate')}
                type="date"
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Data de Término</label>
              <input
                {...register('endDate')}
                type="date"
                className="w-full text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-lg px-4 py-3">
            <AlertTriangle size={15} /> {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !isDirty}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: '#147F23' }}
          >
            <Save size={15} />
            {saving ? 'Salvando…' : saved ? 'Salvo ✓' : 'Salvar Alterações'}
          </button>
        </div>
      </form>
    </div>
  );
}
