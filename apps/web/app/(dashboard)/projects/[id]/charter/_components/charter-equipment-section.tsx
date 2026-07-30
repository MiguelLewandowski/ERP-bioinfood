'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Package, Plus, X, Search, ExternalLink } from 'lucide-react';
import {
  STOCK_ITEM_STATUS_LABELS,
  type CharterEquipmentDto,
  type StockItemDto,
  type StockItemStatus,
} from '@bioinfood/shared';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/components/providers/auth-provider';
import { charterEquipmentApi, stockApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

/**
 * Checklist de recursos do projeto, puxada do cadastro de estoque.
 *
 * `checked` significa "já providenciado" — planejamento, não alocação. Não há
 * reserva nem janela de uso, então dois projetos podem declarar o mesmo
 * equipamento sem conflito. Foi a decisão que manteve o módulo de estoque
 * básico.
 */
interface Props {
  projectId: string;
  canEdit: boolean;
  /** As linhas vivem no `charter-client` — ver o comentário do estado lá. */
  rows: CharterEquipmentDto[];
  onChange: (rows: CharterEquipmentDto[]) => void;
}

export function CharterEquipmentSection({ projectId, canEdit, rows, onChange }: Props) {
  const { token } = useAuth();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [catalog, setCatalog] = useState<StockItemDto[] | null>(null);
  const [search, setSearch] = useState('');

  // Catálogo só é buscado quando o seletor abre — a maioria das visitas ao TAP
  // nunca abre, e são até 500 itens.
  async function openPicker() {
    setPickerOpen(true);
    if (catalog !== null) return;
    try {
      setCatalog(await stockApi.listItems(token));
    } catch (err) {
      toast.error(getErrorMessage(err));
      setCatalog([]);
    }
  }

  async function addItem(item: StockItemDto) {
    try {
      const created = await charterEquipmentApi.add(projectId, item.id, token);
      // O endpoint é idempotente: se o item já estava, devolve o vínculo
      // existente. Filtrar pelo id evita duplicar a linha na tela.
      onChange([...rows.filter((r) => r.id !== created.id), created]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function toggle(row: CharterEquipmentDto) {
    // Otimista: o clique responde na hora e volta atrás se a API recusar.
    const next = !row.checked;
    onChange(rows.map((r) => (r.id === row.id ? { ...r, checked: next } : r)));
    try {
      await charterEquipmentApi.update(projectId, row.id, { checked: next }, token);
    } catch (err) {
      onChange(rows.map((r) => (r.id === row.id ? { ...r, checked: row.checked } : r)));
      toast.error(getErrorMessage(err));
    }
  }

  async function removeRow(row: CharterEquipmentDto) {
    const before = rows;
    onChange(rows.filter((r) => r.id !== row.id));
    try {
      await charterEquipmentApi.remove(projectId, row.id, token);
    } catch (err) {
      onChange(before);
      toast.error(getErrorMessage(err));
    }
  }

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; rows: CharterEquipmentDto[] }>();
    for (const row of rows) {
      const cat = row.item.category;
      const entry = map.get(cat.id) ?? { name: cat.name, rows: [] };
      entry.rows.push(row);
      map.set(cat.id, entry);
    }
    return [...map.entries()];
  }, [rows]);

  const done = rows.filter((r) => r.checked).length;
  const linkedIds = new Set(rows.map((r) => r.stockItemId));

  const availableCatalog = useMemo(() => {
    if (!catalog) return [];
    const term = search.trim().toLowerCase();
    return catalog.filter((i) => {
      if (linkedIds.has(i.id)) return false;
      if (!term) return true;
      return (
        i.name.toLowerCase().includes(term)
        || (i.code ?? '').toLowerCase().includes(term)
        || i.category.name.toLowerCase().includes(term)
      );
    });
  }, [catalog, search, rows]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="block text-sm font-semibold text-foreground">
          Equipamentos e materiais
          {rows.length > 0 && (
            <span className="ml-2 text-xs font-medium text-muted-foreground">
              {done} de {rows.length} providenciado{done === 1 ? '' : 's'}
            </span>
          )}
        </label>
        {canEdit && (
          <Button type="button" variant="outline" size="sm" onClick={openPicker}>
            <Plus size={14} /> Adicionar
          </Button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
          <Package size={22} className="mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum equipamento declarado para este projeto.
          </p>
          {canEdit && (
            <p className="mt-1 text-xs text-muted-foreground">
              Marque o que o projeto vai precisar, a partir do{' '}
              <Link href="/estoque" className="text-primary underline">cadastro de estoque</Link>.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-lg border border-border p-3">
          {grouped.map(([id, group]) => (
            <div key={id}>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {group.name}
              </p>
              <ul className="space-y-1">
                {group.rows.map((row) => (
                  <li key={row.id} className="group flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`equip-${row.id}`}
                      checked={row.checked}
                      disabled={!canEdit}
                      onChange={() => toggle(row)}
                      className="h-4 w-4 shrink-0 rounded border-gray-300 accent-[hsl(var(--primary))] disabled:opacity-50"
                    />
                    <label
                      htmlFor={`equip-${row.id}`}
                      className={cn(
                        'min-w-0 flex-1 cursor-pointer text-sm',
                        row.checked ? 'text-muted-foreground line-through' : 'text-foreground',
                        !canEdit && 'cursor-default',
                      )}
                    >
                      <span className="truncate">{row.item.name}</span>
                      {row.item.code && (
                        <span className="ml-2 text-xs text-muted-foreground">{row.item.code}</span>
                      )}
                      {/* Situação só aparece quando NÃO é "disponível": um item
                          em manutenção muda o planejamento, e o usuário precisa
                          ver isso sem sair do TAP. */}
                      {row.item.status !== 'ACTIVE' && (
                        <span className="ml-2 rounded-full bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          {STOCK_ITEM_STATUS_LABELS[row.item.status as StockItemStatus] ?? row.item.status}
                        </span>
                      )}
                    </label>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => removeRow(row)}
                        title={`Tirar ${row.item.name} da lista`}
                        aria-label={`Tirar ${row.item.name} da lista`}
                        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {pickerOpen && (
        <Dialog open onOpenChange={(v) => { if (!v) { setPickerOpen(false); setSearch(''); } }}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Package size={16} className="text-primary" /> Adicionar do cadastro
              </DialogTitle>
            </DialogHeader>

            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
                aria-label="Buscar no cadastro de estoque"
                placeholder="Buscar por nome, patrimônio ou categoria…"
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm focus:border-ring focus:outline-none"
              />
            </div>

            <div className="max-h-80 overflow-y-auto">
              {catalog === null ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Carregando…</p>
              ) : availableCatalog.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {catalog.length === 0
                      ? 'Nenhum item no cadastro de estoque ainda.'
                      : search.trim()
                        ? 'Nada bate com a busca.'
                        : 'Todos os itens do cadastro já estão nesta lista.'}
                  </p>
                  {catalog.length === 0 && (
                    <Link
                      href="/estoque"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary underline"
                    >
                      Cadastrar equipamentos <ExternalLink size={11} />
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="space-y-1">
                  {availableCatalog.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => addItem(item)}
                        className="flex w-full items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.category.name}
                            {item.code ? ` · ${item.code}` : ''}
                            {item.location ? ` · ${item.location}` : ''}
                          </p>
                        </div>
                        <Plus size={14} className="shrink-0 text-primary" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => { setPickerOpen(false); setSearch(''); }}
              >
                Fechar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
