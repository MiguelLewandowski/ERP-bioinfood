'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft, Plus, Star, Trash2, ChevronUp, ChevronDown, ChevronRight, Pencil, Check, X,
} from 'lucide-react';
import type { PipelineDto, StageDto, StageType } from '@bioinfood/shared';
import { pipelinesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Sigla de 3 letras usada no rail de troca de funil do kanban.
function suggestAbbreviation(name: string): string {
  return name.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').slice(0, 3).toUpperCase();
}

const TYPE_LABELS: Record<StageType, string> = { OPEN: 'Aberta', WON: 'Ganho', LOST: 'Perdido' };

// New pipelines start with a usable OPEN → WON → LOST skeleton.
// Cores de etapa são dados persistidos (config do usuário), não tokens do tema.
const DEFAULT_STAGES = [
  { name: 'Novo', type: 'OPEN', probability: 10, color: 'hsl(var(--muted-foreground))' },
  { name: 'Em andamento', type: 'OPEN', probability: 50, color: 'hsl(var(--accent))' },
  { name: 'Ganho', type: 'WON', probability: 100, color: 'hsl(var(--primary-dark))' },
  { name: 'Perdido', type: 'LOST', probability: 0, color: '#C0392B' },
];

export function FunisClient({ pipelines }: { pipelines: PipelineDto[] }) {
  const { token } = useAuth();
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [newAbbr, setNewAbbr] = useState('');
  const [abbrTouched, setAbbrTouched] = useState(false);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); router.refresh(); }
    catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBusy(false); }
  }

  function onNameChange(value: string) {
    setNewName(value);
    if (!abbrTouched) setNewAbbr(suggestAbbreviation(value));
  }

  async function createPipeline() {
    if (!newName.trim() || newAbbr.length !== 3) return;
    await run(async () => {
      await pipelinesApi.create({ name: newName.trim(), abbreviation: newAbbr, stages: DEFAULT_STAGES }, token);
      setNewName('');
      setNewAbbr('');
      setAbbrTouched(false);
    });
  }

  return (
    <div className="space-y-6">
      <Link
        href="/crm?tab=negocios"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft size={14} /> Voltar para o CRM
      </Link>

      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => onNameChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createPipeline()}
          placeholder="Nome do novo funil (ex: Licenciamento)"
          className="max-w-sm"
        />
        <Input
          value={newAbbr}
          onChange={(e) => { setAbbrTouched(true); setNewAbbr(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').slice(0, 3).toUpperCase()); }}
          onKeyDown={(e) => e.key === 'Enter' && createPipeline()}
          placeholder="Sigla"
          maxLength={3}
          className="w-20 text-center uppercase"
          aria-label="Sigla do novo funil (3 letras)"
        />
        <Button onClick={createPipeline} disabled={busy || !newName.trim() || newAbbr.length !== 3}>
          <Plus size={15} /> Criar funil
        </Button>
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
  const [expanded, setExpanded] = useState(false);
  const [stageName, setStageName] = useState('');
  const [editingAbbr, setEditingAbbr] = useState(false);
  const [abbrDraft, setAbbrDraft] = useState(pipeline.abbreviation);
  const stages = [...pipeline.stages].sort((a, b) => a.order - b.order);

  function move(i: number, dir: -1 | 1) {
    const target = i + dir;
    if (target < 0 || target >= stages.length) return;
    const reordered = [...stages];
    [reordered[i], reordered[target]] = [reordered[target], reordered[i]];
    run(() => pipelinesApi.reorderStages(pipeline.id, reordered.map((s, idx) => ({ id: s.id, order: idx })), token));
  }

  function addStage() {
    if (!stageName.trim()) return;
    run(async () => {
      await pipelinesApi.addStage(pipeline.id, { name: stageName.trim(), type: 'OPEN' }, token);
      setStageName('');
    });
  }

  async function saveAbbr() {
    if (abbrDraft.length !== 3) return;
    await run(() => pipelinesApi.update(pipeline.id, { abbreviation: abbrDraft }, token));
    setEditingAbbr(false);
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground"
            aria-label={expanded ? 'Recolher funil' : 'Expandir funil'}
          >
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>

          <h2 className="text-sm font-bold text-foreground">{pipeline.name}</h2>

          {editingAbbr ? (
            <div className="flex items-center gap-1">
              <input
                value={abbrDraft}
                onChange={(e) => setAbbrDraft(e.target.value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '').slice(0, 3).toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && saveAbbr()}
                maxLength={3}
                autoFocus
                className="w-14 rounded border border-input px-1.5 py-0.5 text-center text-[11px] font-semibold uppercase focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <button onClick={saveAbbr} className="text-primary" aria-label="Salvar sigla"><Check size={14} /></button>
              <button onClick={() => { setEditingAbbr(false); setAbbrDraft(pipeline.abbreviation); }} className="text-muted-foreground" aria-label="Cancelar"><X size={14} /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditingAbbr(true)}
              className="inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              aria-label="Editar sigla do funil"
            >
              {pipeline.abbreviation || '—'} <Pencil size={10} />
            </button>
          )}

          {pipeline.isDefault && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent">
              <Star size={11} className="fill-current" /> Padrão
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!pipeline.isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => run(() => pipelinesApi.update(pipeline.id, { isDefault: true }, token))}
              disabled={busy}
            >
              <Star size={13} /> Definir padrão
            </Button>
          )}
          {!pipeline.isDefault && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => run(() => pipelinesApi.remove(pipeline.id, token))}
              disabled={busy}
              className="hover:text-destructive"
              aria-label="Excluir funil"
            >
              <Trash2 size={15} />
            </Button>
          )}
        </div>
      </div>

      {expanded && (
        <>
          <ul className="mb-3 space-y-1">
            {stages.map((s, i) => (
              <StageRow key={s.id} pipelineId={pipeline.id} stage={s} index={i} total={stages.length} busy={busy} run={run} onMove={move} />
            ))}
          </ul>

          <div className="flex items-center gap-1.5">
            <Input
              value={stageName}
              onChange={(e) => setStageName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStage()}
              placeholder="Nova etapa…"
              className="max-w-xs px-2.5 py-1.5"
            />
            <Button size="icon" onClick={addStage} disabled={busy || !stageName.trim()} aria-label="Adicionar etapa">
              <Plus size={15} />
            </Button>
          </div>
        </>
      )}
    </Card>
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
    <li className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5">
      <div className="flex flex-col">
        <button
          onClick={() => onMove(index, -1)}
          disabled={busy || index === 0}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Subir"
        >
          <ChevronUp size={12} />
        </button>
        <button
          onClick={() => onMove(index, 1)}
          disabled={busy || index === total - 1}
          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
          aria-label="Descer"
        >
          <ChevronDown size={12} />
        </button>
      </div>
      {/* Cor da etapa é dado do usuário, não token do tema. */}
      <span
        className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground"
        style={stage.color ? { backgroundColor: stage.color } : undefined}
      />
      <span className={`flex-1 text-sm ${stage.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
        {stage.name}
      </span>

      <select
        value={stage.type}
        onChange={(e) => run(() => pipelinesApi.updateStage(pipelineId, stage.id, { type: e.target.value }, token))}
        className="rounded border border-input px-1.5 py-0.5 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {(Object.keys(TYPE_LABELS) as StageType[]).map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
      </select>

      <div className="flex items-center gap-1">
        <input
          type="number" min={0} max={100} defaultValue={stage.probability}
          onBlur={(e) => { const v = Number(e.target.value); if (v !== stage.probability) run(() => pipelinesApi.updateStage(pipelineId, stage.id, { probability: v }, token)); }}
          className="w-12 rounded border border-input px-1 py-0.5 text-[11px] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <span className="text-[10px] text-muted-foreground">%</span>
      </div>

      <button
        onClick={() => run(() => pipelinesApi.updateStage(pipelineId, stage.id, { isActive: !stage.isActive }, token))}
        disabled={busy}
        className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Badge variant={stage.isActive ? 'success' : 'neutral'} className="text-[10px]">
          {stage.isActive ? 'Ativa' : 'Inativa'}
        </Badge>
      </button>

      <button
        onClick={() => run(() => pipelinesApi.removeStage(pipelineId, stage.id, token))}
        disabled={busy}
        className="text-muted-foreground hover:text-destructive"
        aria-label="Excluir etapa"
      >
        <Trash2 size={13} />
      </button>
    </li>
  );
}
