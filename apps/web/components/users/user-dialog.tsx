'use client';
// Client Component: interactive form with controlled dialog state.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import type { UserDto } from '@bioinfood/shared';
import { usersApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const ROLE_OPTIONS: Array<{ value: UserDto['role']; label: string }> = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'APROVA', label: 'Aprova' },
  { value: 'INSERE', label: 'Insere' },
  { value: 'CONSULTA', label: 'Consulta' },
  { value: 'CLIENTE', label: 'Cliente (portal)' },
];

const createSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  email: z.string().min(1, 'E-mail é obrigatório').email('E-mail inválido'),
  password: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
  role: z.enum(['ADMIN', 'APROVA', 'INSERE', 'CONSULTA', 'CLIENTE']),
});

const editSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').max(200),
  role: z.enum(['ADMIN', 'APROVA', 'INSERE', 'CONSULTA', 'CLIENTE']),
  isActive: z.boolean(),
});

type CreateFormData = z.infer<typeof createSchema>;
type EditFormData = z.infer<typeof editSchema>;

interface UserDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user?: UserDto | null;
  onSaved: () => void;
}

export default function UserDialog({ open, onOpenChange, user, onSaved }: UserDialogProps) {
  const { token } = useAuth();
  const [serverError, setServerError] = useState('');
  const isEdit = !!user;

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createSchema),
    defaultValues: { role: 'CONSULTA' },
  });
  const editForm = useForm<EditFormData>({
    resolver: zodResolver(editSchema),
    defaultValues: user
      ? { name: user.name, role: user.role, isActive: user.isActive }
      : { name: '', role: 'CONSULTA', isActive: true },
  });

  // O dialog fica montado e reusado entre usuários — recarrega os campos do
  // form de edição sempre que o usuário selecionado muda (senão o nome fica stale).
  useEffect(() => {
    if (user) {
      editForm.reset({ name: user.name, role: user.role, isActive: user.isActive });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function onSubmitCreate(data: CreateFormData) {
    setServerError('');
    try {
      await usersApi.create(data, token);
      createForm.reset();
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  async function onSubmitEdit(data: EditFormData) {
    if (!user) return;
    setServerError('');
    try {
      await usersApi.update(user.id, data, token);
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  function handleOpenChange(v: boolean) {
    if (!v) {
      createForm.reset();
      editForm.reset();
      setServerError('');
    }
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
        </DialogHeader>

        {isEdit && user ? (
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="edit-name">Nome *</Label>
              <Input id="edit-name" {...editForm.register('name')} />
              {editForm.formState.errors.name && (
                <p className="mt-1 text-xs text-destructive">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="edit-email">E-mail</Label>
              <Input id="edit-email" value={user.email} readOnly disabled />
            </div>

            <div>
              <Label htmlFor="edit-role">Perfil de acesso</Label>
              <Select id="edit-role" {...editForm.register('role')}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                {...editForm.register('isActive')}
                className="h-4 w-4 rounded border-input accent-[hsl(var(--primary))]"
              />
              <span className="text-sm font-medium text-muted-foreground">Usuário ativo</span>
            </label>

            {serverError && <p className="text-xs text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting}>
                {editForm.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="create-name">Nome *</Label>
              <Input id="create-name" {...createForm.register('name')} placeholder="Nome completo" />
              {createForm.formState.errors.name && (
                <p className="mt-1 text-xs text-destructive">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-email">E-mail *</Label>
              <Input
                id="create-email"
                type="email"
                {...createForm.register('email')}
                placeholder="email@bioinfood.com"
              />
              {createForm.formState.errors.email && (
                <p className="mt-1 text-xs text-destructive">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-password">Senha temporária *</Label>
              <Input
                id="create-password"
                type="password"
                {...createForm.register('password')}
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                O usuário será obrigado a trocar essa senha no primeiro login.
              </p>
              {createForm.formState.errors.password && (
                <p className="mt-1 text-xs text-destructive">{createForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="create-role">Perfil de acesso</Label>
              <Select id="create-role" {...createForm.register('role')}>
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </Select>
            </div>

            {serverError && <p className="text-xs text-destructive">{serverError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting}>
                {createForm.formState.isSubmitting ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
