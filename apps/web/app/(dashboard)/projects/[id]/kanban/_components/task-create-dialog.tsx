'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import type { Task } from './types';

const schema = z.object({
  title:       z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority:    z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
  storyPoints: z.coerce.number().int().min(1).max(100).optional(),
  startDate:   z.string().optional(),
  dueDate:     z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface TaskCreateDialogProps {
  projectId: string;
  onCreated: (task: Task) => void;
}

export function TaskCreateDialog({ projectId, onCreated }: TaskCreateDialogProps) {
  const { token } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const task = await api.post<Task>(`/projects/${projectId}/tasks`, values, token);
      onCreated(task);
      reset();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors hover:opacity-90"
        style={{ backgroundColor: '#147F23' }}
      >
        <Plus size={16} /> Nova Tarefa
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[#1D1D1B]">Nova Tarefa</h3>
          <button onClick={() => setOpen(false)} className="text-[#706F6F] hover:text-[#1D1D1B] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#575756] mb-1">Título *</label>
            <input
              {...register('title')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              placeholder="Título da tarefa"
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#575756] mb-1">Descrição</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none resize-none"
              placeholder="Detalhes opcionais…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Prioridade</label>
              <select
                {...register('priority')}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white"
              >
                <option value="LOW">Baixa</option>
                <option value="MEDIUM">Média</option>
                <option value="HIGH">Alta</option>
                <option value="CRITICAL">Crítica</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Story Points</label>
              <input
                {...register('storyPoints')}
                type="number"
                min={1}
                max={100}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
                placeholder="Ex: 3"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Data de Início</label>
              <input
                {...register('startDate')}
                type="date"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#575756] mb-1">Prazo (término)</label>
              <input
                {...register('dueDate')}
                type="date"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-[#575756] hover:text-[#1D1D1B] transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-50"
              style={{ backgroundColor: '#147F23' }}
            >
              {loading ? 'Criando…' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
