'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Check, X, Pencil, Trash2, FolderTree } from 'lucide-react';
import type { StockCategoryDto } from '@bioinfood/shared';
import { stockApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';

export interface CategoryWithCount extends StockCategoryDto {
  itemCount: number;
}

interface Props {
  categories: CategoryWithCount[];
}

export function StockCategoriesClient({ categories }: Props) {
  const { token } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
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
      await stockApi.createCategory(newName.trim(), token);
      setNewName('');
      toast.success('Categoria criada');
    });
  }

  async function saveRename(id: string) {
    if (!editName.trim()) return;
    await run(async () => {
      await stockApi.updateCategory(id, { name: editName.trim() }, token);
      setEditingId(null);
    });
  }

  function toggleActive(cat: CategoryWithCount) {
    run(() => stockApi.updateCategory(cat.id, { isActive: !cat.isActive }, token));
  }

  async function remove(cat: CategoryWithCount) {
    // A exclusão de categoria em uso é bloqueada pelo backend (FK RESTRICT).
    // Antecipamos aqui para não oferecer uma ação que só resultaria em erro.
    if (cat.itemCount > 0) {
      toast.error(
        `"${cat.name}" está em uso por ${cat.itemCount} item(ns). Desative-a em vez de excluir.`,
      );
      return;
    }
    const ok = await confirm({
      title: `Excluir a categoria "${cat.name}"?`,
      description: 'Nenhum item usa esta categoria. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;
    run(async () => {
      await stockApi.removeCategory(cat.id, token);
      toast.success('Categoria excluída');
    });
  }

  return (
    <section className="max-w-xl rounded-xl border border-border bg-card p-4">
      {categories.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <FolderTree size={28} className="text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhuma categoria ainda. Crie a primeira para poder cadastrar itens.
          </p>
        </div>
      ) : (
        <ul className="mb-3 space-y-1">
          {categories.map((cat) => (
            <li
              key={cat.id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              {editingId === cat.id ? (
                <>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(cat.id);
                      if (e.key === 'Escape') setEditingId(null);
                    }}
                    autoFocus
                    aria-label={`Novo nome de ${cat.name}`}
                    className="flex-1 rounded border border-border px-2 py-1 text-sm focus:border-ring focus:outline-none"
                  />
                  <button
                    onClick={() => saveRename(cat.id)}
                    disabled={busy}
                    className="text-primary hover:text-primary-dark"
                    aria-label="Salvar"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Cancelar"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 text-sm ${cat.isActive ? 'text-foreground' : 'text-muted-foreground line-through'}`}
                  >
                    {cat.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {cat.itemCount} {cat.itemCount === 1 ? 'item' : 'itens'}
                  </span>
                  <button
                    onClick={() => { setEditingId(cat.id); setEditName(cat.name); }}
                    className="text-muted-foreground hover:text-foreground"
                    aria-label={`Renomear ${cat.name}`}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => toggleActive(cat)}
                    disabled={busy}
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cat.isActive ? 'bg-success/20 text-primary-dark' : 'bg-muted text-muted-foreground'}`}
                    title={cat.isActive ? 'Ativa — clique para desativar' : 'Inativa — clique para ativar'}
                  >
                    {cat.isActive ? 'Ativa' : 'Inativa'}
                  </button>
                  <button
                    onClick={() => remove(cat)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-destructive disabled:opacity-40"
                    aria-label={`Excluir ${cat.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="Nova categoria… (ex: Insumo, Vidraria)"
          aria-label="Nome da nova categoria"
          className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
        />
        <button
          onClick={add}
          disabled={busy || !newName.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40"
        >
          <Plus size={15} /> Adicionar
        </button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Desative uma categoria para tirá-la das opções de novos itens sem mexer nos que já a usam.
        Só dá para excluir categoria que nenhum item usa.
      </p>
    </section>
  );
}
