'use client';
// Client Component: interactive form with controlled dialog state.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
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

const schema = z
  .object({
    newPassword: z.string().min(6, 'A senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserDto;
  onReset: () => void;
}

export default function ResetPasswordDialog({ open, onOpenChange, user, onReset }: ResetPasswordDialogProps) {
  const { token } = useAuth();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await usersApi.resetPassword(user.id, data.newPassword, token);
      toast.success('Senha redefinida. O usuário precisará trocá-la no próximo login.');
      reset();
      onReset();
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resetar senha de {user.name}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="new-password">Nova senha temporária *</Label>
            <Input id="new-password" type="password" {...register('newPassword')} placeholder="••••••••" />
            {errors.newPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirm-password">Confirmar nova senha *</Label>
            <Input id="confirm-password" type="password" {...register('confirmPassword')} placeholder="••••••••" />
            {errors.confirmPassword && (
              <p className="mt-1 text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            O usuário será desconectado de todas as sessões ativas e precisará trocar a senha no próximo login.
          </p>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
