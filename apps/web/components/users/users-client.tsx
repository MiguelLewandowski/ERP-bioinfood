'use client';
// Client Component: manages table state, dialogs, and mutations.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, FolderKey, Pencil, Users } from 'lucide-react';
import { toast } from 'sonner';
import type { UserDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { usersApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import {
  TableContainer, Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
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
      await usersApi.update(toggleTarget.id, { isActive: !toggleTarget.isActive }, token);
      toast.success(toggleTarget.isActive ? 'Usuário desativado' : 'Usuário ativado');
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-end">
        {isAdmin && <Button onClick={openCreate}>+ Novo Usuário</Button>}
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="Nenhum usuário encontrado" />
      ) : (
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium text-foreground">{user.name}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <Badge>{ROLE_LABELS[user.role]}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.isActive ? 'success' : 'neutral'}>
                      {user.isActive ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(user)}
                          title="Editar"
                          aria-label={`Editar ${user.name}`}
                        >
                          <Pencil size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setResetTarget(user)}
                          title="Resetar senha"
                          aria-label={`Resetar senha de ${user.name}`}
                        >
                          <KeyRound size={15} />
                        </Button>
                        {user.role === 'CLIENTE' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setAccessTarget(user)}
                            title="Gerenciar acesso a projetos"
                            aria-label={`Gerenciar acesso a projetos de ${user.name}`}
                          >
                            <FolderKey size={15} />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-1"
                          onClick={() => setToggleTarget(user)}
                        >
                          {user.isActive ? 'Desativar' : 'Ativar'}
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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
