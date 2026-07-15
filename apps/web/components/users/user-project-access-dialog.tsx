'use client';
// Client Component: fetches data client-side and manages Radix Dialog state.

import { useEffect, useMemo, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectDto, UserDto, UserProjectAccessDto } from '@bioinfood/shared';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { useAuth } from '@/components/providers/auth-provider';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';

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
      api.get<UserProjectAccessDto[]>(`/users/${user.id}/project-access`, token),
      api.get<ProjectDto[]>('/projects', token),
    ])
      .then(([accessList, projects]) => {
        setAccess(accessList);
        setAllProjects(projects);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [open, user.id, token]);

  const availableProjects = useMemo(
    () => allProjects.filter((p) => !access.some((a) => a.id === p.id)),
    [allProjects, access],
  );

  if (!open) return null;

  async function handleLink() {
    if (!selectedProjectId) return;
    setLinking(true);
    setError('');
    try {
      await api.post(`/projects/${selectedProjectId}/access`, { userId: user.id }, token);
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
    await api.delete(`/projects/${removeTarget.id}/access/${user.id}`, token);
    setAccess((prev) => prev.filter((a) => a.id !== removeTarget.id));
    toast.success('Acesso removido');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#1D1D1B]">Acesso a projetos — {user.name}</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#706F6F] hover:text-[#575756] focus:outline-none focus:ring-2 focus:ring-[#52B552] rounded"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-[#878787] py-8 text-center">Carregando...</p>
        ) : (
          <>
            <div className="flex gap-2 mb-4">
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              >
                <option value="">Selecione um projeto...</option>
                {availableProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <button
                onClick={handleLink}
                disabled={!selectedProjectId || linking}
                className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] disabled:opacity-60 transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
              >
                Vincular
              </button>
            </div>

            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

            {access.length === 0 ? (
              <p className="text-sm text-[#878787] py-6 text-center border border-dashed border-gray-200 rounded-lg">
                Nenhum projeto vinculado.
              </p>
            ) : (
              <ul className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                {access.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                  >
                    <span className="text-sm text-[#1D1D1B]">{a.name}</span>
                    <button
                      onClick={() => setRemoveTarget(a)}
                      className="text-[#878787] hover:text-red-500"
                      aria-label={`Remover acesso a ${a.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="flex justify-end pt-5">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[#575756] border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#52B552]"
          >
            Fechar
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(v) => !v && setRemoveTarget(null)}
        title="Remover acesso ao projeto?"
        description={removeTarget ? `${user.name} perderá o acesso a "${removeTarget.name}".` : undefined}
        confirmLabel="Remover"
        variant="destructive"
        onConfirm={handleRemove}
      />
    </div>
  );
}
