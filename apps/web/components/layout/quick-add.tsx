'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderKanban, ListTodo, Building2, Target } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { projectsApi, usersApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import type { ProjectMember } from '@/lib/project-members';
import { TaskFormDialog } from '@/app/(dashboard)/projects/[id]/_components/tasks/task-form-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const TASK_ROLES = ['PADRAO', 'ADMIN'];
const PROJECT_ROLES = ['PADRAO', 'ADMIN'];
const CRM_ROLES = ['ADMIN'];

export function QuickAdd() {
  const router = useRouter();
  const { session } = useAuth();
  const [taskOpen, setTaskOpen] = useState(false);

  const canTask = TASK_ROLES.includes(session.role);
  const canProject = PROJECT_ROLES.includes(session.role);
  const canCrm = CRM_ROLES.includes(session.role);

  if (!canTask && !canProject && !canCrm) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm">
            <Plus size={15} /> Novo
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canTask && (
            <DropdownMenuItem onSelect={() => setTaskOpen(true)}>
              <ListTodo size={15} className="text-muted-foreground" /> Tarefa
            </DropdownMenuItem>
          )}
          {canProject && (
            <DropdownMenuItem onSelect={() => router.push('/projects')}>
              <FolderKanban size={15} className="text-muted-foreground" /> Projeto
            </DropdownMenuItem>
          )}
          {canCrm && (
            <DropdownMenuItem onSelect={() => router.push('/crm?tab=empresas')}>
              <Building2 size={15} className="text-muted-foreground" /> Empresa
            </DropdownMenuItem>
          )}
          {canCrm && (
            <DropdownMenuItem onSelect={() => router.push('/crm?tab=negocios')}>
              <Target size={15} className="text-muted-foreground" /> Negócio
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <QuickTaskDialog open={taskOpen} onOpenChange={setTaskOpen} />
    </>
  );
}

/**
 * O "Novo → Tarefa" do cabeçalho criava tarefa com **três** campos (projeto,
 * título, prazo), enquanto o Backlog abre um formulário com responsável,
 * corresponsáveis, prioridade, story points, checklist, POPs e dependências.
 * Duas portas para a mesma coisa, com resultados diferentes.
 *
 * Em vez de duplicar os campos aqui, este diálogo virou só o que ele tem de
 * exclusivo — **escolher o projeto**, que nas telas de projeto vem da rota — e
 * delega o resto ao mesmo `TaskFormDialog` do Backlog. Padronizar assim
 * garante que os dois não voltem a divergir na próxima mudança de formulário.
 */
function QuickTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [projectId, setProjectId] = useState('');
  const [people, setPeople] = useState<ProjectMember[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    projectsApi
      .list(token)
      .then((list) => setProjects(list.filter((p) => !['COMPLETED', 'CANCELLED'].includes(p.status))))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [open, token]);

  // Mesma lista de gente que as telas de projeto oferecem. `GET /users` exige
  // ADMIN ou PADRAO; para CLIENTE a lista fica vazia e o select mostra apenas
  // "sem responsável", que é o que ele pode fazer mesmo.
  useEffect(() => {
    if (!open) return;
    usersApi
      .list(token)
      .then((users) => setPeople(users.filter((u) => u.isActive).map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => setPeople([]));
  }, [open, token]);

  function handleContinue() {
    if (!projectId) return;
    onOpenChange(false);
    setFormOpen(true);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova tarefa</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="quick-task-project">Projeto *</Label>
              <Select
                id="quick-task-project"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                required
              >
                <option value="">Selecione um projeto...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Depois de escolher, abre o mesmo formulário do Backlog.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleContinue} disabled={!projectId}>
                Continuar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {formOpen && projectId && (
        <TaskFormDialog
          mode="create"
          projectId={projectId}
          members={people}
          onCreated={() => {
            toast.success('Tarefa criada', {
              action: { label: 'Ver kanban', onClick: () => router.push(`/projects/${projectId}/kanban`) },
            });
            router.refresh();
          }}
          onClose={() => setFormOpen(false)}
        />
      )}
    </>
  );
}
