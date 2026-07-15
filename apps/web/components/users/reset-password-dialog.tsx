'use client';
// Client Component: interactive form with controlled dialog state.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import type { UserDto } from '@bioinfood/shared';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

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

  if (!open) return null;

  async function onSubmit(data: FormData) {
    setServerError('');
    try {
      await api.patch(`/users/${user.id}/reset-password`, { newPassword: data.newPassword }, token);
      toast.success('Senha redefinida. O usuário precisará trocá-la no próximo login.');
      reset();
      onReset();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  function handleClose() {
    reset();
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">Resetar senha de {user.name}</h2>
          <button
            onClick={handleClose}
            className="text-[#706F6F] hover:text-[#575756] focus:outline-none focus:ring-2 focus:ring-[#52B552] rounded"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Nova senha temporária *</label>
            <input
              {...register('newPassword')}
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              placeholder="••••••••"
            />
            {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#575756] mb-1">Confirmar nova senha *</label>
            <input
              {...register('confirmPassword')}
              type="password"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              placeholder="••••••••"
            />
            {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <p className="text-xs text-[#878787]">
            O usuário será desconectado de todas as sessões ativas e precisará trocar a senha no próximo login.
          </p>

          {serverError && <p className="text-xs text-red-500">{serverError}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[#575756] border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              {isSubmitting ? 'Salvando...' : 'Redefinir senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
