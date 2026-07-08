'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, ChevronUp, ChevronDown, Check, X, Pencil } from 'lucide-react';
import type { TaxonomyDto, TaxonomyKind } from '@bioinfood/shared';
import { taxonomiesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

interface TaxonomiasClientProps {
  sectors: TaxonomyDto[];
  sources: TaxonomyDto[];
  engagementStages: TaxonomyDto[];
}

export function TaxonomiasClient({ sectors, sources, engagementStages }: TaxonomiasClientProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <TaxonomyList kind="sectors" title="Setores" items={sectors} />
      <TaxonomyList kind="sources" title="Origens" items={sources} />
      <TaxonomyList kind="engagement-stages" title="Escada de engajamento" items={engagementStages} />
    </div>
  );
}

function TaxonomyList({ kind, title, items }: { kind: TaxonomyKind; title: string; items: TaxonomyDto[] }) {
  const { token } = useAuth();
  const router = useRouter();
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    if (!newName.trim()) return;
    await run(async () => {
      await taxonomiesApi.create(kind, newName.trim(), token);
      setNewName('');
    });
  }

  async function saveRename(id: string) {
    if (!editName.trim()) return;
    await run(async () => {
      await taxonomiesApi.update(kind, id, { name: editName.trim() }, token);
      setEditingId(null);
    });
  }

  function toggleActive(item: TaxonomyDto) {
    run(() => taxonomiesApi.update(kind, item.id, { isActive: !item.isActive }, token));
  }

  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    run(() => taxonomiesApi.reorder(kind, reordered.map((it, i) => ({ id: it.id, order: i })), token));
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-bold text-[#1D1D1B] mb-3">{title}</h2>

      <ul className="space-y-1 mb-3">
        {items.length === 0 && <li className="text-xs text-[#878787] py-2">Nenhum item.</li>}
        {items.map((item, i) => (
          <li key={item.id} className="flex items-center gap-1 rounded-lg border border-gray-100 px-2 py-1.5">
            <div className="flex flex-col">
              <button onClick={() => move(i, -1)} disabled={busy || i === 0} className="text-[#878787] hover:text-[#1D1D1B] disabled:opacity-30" aria-label="Mover para cima">
                <ChevronUp size={12} />
              </button>
              <button onClick={() => move(i, 1)} disabled={busy || i === items.length - 1} className="text-[#878787] hover:text-[#1D1D1B] disabled:opacity-30" aria-label="Mover para baixo">
                <ChevronDown size={12} />
              </button>
            </div>

            {editingId === item.id ? (
              <>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveRename(item.id)}
                  autoFocus
                  className="flex-1 text-sm px-2 py-1 border border-gray-200 rounded focus:border-[#52B552] focus:outline-none"
                />
                <button onClick={() => saveRename(item.id)} className="text-[#147F23]" aria-label="Salvar"><Check size={15} /></button>
                <button onClick={() => setEditingId(null)} className="text-[#878787]" aria-label="Cancelar"><X size={15} /></button>
              </>
            ) : (
              <>
                <span className={`flex-1 text-sm ${item.isActive ? 'text-[#1D1D1B]' : 'text-[#878787] line-through'}`}>
                  {item.name}
                </span>
                <button
                  onClick={() => { setEditingId(item.id); setEditName(item.name); }}
                  className="text-[#878787] hover:text-[#1D1D1B]"
                  aria-label="Renomear"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => toggleActive(item)}
                  disabled={busy}
                  className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${item.isActive ? 'bg-[#86C175]/20 text-[#156D1D]' : 'bg-gray-100 text-[#878787]'}`}
                >
                  {item.isActive ? 'Ativo' : 'Inativo'}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-1.5">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Novo item…"
          className="flex-1 text-sm px-2.5 py-1.5 border border-gray-200 rounded-lg focus:border-[#52B552] focus:outline-none"
        />
        <button
          onClick={add}
          disabled={busy || !newName.trim()}
          className="rounded-lg p-1.5 text-white disabled:opacity-40"
          style={{ backgroundColor: '#147F23' }}
          aria-label="Adicionar"
        >
          <Plus size={15} />
        </button>
      </div>
    </section>
  );
}
