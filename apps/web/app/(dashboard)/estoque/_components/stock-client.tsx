'use client'; // CRUD interativo (dialog, busca, filtros, exclusão)

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import {
  Plus, Package, Search, X, SlidersHorizontal, Pencil, Trash2, MapPin, Hash,
} from 'lucide-react';
import {
  STOCK_ITEM_STATUSES, STOCK_ITEM_STATUS_LABELS,
  type StockCategoryDto, type StockItemDto, type StockItemStatus,
} from '@bioinfood/shared';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { stockApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

const schema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
  categoryId: z.string().min(1, 'Escolha uma categoria'),
  code: z.string().max(60, 'Código deve ter no máximo 60 caracteres').optional(),
  // `type="number"` já barra texto no navegador; o coerce cuida do "" que o
  // campo vazio devolve como string.
  quantity: z.coerce.number().int('Use um número inteiro').min(0, 'Não pode ser negativo'),
  unit: z.string().max(20).optional(),
  location: z.string().max(200).optional(),
  status: z.enum(STOCK_ITEM_STATUSES),
  notes: z.string().max(2000).optional(),
});
type FormValues = z.infer<typeof schema>;

/** Cor por situação. Só token semântico — a reforma de UX zerou hex cru. */
const STATUS_STYLE: Record<StockItemStatus, string> = {
  ACTIVE: 'bg-success/15 text-primary-dark',
  MAINTENANCE: 'bg-accent/15 text-accent',
  RETIRED: 'bg-muted text-muted-foreground',
};

interface StockClientProps {
  initialItems: StockItemDto[];
  categories: StockCategoryDto[];
}

