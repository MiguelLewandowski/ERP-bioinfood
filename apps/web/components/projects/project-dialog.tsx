'use client';
// Client Component: interactive form with controlled dialog state.

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import type { ProjectDto } from '@bioinfood/shared';
import { projectsApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { OrganizationSelect } from '@/components/shared/organization-select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const schema = z
  .object({
    name: z.string().min(1, 'Nome é obrigatório').max(200, 'Nome deve ter no máximo 200 caracteres'),
    description: z.string().optional(),
    status: z.enum(['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    clientId: z.string().optional(),
  })
  .refine((data) => !data.startDate || !data.endDate || data.endDate >= data.startDate, {
    message: 'A data de fim não pode ser anterior à data de início',
    path: ['endDate'],
  });

type FormData = z.infer<typeof schema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (project: ProjectDto) => void;
}

export default function ProjectDialog({ open, onOpenChange, onCreated }: ProjectDialogProps) {
  const { token } = useAuth();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: 'PLANNING' },
  });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      const payload = {
        ...data,
        startDate: data.startDate || undefined,
        endDate: data.endDate || undefined,
      };
      const project = await projectsApi.create(payload, token);
      reset();
      onCreated(project);
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      reset();
      setServerError('');
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Projeto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="project-name">Nome *</Label>
            <Input id="project-name" {...register('name')} placeholder="Nome do projeto" />
            {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div>
            <Label htmlFor="project-description">Descrição</Label>
            <Textarea
              id="project-description"
              {...register('description')}
              rows={3}
              className="resize-none"
              placeholder="Descreva o projeto..."
            />
          </div>

          <div>
            <Label>Cliente</Label>
            <Controller
              name="clientId"
              control={control}
              render={({ field }) => (
                <OrganizationSelect token={token} value={field.value} onChange={field.onChange} />
              )}
            />
          </div>

          <div>
            <Label htmlFor="project-status">Status</Label>
            <Select id="project-status" {...register('status')}>
              <option value="PLANNING">Planejamento</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="ON_HOLD">Pausado</option>
              <option value="COMPLETED">Concluído</option>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="project-start">Data de início</Label>
              <Input id="project-start" {...register('startDate')} type="date" />
            </div>
            <div>
              <Label htmlFor="project-end">Data de fim</Label>
              <Input id="project-end" {...register('endDate')} type="date" />
              {errors.endDate && <p className="mt-1 text-xs text-destructive">{errors.endDate.message}</p>}
            </div>
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Criando...' : 'Criar Projeto'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
