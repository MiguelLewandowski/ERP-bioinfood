'use client';
// Client Component: manages table state, dialogs, and mutations.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, FolderKey, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import type { UserDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import UserDialog from './user-dialog';
import ResetPasswordDialog from './reset-password-dialog';
import UserProjectAccessDialog from './user-project-access-dialog';

interface UsersClientProps {
  users: UserDto[];
}

const ROLE_LABELS: Record<UserDto['role'], string> = {
  ADMIN: 'Admin',
  APROVA: 'Aprova',
  INSERE: 'Insere',
  CONSULTA: 'Consulta',
  CLIENTE: 'Cliente',
};

export default function UsersClient({ users }: UsersClientProps) {
  const { session, token } = useAuth();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [resetTarget, setResetTarget] = useState<UserDto | null>(null);
  const [accessTarget, setAccessTarget] = useState<UserDto | null>(null);
  const [toggleTarget, setToggleTarget] = useState<UserDto | null>(null);

  const isAdmin = session.role === 'ADMIN';

  function openCreate() {
    setEditingUser(null);
    setDialogOpen(true);
  }

  function openEdit(user: UserDto) {
    setEditingUser(user);
    setDialogOpen(true);
  }

  function onSaved() {
    setDialogOpen(false);
    router.refresh();
  }

  async function handleToggleActive() {
    if (!toggleTarget) return;
    try {
      await api.patch(`/users/${toggleTarget.id}`, { isActive: !toggleTarget.isActive }, token);
      toast.success(toggleTarget.isActive ? 'Usuário desativado' : 'Usuário ativado');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <>
      <div className="flex items-center justify-end mb-4">
        {isAdmin && (
          <button
            onClick={openCreate}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
          >
            + Novo Usuário
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h3 className="text-lg font-semibold text-[#575756]">Nenhum usuário encontrado</h3>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold text-[#878787]">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">E-mail</th>
                <th className="px-4 py-3">Perfil</th>
                <th className="px-4 py-3">Status</th>
                {isAdmin && <th className="px-4 py-3 text-right">Ações</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-[#1D1D1B]">{user.name}</td>
                  <td className="px-4 py-3 text-[#575756]">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-[#575756]">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-xs font-medium',
                        user.isActive ? 'bg-[#147F23]/10 text-[#147F23]' : 'bg-gray-100 text-[#878787]',
                      )}
                    >
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg text-[#575756] hover:bg-gray-100"
                          title="Editar"
                          aria-label={`Editar ${user.name}`}
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setResetTarget(user)}
                          className="p-1.5 rounded-lg text-[#575756] hover:bg-gray-100"
                          title="Resetar senha"
                          aria-label={`Resetar senha de ${user.name}`}
                        >
                          <KeyRound size={15} />
                        </button>
                        {user.role === 'CLIENTE' && (
                          <button
                            onClick={() => setAccessTarget(user)}
                            className="p-1.5 rounded-lg text-[#575756] hover:bg-gray-100"
                            title="Gerenciar acesso a projetos"
                            aria-label={`Gerenciar acesso a projetos de ${user.name}`}
                          >
                            <FolderKey size={15} />
                          </button>
                        )}
                        <button
                          onClick={() => setToggleTarget(user)}
                          className={cn(
                            'ml-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors',
                            user.isActive
                              ? 'border-gray-200 text-[#575756] hover:bg-gray-50'
                              : 'border-[#147F23] text-[#147F23] hover:bg-[#147F23]/5',
                          )}
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} user={editingUser} onSaved={onSaved} />

      {resetTarget && (
        <ResetPasswordDialog
          open={!!resetTarget}
          onOpenChange={(v) => !v && setResetTarget(null)}
          user={resetTarget}
          onReset={() => setResetTarget(null)}
        />
      )}

      {accessTarget && (
        <UserProjectAccessDialog
          open={!!accessTarget}
          onOpenChange={(v) => !v && setAccessTarget(null)}
          user={accessTarget}
        />
      )}

      <ConfirmDialog
        open={!!toggleTarget}
        onOpenChange={(v) => !v && setToggleTarget(null)}
        title={toggleTarget?.isActive ? 'Desativar usuário?' : 'Ativar usuário?'}
        description={
          toggleTarget?.isActive
            ? `${toggleTarget?.name} não conseguirá mais acessar o sistema.`
            : `${toggleTarget?.name} voltará a ter acesso ao sistema.`
        }
        confirmLabel={toggleTarget?.isActive ? 'Desativar' : 'Ativar'}
        variant={toggleTarget?.isActive ? 'destructive' : 'default'}
        onConfirm={handleToggleActive}
      />
    </>
  );
}