export function StockClient({ initialItems, categories }: StockClientProps) {
  const { token, session } = useAuth();
  const confirm = useConfirm();
  const isAdmin = session.role === 'ADMIN';

  const [items, setItems] = useState<StockItemDto[]>(initialItems);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StockItemDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const activeCategories = categories.filter((c) => c.isActive);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Filtro em memória: o cadastro da casa é pequeno e cabe inteiro na tela,
  // então responde instantâneo. A API também aceita os mesmos filtros, para
  // quando o volume passar do teto de 500 da listagem.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((i) => {
      if (categoryId && i.category.id !== categoryId) return false;
      if (status && i.status !== status) return false;
      if (!term) return true;
      return (
        i.name.toLowerCase().includes(term)
        || (i.code ?? '').toLowerCase().includes(term)
        || (i.location ?? '').toLowerCase().includes(term)
      );
    });
  }, [items, search, categoryId, status]);

  // Agrupado por categoria: é como o cadastro é lido ("o que temos de
  // equipamento?"), e é a mesma forma que a checklist do TAP usa.
  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; items: StockItemDto[] }>();
    for (const item of visible) {
      const entry = map.get(item.category.id) ?? { name: item.category.name, items: [] };
      entry.items.push(item);
      map.set(item.category.id, entry);
    }
    return [...map.entries()];
  }, [visible]);

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) map.set(i.category.id, (map.get(i.category.id) ?? 0) + 1);
    return map;
  }, [items]);

  const isFiltering = search.trim() !== '' || categoryId !== null || status !== null;

  function openCreate() {
    setEditing(null);
    reset({
      name: '', categoryId: activeCategories[0]?.id ?? '', code: '',
      quantity: 1, unit: '', location: '', status: 'ACTIVE', notes: '',
    });
    setOpen(true);
  }

  function openEdit(item: StockItemDto) {
    setEditing(item);
    reset({
      name: item.name,
      categoryId: item.categoryId,
      code: item.code ?? '',
      quantity: item.quantity,
      unit: item.unit ?? '',
      location: item.location ?? '',
      status: (item.status as StockItemStatus) ?? 'ACTIVE',
      notes: item.notes ?? '',
    });
    setOpen(true);
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        categoryId: values.categoryId,
        code: values.code || null,
        quantity: values.quantity,
        unit: values.unit || null,
        location: values.location || null,
        status: values.status,
        notes: values.notes || null,
      };

      if (editing) {
        const updated = await stockApi.updateItem(editing.id, payload, token);
        setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
        toast.success('Item atualizado');
      } else {
        const created = await stockApi.createItem(payload, token);
        setItems((prev) => [...prev, created]);
        toast.success('Item cadastrado');
      }
      setOpen(false);
      setEditing(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: StockItemDto) {
    const ok = await confirm({
      title: `Excluir "${item.name}"?`,
      description: 'O item sai do cadastro. Se ele já estiver na checklist de algum projeto, a exclusão é bloqueada — nesse caso, marque-o como "Aposentado".',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;

    try {
      await stockApi.removeItem(item.id, token);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      toast.success('Item excluído');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  function clearFilters() {
    setSearch('');
    setCategoryId(null);
    setStatus(null);
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Estoque</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? 'item cadastrado' : 'itens cadastrados'} — o que a
            Bioinfood tem e usa nos projetos
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/estoque/config"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SlidersHorizontal size={15} /> Categorias
            </Link>
          )}
          <Button onClick={openCreate}>
            <Plus size={16} /> Novo item
          </Button>
        </div>
      </div>

      {/* ── Busca e filtros ── */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar item por nome, código ou local"
            placeholder="Buscar por nome, código ou local…"
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-ring focus:outline-none"
          />
        </div>

        <Select
          aria-label="Filtrar por categoria"
          value={categoryId ?? ''}
          onChange={(e) => setCategoryId(e.target.value || null)}
          className="w-auto min-w-[10rem]"
        >
          <option value="">Todas as categorias ({items.length})</option>
          {activeCategories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({countByCategory.get(c.id) ?? 0})
            </option>
          ))}
        </Select>

        <Select
          aria-label="Filtrar por situação"
          value={status ?? ''}
          onChange={(e) => setStatus(e.target.value || null)}
          className="w-auto min-w-[9rem]"
        >
          <option value="">Todas as situações</option>
          {STOCK_ITEM_STATUSES.map((s) => (
            <option key={s} value={s}>{STOCK_ITEM_STATUS_LABELS[s]}</option>
          ))}
        </Select>

        {isFiltering && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        {items.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum item cadastrado ainda"
            description="Cadastre os equipamentos da Bioinfood para poder marcá-los na checklist de recursos dos projetos."
            action={<Button onClick={openCreate}><Plus size={14} /> Novo item</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhum item encontrado"
            description="Nenhum item bate com a busca e os filtros atuais."
            action={<Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}
          />
        ) : (
          <div className="space-y-5">
            {grouped.map(([id, group]) => (
              <section key={id}>
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {group.name}{' '}
                  <span className="font-medium normal-case">({group.items.length})</span>
                </h2>
                <div className="space-y-2">
                  {group.items.map((item) => (
                    <StockRow
                      key={item.id}
                      item={item}
                      onEdit={() => openEdit(item)}
                      onDelete={() => handleDelete(item)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {open && (
        <Dialog open onOpenChange={(v) => { if (!v) { setOpen(false); setEditing(null); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Package size={16} className="text-primary" />
                {editing ? 'Editar item' : 'Novo item'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="stock-name" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Nome *
                </label>
                <input
                  id="stock-name"
                  {...register('name')}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  placeholder="Ex: Autoclave vertical 75 L"
                />
                {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="stock-category" className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Categoria *
                  </label>
                  <Select id="stock-category" {...register('categoryId')}>
                    <option value="" disabled>Selecione…</option>
                    {activeCategories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </Select>
                  {errors.categoryId && (
                    <p className="mt-1 text-xs text-destructive">{errors.categoryId.message}</p>
                  )}
                  {activeCategories.length === 0 && (
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      Nenhuma categoria ativa.{' '}
                      {isAdmin ? (
                        <Link href="/estoque/config" className="text-primary underline">
                          Cadastre uma
                        </Link>
                      ) : 'Peça a um administrador para cadastrar.'}
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="stock-status" className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Situação
                  </label>
                  <Select id="stock-status" {...register('status')}>
                    {STOCK_ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>{STOCK_ITEM_STATUS_LABELS[s]}</option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="stock-code" className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Patrimônio
                  </label>
                  <input
                    id="stock-code"
                    {...register('code')}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
                    placeholder="BIO-0042"
                  />
                  {errors.code && <p className="mt-1 text-xs text-destructive">{errors.code.message}</p>}
                </div>
                <div>
                  <label htmlFor="stock-quantity" className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Quantidade
                  </label>
                  <input
                    id="stock-quantity"
                    type="number"
                    min={0}
                    {...register('quantity')}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-xs text-destructive">{errors.quantity.message}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="stock-unit" className="mb-1 block text-xs font-semibold text-muted-foreground">
                    Unidade
                  </label>
                  <input
                    id="stock-unit"
                    {...register('unit')}
                    className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
                    placeholder="un, kg, L"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="stock-location" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Localização
                </label>
                <input
                  id="stock-location"
                  {...register('location')}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  placeholder="Ex: Lab 2 — bancada 3"
                />
              </div>

              <div>
                <label htmlFor="stock-notes" className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Observações
                </label>
                <textarea
                  id="stock-notes"
                  {...register('notes')}
                  rows={2}
                  className="w-full resize-y rounded-lg border border-border px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  placeholder="Calibração, restrições de uso, número de série…"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setOpen(false); setEditing(null); }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando…' : editing ? 'Salvar' : 'Cadastrar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function StockRow({
  item, onEdit, onDelete,
}: {
  item: StockItemDto;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const status = (item.status as StockItemStatus) ?? 'ACTIVE';

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 transition-colors hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-foreground">{item.name}</span>
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-semibold',
              STATUS_STYLE[status] ?? STATUS_STYLE.ACTIVE,
            )}
          >
            {STOCK_ITEM_STATUS_LABELS[status] ?? item.status}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          {item.code && (
            <span className="flex items-center gap-1">
              <Hash size={11} /> {item.code}
            </span>
          )}
          {item.location && (
            <span className="flex items-center gap-1">
              <MapPin size={11} /> {item.location}
            </span>
          )}
          <span>
            {item.quantity} {item.unit ?? (item.quantity === 1 ? 'unidade' : 'unidades')}
          </span>
        </div>
      </div>

      {/* Sempre no DOM (só invisíveis) — some no hover quebraria teclado. */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <button
          type="button"
          onClick={onEdit}
          title={`Editar ${item.name}`}
          aria-label={`Editar ${item.name}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          title={`Excluir ${item.name}`}
          aria-label={`Excluir ${item.name}`}
          className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
