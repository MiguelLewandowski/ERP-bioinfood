'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Star, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import type { PipelineDto, StageDto, StageType } from '@bioinfood/shared';
import { pipelinesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

const TYPE_LABELS: Record<StageType, string> = { OPEN: 'Aberta', WON: 'Ganho', LOST: 'Perdido' };

// New pipelines start with a usable OPEN → WON → LOST skeleton.
const DEFAULT_STAGES = [
  { name: 'Novo', type: 'OPEN', probability: 10, color: '#878787' },
  { name: 'Em andamento', type: 'OPEN', probability: 50, color: '#DD8005' },
  { name: 'Ganho', type: 'WON', probability: 100, color: '#156D1D' },
  { name: 'Perdido', type: 'LOST', probability: 0, color: '#C0392B' },
];

export function FunisClient({ pipelines }: { pipelines: PipelineDto[] }) {
  const { token } = useAuth();
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); router.refresh(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBusy(false); }
  }

  async function createPipeline() {
    if (!newName.trim()) return;
    await run(async () => {
      await pipelinesApi.create({ name: newName.trim(), stages: DEFAULT_STAGES }, token);
      setNewName('');
    });
  }

  return (
    <div className="space-y-6">
      <Link href="/crm" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#575756] hover:text-[#1D1D1B]">
        <ArrowLeft size={14} /> Voltar para o funil
      </Link>

      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createPipeline()}
          placeholder="Nome do novo funil (ex: Licenciamento)"
          className="flex-1 max-w-sm text-sm px-3 py-2.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
        />
        <button
          onClick={createPipeline}
          disabled={busy || !newName.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-40"
          style={{ backgroundColor: '#147F23' }}
        >
          <Plus size={15} /> Criar funil
        </button>
      </div>

      {pipelines.map((p) => (
        <PipelineCard key={p.id} pipeline={p} busy={busy} run={run} />
      ))}
    </div>
  );
}

function PipelineCard({
  pipeline, busy, run,
}: { pipeline: PipelineDto; busy: boolean; run: (fn: () => Promise<unknown>) => Promise<void> }) {
  const { token } = useAuth();
  const [stageName, setStageName] = useState('');
  const stages = [...pipeline.stages].sort((a, b) => a.order - b.order);

  function move(i: number, dir: -1 | 1) {
    const target = i + dir;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[i], reordered[target]] = [reordered[target], reordered[i]];
    run(() => pipelinesApi.reorderStages(pipeline.id, reordered.map((s, idx) => ({ id: s.id, order: idx })), token));
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-[#1D1D1B]">{pipeline.name}</h2>
          {pipeline.isDefault && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-[#DD8005]">
              <Star size={11} fill="#DD8005" /> Padrão
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!pipeline.isDefault && (
            <button onClick={() => run(() => pipelinesApi.update(pipeline.id, { isDefault: true }, token))} disabled={busy} className="text-xs font-medium text-[#147F23] hover:underline">
              Definir padrão
            </button>
          )}
          {!pipeline.isDefault && (
            <button onClick={() => run(() => pipelinesApi.remove(pipeline.id, token))} disabled={busy} className="text-[#878787] hover:text-red-600" aria-label="Excluir funil">
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-1 mb-3">
        {stages.map((s, i) => (
          <StageRow key={s.id} pipelineId={pipeline.id} stage={s} index={i} total={stages.length} busy={busy} run={run} onMove={move} />
        ))}
      </ul>

      <div className="flex items-center gap-1.5">
        <input
          value={stageName}
          onChange={(e) => setStageName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && stageName.trim() && run(async () => { await pipelinesApi.addStage(pipeline.id, { name: stageName.trim(), type: 'OPEN' }, token); setStageName(''); })}
          placeholder="Nova etapa…"
          className="flex-1 max-w-xs text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
        />
        <button
          onClick={() => stageName.trim() && run(async () => { await pipelinesApi.addStage(pipeline.id, { name: stageName.trim(), type: 'OPEN' }, token); setStageName(''); })}
          disabled={busy || !stageName.trim()}
          className="rounded-lg p-1.5 text-white disabled:opacity-40"
          style={{ backgroundColor: '#147F23' }}
          aria-label="Adicionar etapa"
        >
          <Plus size={15} />
        </button>
      </div>
    </section>
  );
}

function StageRow({
  pipelineId, stage, index, total, busy, run, onMove,
}: {
  pipelineId: string; stage: StageDto; index: number; total: number; busy: boolean;
  run: (fn: () => Promise<unknown>) => Promise<void>; onMove: (i: number, dir: -1 | 1) => void;
}) {
  const { token } = useAuth();

  return (
    <li className="flex items-center gap-2 rounded-lg border border-gray-100 px-2 py-1.5">
      <div className="flex flex-col">
        <button onClick={() => onMove(index, -1)} disabled={busy || index === 0} className="text-[#878787] hover:text-[#1D1D1B] disabled:opacity-30" aria-label="Subir"><ChevronUp size={12} /></button>
        <button onClick={() => onMove(index, 1)} disabled={busy || index === total - 1} className="text-[#878787] hover:text-[#1D1D1B] disabled:opacity-30" aria-label="Descer"><ChevronDown size={12} /></button>
      </div>
      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: stage.color ?? '#575756' }} />
      <span className={`flex-1 text-sm ${stage.isActive ? 'text-[#1D1D1B]' : 'text-[#878787] line-through'}`}>{stage.name}</span>

      <select
        value={stage.type}
        onChange={(e) => run(() => pipelinesApi.updateStage(pipelineId, stage.id, { type: e.target.value }, token))}
        className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none"
      >
        {(Object.keys(TYPE_LABELS) as StageType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
      </select>

      <div className="flex items-center gap-1">
        <input
          type="number" min={0} max={100} defaultValue={stage.probability}
          onBlur={(e) => { const v = Number(e.target.value); if (v !== stage.probability) run(() => pipelinesApi.updateStage(pipelineId, stage.id, { probability: v }, token)); }}
          className="w-12 text-[11px] border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
        />
        <span className="text-[10px] text-[#878787]">%</span>
      </div>

      <button
        onClick={() => run(() => pipelinesApi.updateStage(pipelineId, stage.id, { isActive: !stage.isActive }, token))}
        disabled={busy}
        className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${stage.isActive ? 'bg-[#86C175]/20 text-[#156D1D]' : 'bg-gray-100 text-[#878787]'}`}
      >
        {stage.isActive ? 'Ativa' : 'Inativa'}
      </button>

      <button onClick={() => run(() => pipelinesApi.removeStage(pipelineId, stage.id, token))} disabled={busy} className="text-[#878787] hover:text-red-600" aria-label="Excluir etapa">
        <Trash2 size={13} />
      </button>
    </li>
  );
}
