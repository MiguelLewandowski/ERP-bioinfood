'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/errors';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Senha atual é obrigatória'),
    newPassword: z.string().min(6, 'A nova senha deve ter no mínimo 6 caracteres'),
    confirmPassword: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As senhas não coincidem',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

interface ChangePasswordFormProps {
  forced: boolean;
}

export default function ChangePasswordForm({ forced }: ChangePasswordFormProps) {
  const router = useRouter();
  const [error, setError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  async function onSubmit(data: FormData) {
    setError('');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.message ?? 'Não foi possível trocar a senha');
        return;
      }
      toast.success('Senha alterada com sucesso');
      router.push('/projects');
      router.refresh();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div>
        <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">Senha atual</label>
        <input
          id="current-password"
          {...register('currentPassword')}
          type="password"
          placeholder="••••••••"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>}
      </div>
      <div>
        <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">Nova senha</label>
        <input
          id="new-password"
          {...register('newPassword')}
          type="password"
          placeholder="••••••••"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">Confirmar nova senha</label>
        <input
          id="confirm-password"
          {...register('confirmPassword')}
          type="password"
          placeholder="••••••••"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
      </div>
      {error && <p className="text-xs text-red-500 text-center">{error}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 rounded-lg text-white font-semibold text-sm transition-opacity disabled:opacity-60"
        style={{ backgroundColor: 'hsl(var(--primary))' }}
      >
        {isSubmitting ? 'Salvando...' : forced ? 'Definir nova senha' : 'Salvar nova senha'}
      </button>
    </form>
  );
}
