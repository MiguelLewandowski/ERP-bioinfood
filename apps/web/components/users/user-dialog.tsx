'use client';
// Client Component: interactive form with controlled dialog state.

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { UserDto } from '@bioinfood/shared';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';

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

  if (!open) return null;

  async function onSubmitCreate(data: CreateFormData) {
    setServerError('');
    try {
      await api.post<UserDto>('/users', data, token);
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
      await api.patch<UserDto>(`/users/${user.id}`, data, token);
      onSaved();
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  }

  function handleClose() {
    createForm.reset();
    editForm.reset();
    onOpenChange(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">
            {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button
            onClick={handleClose}
            className="text-[#706F6F] hover:text-[#575756] focus:outline-none focus:ring-2 focus:ring-[#52B552] rounded"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {isEdit ? (
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Nome *</label>
              <input
                {...editForm.register('name')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              />
              {editForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{editForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">E-mail</label>
              <input
                value={user.email}
                readOnly
                disabled
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-[#878787]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Perfil de acesso</label>
              <select
                {...editForm.register('role')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" {...editForm.register('isActive')} className="h-4 w-4 rounded border-gray-300 accent-[#147F23]" />
              <span className="text-sm font-medium text-[#575756]">Usuário ativo</span>
            </label>

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
                disabled={editForm.formState.isSubmitting}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              >
                {editForm.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={createForm.handleSubmit(onSubmitCreate)} className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Nome *</label>
              <input
                {...createForm.register('name')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
                placeholder="Nome completo"
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">E-mail *</label>
              <input
                {...createForm.register('email')}
                type="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
                placeholder="email@bioinfood.com"
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Senha temporária *</label>
              <input
                {...createForm.register('password')}
                type="password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
                placeholder="••••••••"
              />
              <p className="text-xs text-[#878787] mt-1">
                O usuário será obrigado a trocar essa senha no primeiro login.
              </p>
              {createForm.formState.errors.password && (
                <p className="text-xs text-red-500 mt-1">{createForm.formState.errors.password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#575756] mb-1">Perfil de acesso</label>
              <select
                {...createForm.register('role')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              >
                {ROLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

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
                disabled={createForm.formState.isSubmitting}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              >
                {createForm.formState.isSubmitting ? 'Criando...' : 'Criar Usuário'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
