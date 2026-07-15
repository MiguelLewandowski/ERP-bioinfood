'use client'; // edit form with save feedback

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, AlertTriangle, Trash2 } from 'lucide-react';
import type { ProjectDto } from '@bioinfood/shared';
import { api } from '@/lib/api';
import { projectsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { OrganizationSelect } from '@/components/shared/organization-select';

const STATUS_OPTIONS = [
  { value: 'PLANNING',    label: 'Planejamento' },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'ON_HOLD',     label: 'Pausado' },
  { value: 'COMPLETED',   label: 'Concluído' },
  { value: 'CANCELLED',   label: 'Cancelado' },
];

const schema = z
  .object({
    name:        z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
    description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
    status:      z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']),
    startDate:   z.string().optional(),
    endDate:     z.string().optional(),
    clientId:    z.string().optional(),
    objective:   z.string().max(2000, 'Objetivo deve ter no máximo 2000 caracteres').optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'A data de término não pode ser anterior à data de início',
    path: ['endDate'],
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
  const { session } = useAuth();
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isAdmin = session.role === 'ADMIN';

  async function onDelete() {
    const ok = await confirm({
      title: 'Excluir projeto definitivamente?',
      description:
        'Esta ação é irreversível. O projeto e todos os seus dados (tarefas, riscos, marcos, WBS, TAP, stakeholders e acessos) serão apagados permanentemente.',
      confirmLabel: 'Excluir definitivamente',
      cancelLabel: 'Cancelar',
      variant: 'destructive',
    });
    if (!ok) return;

    setDeleting(true);
    setError('');
    try {
      await projectsApi.remove(projectId, token);
      router.push('/projects');
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  const { register, handleSubmit, control, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        project?.name ?? '',
      description: project?.description ?? '',
      status:      (project?.status as FormValues['status']) ?? 'PLANNING',
      startDate:   toDateInput(project?.startDate),
      endDate:     toDateInput(project?.endDate),
      clientId:    project?.client?.id ?? '',
      objective:   project?.objective ?? '',
    },
  });

  async function onSubmit(values: FormValues) {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...values,
        startDate: values.startDate || undefined,
        endDate: values.endDate || undefined,
      };
      await api.patch(`/projects/${projectId}`, payload, token);
      setSaved(true);
      setTimeout(() => { setSaved(false); router.refresh(); }, 1500);
    } catch (err) {
      setError(getErrorMessage(err));
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

          <div>
            <label className="block text-xs font-semibold text-[#575756] mb-1">Cliente</label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <OrganizationSelect token={token} value={field.value} onChange={field.onChange} />
              )}
            />
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
              {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate.message}</p>}
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

      {/* Zona de perigo — exclusão definitiva, restrita a ADMIN */}
      {isAdmin && (
        <section className="mt-8 rounded-xl border border-red-200 bg-red-50/50 p-5">
          <h3 className="text-sm font-bold text-red-700 border-b border-red-100 pb-2">Zona de perigo</h3>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#1D1D1B]">Excluir projeto definitivamente</p>
              <p className="text-xs text-[#706F6F] mt-0.5">
                Apaga o projeto e todos os seus dados. Esta ação não pode ser desfeita.
              </p>
            </div>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#D64550' }}
            >
              <Trash2 size={15} />
              {deleting ? 'Excluindo…' : 'Excluir projeto'}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
