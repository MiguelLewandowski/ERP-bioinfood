'use client'; // CRUD interativo (dialog de criação, expandir histórico, excluir)

import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import Link from 'next/link';
import { Plus, FileCheck, Search, X, SlidersHorizontal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/providers/auth-provider';
import { popsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import type { PopCategoryDto, PopDto, PopVersionDto } from '@bioinfood/shared';
import { PopRow } from './pop-row';

const schema = z.object({
  title:       z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
  categoryId:  z.string().min(1, 'Escolha uma categoria'),
  // Vazio vira undefined no submit — string vazia falharia o @IsUrl do backend.
  fileUrl: z.union([
    z.literal(''),
    z.string().url('Informe um link válido, começando com https://'),
  ]).optional(),
});
type FormValues = z.infer<typeof schema>;

interface PopsClientProps {
  initialPops: PopDto[];
  categories: PopCategoryDto[];
}

export function PopsClient({ initialPops, categories }: PopsClientProps) {
  const { token, session } = useAuth();
  const isAdmin = session.role === 'ADMIN';
  const [pops, setPops] = useState<PopDto[]>(initialPops);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const activeCategories = categories.filter((c) => c.isActive);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  // Filtro local: o catálogo é pequeno e cabe inteiro na tela, então filtrar em
  // memória responde instantâneo. A API também aceita search/categoryId, para
  // quando o volume passar do teto de 100 da listagem.
  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pops.filter((p) => {
      if (categoryId && p.category?.id !== categoryId) return false;
      if (!term) return true;
      return (
        p.title.toLowerCase().includes(term)
        || (p.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [pops, search, categoryId]);

  const countByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pops) {
      if (p.category) map.set(p.category.id, (map.get(p.category.id) ?? 0) + 1);
    }
    return map;
  }, [pops]);

  const isFiltering = search.trim() !== '' || categoryId !== null;

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const created = await popsApi.create({
        title: values.title,
        description: values.description || undefined,
        categoryId: values.categoryId,
        fileUrl: values.fileUrl || undefined,
      }, token);
      setPops((prev) => [
        {
          id: created.id,
          title: created.title,
          description: created.description,
          category: created.category,
          latestVersion: created.latestVersion,
          createdAt: created.createdAt,
        },
        ...prev,
      ]);
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function handleDeleted(id: string) {
    setPops((prev) => prev.filter((p) => p.id !== id));
  }

  function handleVersionCreated(id: string, latestVersion: PopVersionDto) {
    setPops((prev) => prev.map((p) => (p.id === id ? { ...p, latestVersion } : p)));
  }

  function clearFilters() {
    setSearch('');
    setCategoryId(null);
  }

  return (
    <div className="p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">POPs — Procedimentos Operacionais Padrão</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pops.length} POP{pops.length === 1 ? '' : 's'} no catálogo global, usado por qualquer projeto
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/pops/config"
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <SlidersHorizontal size={15} /> Categorias
            </Link>
          )}
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Plus size={16} /> Nova POP
          </button>
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
            aria-label="Buscar POP por nome"
            placeholder="Buscar por nome…"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-ring focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip active={categoryId === null} onClick={() => setCategoryId(null)}>
            Todas <span className="opacity-60">{pops.length}</span>
          </FilterChip>
          {activeCategories.map((c) => (
            <FilterChip
              key={c.id}
              active={categoryId === c.id}
              onClick={() => setCategoryId(categoryId === c.id ? null : c.id)}
            >
              {c.name} <span className="opacity-60">{countByCategory.get(c.id) ?? 0}</span>
            </FilterChip>
          ))}
        </div>

        {isFiltering && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <X size={12} /> Limpar
          </button>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        {pops.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="Nenhuma POP cadastrada ainda"
            description="Crie o primeiro Procedimento Operacional Padrão do catálogo."
            action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Nova POP</Button>}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Search}
            title="Nenhuma POP encontrada"
            description="Nenhum procedimento bate com a busca e os filtros atuais."
            action={<Button variant="outline" onClick={clearFilters}>Limpar filtros</Button>}
          />
        ) : (
          <div className="space-y-2">
            {visible.map((pop) => (
              <PopRow
                key={pop.id}
                pop={pop}
                onDeleted={handleDeleted}
                onVersionCreated={handleVersionCreated}
              />
            ))}
          </div>
        )}
      </div>

      {open && (
        <Dialog open onOpenChange={(v) => !v && setOpen(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <FileCheck size={16} className="text-primary" /> Nova POP
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="pop-title" className="mb-1 block text-xs font-semibold text-muted-foreground">Título *</label>
                <input
                  id="pop-title"
                  {...register('title')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  placeholder="Ex: Limpeza e sanitização de bancada"
                />
                {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>}
              </div>

              <div>
                <label htmlFor="pop-category" className="mb-1 block text-xs font-semibold text-muted-foreground">Categoria *</label>
                <select
                  id="pop-category"
                  {...register('categoryId')}
                  defaultValue=""
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-ring focus:outline-none"
                >
                  <option value="" disabled>Selecione a categoria…</option>
                  {activeCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.categoryId && <p className="mt-1 text-xs text-red-500">{errors.categoryId.message}</p>}
                {activeCategories.length === 0 && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Nenhuma categoria ativa — um administrador precisa cadastrar uma antes.
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="pop-description" className="mb-1 block text-xs font-semibold text-muted-foreground">Descrição</label>
                <textarea
                  id="pop-description"
                  {...register('description')}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  placeholder="Contexto opcional sobre o procedimento…"
                />
                {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>}
              </div>

              <div>
                <label htmlFor="pop-file-url" className="mb-1 block text-xs font-semibold text-muted-foreground">Link do documento</label>
                <input
                  id="pop-file-url"
                  {...register('fileUrl')}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-ring focus:outline-none"
                  placeholder="https://drive.google.com/…"
                />
                {errors.fileUrl && <p className="mt-1 text-xs text-red-500">{errors.fileUrl.message}</p>}
              </div>

              <p className="text-[11px] text-muted-foreground">
                A POP nasce com a versão 1. O upload de PDF entra quando o storage estiver configurado —
                por enquanto, aponte para o arquivo no Drive.
              </p>

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

function FilterChip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-white'
          : 'border-gray-200 bg-white text-muted-foreground hover:bg-gray-50',
      )}
    >
      {children}
    </button>
  );
}
