'use client';
// Client Component: interactive form with controlled dialog state.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProjectDto } from '@bioinfood/shared';
import { api } from '@/lib/api';
import { useAuth } from '@/components/providers/auth-provider';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (project: ProjectDto) => void;
}

export default function ProjectDialog({ open, onOpenChange, onCreated }: ProjectDialogProps) {
  const { token } = useAuth();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PLANNING' },
  });

  if (!open) return null;

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const project = await api.post<ProjectDto>('/projects', data, token);
      reset();
      onCreated(project);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Erro ao criar projeto');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">Novo Projeto</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#706F6F] hover:text-[#575756] focus:outline-none focus:ring-2 focus:ring-[#52B552] rounded"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Nome *</label>
            <input
              {...register('name')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              placeholder="Nome do projeto"
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Descrição</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552] resize-none"
              placeholder="Descreva o projeto..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Status</label>
            <select
              {...register('status')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              <option value="PLANNING">Planejamento</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="ON_HOLD">Pausado</option>
              <option value="COMPLETED">Concluído</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Data de início</label>
              <input
                {...register('startDate')}
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Data de fim</label>
              <input
                {...register('endDate')}
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              />
            </div>
          </div>

          {serverError && <p className="text-xs text-red-500">{serverError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={() => { reset(); onOpenChange(false); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#575756] border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              {isSubmitting ? 'Criando...' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
