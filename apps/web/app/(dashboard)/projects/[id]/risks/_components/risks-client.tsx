'use client'; // heatmap interativo + CRUD

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, X, AlertTriangle, Trash2 } from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { RiskHeatmap } from './risk-heatmap';
import type { RiskDto } from '@bioinfood/shared';

const PROB_LEVELS = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
const LEVEL_LABELS: Record<string, string> = {
  VERY_LOW: 'Muito Baixo', LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', VERY_HIGH: 'Muito Alto',
};

const schema = z.object({
  title:       z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
  probability: z.enum(PROB_LEVELS),
  impact:      z.enum(PROB_LEVELS),
  response:    z.string().max(2000, 'Resposta deve ter no máximo 2000 caracteres').optional(),
});
type FormValues = z.infer<typeof schema>;

interface RisksClientProps {
  projectId: string;
  initialRisks: RiskDto[];
}

function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 16) return { bg: '#147F23', text: '#FFFFFF' };
  if (score >= 9)  return { bg: '#DD8005', text: '#FFFFFF' };
  if (score >= 4)  return { bg: '#FFB000', text: '#C16C06' };
  return { bg: '#86C175', text: '#156D1D' };
}

export function RisksClient({ projectId, initialRisks }: RisksClientProps) {
  const { token } = useAuth();
  const [risks, setRisks] = useState<RiskDto[]>(initialRisks);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { probability: 'MEDIUM', impact: 'MEDIUM' },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const risk = await api.post<RiskDto>(`/projects/${projectId}/risks`, values, token);
      setRisks((prev) => [risk, ...prev]);
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.delete(`/projects/${projectId}/risks/${id}`, token);
      setRisks((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(null);
      setConfirmingDelete(null);
    }
  }

  const critical = risks.filter((r) => r.score >= 16).length;
  const high      = risks.filter((r) => r.score >= 9 && r.score < 16).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[#1D1D1B]">Matriz de Riscos</h2>
          <p className="text-sm text-[#706F6F] mt-0.5">
            {risks.length} riscos identificados
            {critical > 0 && <span className="ml-2 text-[#147F23] font-semibold">· {critical} críticos</span>}
            {high > 0 && <span className="ml-2 text-[#DD8005] font-semibold">· {high} altos</span>}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#147F23' }}
        >
          <Plus size={16} /> Novo Risco
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#1D1D1B] mb-4">Heatmap de Riscos</h3>
          <RiskHeatmap risks={risks} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-[#1D1D1B] mb-4">Riscos por Criticidade</h3>
          <div className="space-y-2">
            {risks.length === 0 && (
              <p className="text-sm text-[#706F6F] py-8 text-center">Nenhum risco cadastrado ainda.</p>
            )}
            {[...risks].sort((a, b) => b.score - a.score).map((risk) => {
              const { bg, text } = scoreColor(risk.score);
              return (
                <div key={risk.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0" style={{ backgroundColor: bg, color: text }}>
                    {risk.score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1D1D1B] truncate">{risk.title}</p>
                    <p className="text-xs text-[#706F6F]">{LEVEL_LABELS[risk.probability]} × {LEVEL_LABELS[risk.impact]}</p>
                  </div>
                  {confirmingDelete === risk.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] text-red-600 font-medium">Excluir?</span>
                      <button
                        onClick={() => handleDelete(risk.id)}
                        disabled={deleting === risk.id}
                        className="text-[10px] px-2 py-0.5 bg-red-500 text-white rounded font-semibold disabled:opacity-50"
                      >
                        {deleting === risk.id ? '…' : 'Sim'}
                      </button>
                      <button
                        onClick={() => setConfirmingDelete(null)}
                        className="text-[10px] text-[#706F6F] hover:text-[#1D1D1B]"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmingDelete(risk.id)}
                      aria-label={`Excluir risco ${risk.title}`}
                      className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-bold text-[#1D1D1B] flex items-center gap-2">
                <AlertTriangle size={16} style={{ color: '#DD8005' }} /> Novo Risco
              </h3>
              <button onClick={() => setOpen(false)} className="text-[#706F6F] hover:text-[#1D1D1B]">
                <X size={18} />
              </button>
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#575756] mb-1">Probabilidade</label>
                  <select {...register('probability')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white">
                    {PROB_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#575756] mb-1">Impacto</label>
                  <select {...register('impact')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none bg-white">
                    {PROB_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#575756] mb-1">Resposta / Plano de ação</label>
                <textarea {...register('response')} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none resize-none" placeholder="Como mitigar ou aceitar este risco…" />
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
