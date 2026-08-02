'use client'; // heatmap interativo + CRUD

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, AlertTriangle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { RiskHeatmap } from './risk-heatmap';
import type { RiskDto } from '@bioinfood/shared';
import type { ProjectMember } from '@/lib/project-members';

const PROB_LEVELS = ['VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'] as const;
const LEVEL_LABELS: Record<string, string> = {
  VERY_LOW: 'Muito Baixo', LOW: 'Baixo', MEDIUM: 'Médio', HIGH: 'Alto', VERY_HIGH: 'Muito Alto',
};

const schema = z.object({
  title:       z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  probability: z.enum(PROB_LEVELS),
  impact:      z.enum(PROB_LEVELS),
  ownerId:     z.string().optional(),
  coOwnerIds:  z.array(z.string()).optional(),
  response:    z.string().max(2000, 'Resposta deve ter no máximo 2000 caracteres').optional(),
});
type FormValues = z.infer<typeof schema>;

interface RisksClientProps {
  projectId: string;
  initialRisks: RiskDto[];
  members: ProjectMember[];
}

function scoreColor(score: number): { bg: string; text: string } {
  if (score >= 16) return { bg: '#D64550', text: '#FFFFFF' };
  if (score >= 9)  return { bg: '#DD8005', text: '#FFFFFF' };
  if (score >= 4)  return { bg: '#FFB000', text: '#C16C06' };
  return { bg: '#86C175', text: '#156D1D' };
}

export function RisksClient({ projectId, initialRisks, members }: RisksClientProps) {
  const { token } = useAuth();
  const [risks, setRisks] = useState<RiskDto[]>(initialRisks);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { probability: 'MEDIUM', impact: 'MEDIUM', coOwnerIds: [] },
  });

  // Corresponsáveis: quem divide o risco com o responsável principal. Checkbox
  // em vez de `<select multiple>` — o multiple exige Ctrl+clique e, na prática,
  // marcar o segundo nome desmarcava o primeiro.
  const coOwnerIds = watch('coOwnerIds') ?? [];
  const ownerId = watch('ownerId');

  function toggleCoOwner(userId: string) {
    const next = coOwnerIds.includes(userId)
      ? coOwnerIds.filter((id) => id !== userId)
      : [...coOwnerIds, userId];
    setValue('coOwnerIds', next, { shouldDirty: true });
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const risk = await api.post<RiskDto>(`/projects/${projectId}/risks`, {
        ...values,
        ownerId: values.ownerId || undefined,
        // O principal não se repete na lista de quem divide.
        coOwnerIds: (values.coOwnerIds ?? []).filter((id) => id !== values.ownerId),
      }, token);
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
          <h2 className="text-xl font-bold text-foreground">Matriz de Riscos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {risks.length} riscos identificados
            {critical > 0 && <span className="ml-2 text-destructive font-semibold">· {critical} críticos</span>}
            {high > 0 && <span className="ml-2 text-accent font-semibold">· {high} altos</span>}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          <Plus size={16} /> Novo Risco
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Heatmap de Riscos</h3>
          <RiskHeatmap risks={risks} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">Riscos por Criticidade</h3>
          <div className="space-y-2">
            {risks.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum risco cadastrado ainda.</p>
            )}
            {[...risks].sort((a, b) => b.score - a.score).map((risk) => {
              const { bg, text } = scoreColor(risk.score);
              return (
                <div key={risk.id} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <span className="flex items-center justify-center w-8 h-8 rounded-lg font-bold text-sm shrink-0" style={{ backgroundColor: bg, color: text }}>
                    {risk.score}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{risk.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEVEL_LABELS[risk.probability]} × {LEVEL_LABELS[risk.impact]}
                      {/* Quem responde pelo risco não aparecia em lugar nenhum
                          da lista — só dentro do formulário de criação. */}
                      {risk.owner && <> · {risk.owner.name}</>}
                      {(risk.coOwners?.length ?? 0) > 0 && (
                        <span title={risk.coOwners.map((c) => c.name).join(', ')}>
                          {' '}+{risk.coOwners.length}
                        </span>
                      )}
                    </p>
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
                        className="text-[10px] text-muted-foreground hover:text-foreground"
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
        <Dialog open onOpenChange={(v) => !v && setOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertTriangle size={16} className="text-accent" /> Novo Risco
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="risk-title" className="block text-xs font-semibold text-muted-foreground mb-1">Título *</label>
                <input id="risk-title" {...register('title')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none" />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label htmlFor="risk-owner" className="block text-xs font-semibold text-muted-foreground mb-1">Responsável</label>
                <select id="risk-owner" {...register('ownerId')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white">
                  <option value="">— Sem responsável —</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>

              {members.length > 0 && (
                <div>
                  <div className="mb-1 flex items-baseline justify-between">
                    <label className="block text-xs font-semibold text-muted-foreground">
                      Corresponsáveis
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      {coOwnerIds.filter((id) => id !== ownerId).length} selecionado(s)
                    </span>
                  </div>
                  <div className="max-h-32 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                    {members.filter((m) => m.id !== ownerId).map((m) => (
                      <label key={m.id} className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={coOwnerIds.includes(m.id)}
                          onChange={() => toggleCoOwner(m.id)}
                          className="h-4 w-4 rounded border-gray-300 accent-[hsl(var(--primary))]"
                        />
                        <span className="text-sm text-foreground">{m.name}</span>
                      </label>
                    ))}
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Quem divide o risco com o responsável principal.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="risk-probability" className="block text-xs font-semibold text-muted-foreground mb-1">Probabilidade</label>
                  <select id="risk-probability" {...register('probability')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white">
                    {PROB_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="risk-impact" className="block text-xs font-semibold text-muted-foreground mb-1">Impacto</label>
                  <select id="risk-impact" {...register('impact')} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none bg-white">
                    {PROB_LEVELS.map((l) => <option key={l} value={l}>{LEVEL_LABELS[l]}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="risk-response" className="block text-xs font-semibold text-muted-foreground mb-1">Resposta / Plano de ação</label>
                <textarea id="risk-response" {...register('response')} rows={2} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none resize-none" placeholder="Como mitigar ou aceitar este risco…" />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando…' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
