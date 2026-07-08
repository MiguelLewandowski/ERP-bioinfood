'use client'; // milestone CRUD + timeline visual

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, Flag, CheckCircle2, Circle } from 'lucide-react';
import type { MilestoneDto } from '@bioinfood/shared';
import { format, differenceInDays, startOfMonth, endOfMonth, addMonths, isBefore, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

const schema = z.object({
  title:       z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
  date:        z.string().min(1, 'Data é obrigatória'),
});
type FormValues = z.infer<typeof schema>;

interface RoadmapClientProps {
  projectId: string;
  token: string;
  initialMilestones: MilestoneDto[];
}

export function RoadmapClient({ projectId, token, initialMilestones }: RoadmapClientProps) {
  const [milestones, setMilestones] = useState<MilestoneDto[]>(
    [...initialMilestones].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
  );
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const m = await api.post<MilestoneDto>(`/projects/${projectId}/milestones`, values, token);
      setMilestones((prev) => [...prev, m].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function toggleReached(m: MilestoneDto) {
    try {
      await api.patch(`/projects/${projectId}/milestones/${m.id}`, { reached: !m.reached }, token);
      setMilestones((prev) => prev.map((x) => x.id === m.id ? { ...x, reached: !m.reached } : x));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const now = new Date();
  const reached = milestones.filter((m) => m.reached).length;

  // Build months range for timeline
  const dates = milestones.map((m) => new Date(m.date));
  const minDate = dates.length ? new Date(Math.min(...dates.map((d) => d.getTime()))) : now;
  const maxDate = dates.length ? new Date(Math.max(...dates.map((d) => d.getTime()))) : addMonths(now, 3);
  const timelineStart = startOfMonth(isBefore(minDate, now) ? minDate : now);
  const timelineEnd   = endOfMonth(isAfter(maxDate, addMonths(now, 1)) ? maxDate : addMonths(now, 1));
  const totalDays     = differenceInDays(timelineEnd, timelineStart) || 1;

  function positionPercent(dateStr: string) {
    const d = new Date(dateStr);
    const diff = differenceInDays(d, timelineStart);
    return Math.max(0, Math.min(100, (diff / totalDays) * 100));
  }

  const todayPercent = Math.max(0, Math.min(100, (differenceInDays(now, timelineStart) / totalDays) * 100));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1B]">Roadmap</h2>
          <p className="text-sm text-[#706F6F] mt-0.5">
            {milestones.length} marcos · {reached} concluídos
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#147F23' }}
        >
          <Plus size={16} /> Novo Marco
        </button>
      </div>

      {/* Progress bar */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <div className="flex justify-between text-xs text-[#706F6F] mb-2">
            <span>Progresso dos marcos</span>
            <span className="font-semibold text-[#147F23]">{reached}/{milestones.length}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${(reached / milestones.length) * 100}%`, backgroundColor: '#147F23' }}
            />
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <h3 className="text-sm font-semibold text-[#1D1D1B] mb-5">Linha do Tempo</h3>

        {milestones.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#706F6F]">Adicione marcos para ver a timeline.</div>
        ) : (
          <div className="relative">
            {/* Ruler */}
            <div className="relative h-6 mb-2">
              {Array.from({ length: Math.ceil(totalDays / 30) + 1 }).map((_, i) => {
                const d = addMonths(timelineStart, i);
                const pct = (differenceInDays(d, timelineStart) / totalDays) * 100;
                if (pct > 100) return null;
                return (
                  <span key={i} className="absolute text-[10px] text-[#878787] -translate-x-1/2" style={{ left: `${pct}%` }}>
                    {format(d, 'MMM/yy', { locale: ptBR })}
                  </span>
                );
              })}
            </div>

            {/* Track */}
            <div className="relative h-1.5 bg-gray-100 rounded-full mb-8">
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${todayPercent}%`, backgroundColor: '#86C175' }} />
              {/* Today marker */}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white bg-[#147F23]" style={{ left: `${todayPercent}%` }} />
              {/* Milestone markers */}
              {milestones.map((m) => {
                const pct = positionPercent(m.date);
                return (
                  <button
                    key={m.id}
                    onClick={() => toggleReached(m)}
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 group"
                    style={{ left: `${pct}%` }}
                    title={`${m.title} — ${format(new Date(m.date), 'dd/MM/yyyy')}`}
                  >
                    <Flag
                      size={18}
                      className="transition-transform group-hover:scale-125"
                      style={{ color: m.reached ? '#147F23' : '#DD8005' }}
                      fill={m.reached ? '#147F23' : 'none'}
                    />
                    <span className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-[#575756] font-medium opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm z-10">
                      {m.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="space-y-2">
        {milestones.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-4 hover:border-[#52B552] transition-colors">
            <button onClick={() => toggleReached(m)} className="shrink-0 mt-0.5">
              {m.reached
                ? <CheckCircle2 size={20} style={{ color: '#147F23' }} />
                : <Circle size={20} style={{ color: '#878787' }} />}
            </button>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold ${m.reached ? 'line-through text-[#878787]' : 'text-[#1D1D1B]'}`}>{m.title}</p>
              {m.description && <p className="text-xs text-[#706F6F] mt-0.5">{m.description}</p>}
            </div>
            <span className="text-xs font-medium text-[#706F6F] shrink-0">
              {format(new Date(m.date), "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
            </span>
          </div>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#1D1D1B]">Novo Marco</h3>
              <button onClick={() => setOpen(false)} className="text-[#706F6F] hover:text-[#1D1D1B]"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Título *</label>
                <input {...register('title')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none" />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Descrição</label>
                <textarea {...register('description')} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Data *</label>
                <input {...register('date')} type="date" className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none" />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-[#575756] hover:text-[#1D1D1B]">Cancelar</button>
                <button type="submit" disabled={loading} className="px-5 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-50" style={{ backgroundColor: '#147F23' }}>
                  {loading ? 'Salvando…' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
