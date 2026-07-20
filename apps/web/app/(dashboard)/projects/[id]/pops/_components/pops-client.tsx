'use client'; // CRUD interativo (dialog de criação, expandir histórico, excluir)

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, FileCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { useAuth } from '@/components/providers/auth-provider';
import { popsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import type { PopDto, PopVersionDto } from '@bioinfood/shared';
import { PopRow } from './pop-row';

const schema = z.object({
  title:       z.string().min(1, 'Título é obrigatório').max(200, 'Título deve ter no máximo 200 caracteres'),
  description: z.string().max(2000, 'Descrição deve ter no máximo 2000 caracteres').optional(),
});
type FormValues = z.infer<typeof schema>;

interface PopsClientProps {
  projectId: string;
  initialPops: PopDto[];
}

export function PopsClient({ projectId, initialPops }: PopsClientProps) {
  const { token } = useAuth();
  const [pops, setPops] = useState<PopDto[]>(initialPops);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const created = await popsApi.create(projectId, values, token);
      setPops((prev) => [
        { id: created.id, projectId: created.projectId, title: created.title, description: created.description, latestVersion: created.latestVersion, createdAt: created.createdAt },
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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">POPs — Procedimentos Operacionais Padrão</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {pops.length} POP{pops.length === 1 ? '' : 's'} cadastrada{pops.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: 'hsl(var(--primary))' }}
        >
          <Plus size={16} /> Nova POP
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        {pops.length === 0 ? (
          <EmptyState
            icon={FileCheck}
            title="Nenhuma POP cadastrada ainda"
            description="Crie o primeiro Procedimento Operacional Padrão deste projeto."
            action={<Button onClick={() => setOpen(true)}><Plus size={14} /> Nova POP</Button>}
          />
        ) : (
          <div className="space-y-2">
            {pops.map((pop) => (
              <PopRow
                key={pop.id}
                projectId={projectId}
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
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Título *</label>
                <input
                  {...register('title')}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none"
                  placeholder="Ex: Limpeza e sanitização de bancada"
                />
                {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1">Descrição</label>
                <textarea
                  {...register('description')}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:border-ring focus:outline-none resize-none"
                  placeholder="Contexto opcional sobre o procedimento…"
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description.message}</p>}
              </div>
              <p className="text-[11px] text-muted-foreground">
                A POP nasce com a versão 1. Anexar o PDF ainda não está disponível — em breve.
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
