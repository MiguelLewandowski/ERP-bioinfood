'use client';
// Client Component: fetches data client-side and manages Radix Dialog state.

import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectDto, UserDto, UserProjectAccessDto } from '@bioinfood/shared';
import { projectsApi, usersApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';

interface UserProjectAccessDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: UserDto;
}

export default function UserProjectAccessDialog({ open, onOpenChange, user }: UserProjectAccessDialogProps) {
  const { token } = useAuth();
  const [access, setAccess] = useState<UserProjectAccessDto[]>([]);
  const [allProjects, setAllProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [linking, setLinking] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<UserProjectAccessDto | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError('');
    Promise.all([
      usersApi.projectAccess(user.id, token),
      projectsApi.list(token),
    ])
      .then(([accessList, projects]) => {
        setAccess(accessList);
        setAllProjects(projects);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, user.id, token]);

  const availableProjects = useMemo(
    () => allProjects.filter((p) => p.status !== 'CANCELLED' && !access.some((a) => a.id === p.id)),
    [allProjects, access],
  );

  async function handleLink() {
    if (!selectedProjectId) return;
    setLinking(true);
    setError('');
    try {
      await usersApi.grantProjectAccess(selectedProjectId, user.id, token);
      const project = allProjects.find((p) => p.id === selectedProjectId);
      if (project) setAccess((prev) => [...prev, { id: project.id, name: project.name, status: project.status }]);
      setSelectedProjectId('');
      toast.success('Acesso vinculado');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLinking(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    await usersApi.revokeProjectAccess(removeTarget.id, user.id, token);
    setAccess((prev) => prev.filter((a) => a.id !== removeTarget.id));
    toast.success('Acesso removido');
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Acesso a projetos — {user.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
        ) : (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <Select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  aria-label="Projeto para vincular"
                >
                  <option value="">Selecione um projeto...</option>
                  {availableProjects.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </div>
              <Button onClick={handleLink} disabled={!selectedProjectId || linking}>
                Vincular
              </Button>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            {access.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
                Nenhum projeto vinculado.
              </p>
            ) : (
              <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
                {access.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                  >
                    <span className="text-sm text-foreground">{a.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hover:text-destructive"
                      onClick={() => setRemoveTarget(a)}
                      aria-label={`Remover acesso a ${a.name}`}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>

        <ConfirmDialog
          open={!!removeTarget}
          onOpenChange={(v) => !v && setRemoveTarget(null)}
          title="Remover acesso ao projeto?"
          description={removeTarget ? `${user.name} perderá o acesso a "${removeTarget.name}".` : undefined}
          confirmLabel="Remover"
          variant="destructive"
          onConfirm={handleRemove}
        />
      </DialogContent>
    </Dialog>
  );
}
