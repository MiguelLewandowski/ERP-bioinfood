'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FolderKanban, ListTodo, Building2, Target } from 'lucide-react';
import { toast } from 'sonner';
import type { ProjectDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { projectsApi, tasksApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
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

const TASK_ROLES = ['INSERE', 'APROVA', 'ADMIN'];
const PROJECT_ROLES = ['APROVA', 'ADMIN'];
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

function QuickTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { token } = useAuth();
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    projectsApi
      .list(token)
      .then((list) => setProjects(list.filter((p) => !['COMPLETED', 'CANCELLED'].includes(p.status))))
      .catch((err) => toast.error(getErrorMessage(err)));
  }, [open, token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId || !title.trim()) return;
    setSaving(true);
    try {
      await tasksApi.create(projectId, { title: title.trim(), ...(dueDate ? { dueDate } : {}) }, token);
      toast.success('Tarefa criada', {
        action: { label: 'Ver kanban', onClick: () => router.push(`/projects/${projectId}/kanban`) },
      });
      setTitle('');
      setDueDate('');
      onOpenChange(false);
      router.refresh();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          </div>
          <div>
            <Label htmlFor="quick-task-title">Título *</Label>
            <Input
              id="quick-task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que precisa ser feito?"
              autoFocus
              required
              maxLength={200}
            />
          </div>
          <div>
            <Label htmlFor="quick-task-due">Prazo</Label>
            <Input
              id="quick-task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !projectId || !title.trim()}>
              {saving ? 'Criando...' : 'Criar tarefa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
