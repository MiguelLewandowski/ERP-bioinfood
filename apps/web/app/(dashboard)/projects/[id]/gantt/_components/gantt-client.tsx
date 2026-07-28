'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gantt, Editor, Tooltip, ContextMenu, Willow,
} from '@svar-ui/react-gantt';
import { Locale } from '@svar-ui/react-core';
import '@svar-ui/react-gantt/all.css';
import './gantt-status.css';
import { BarChart2, AlertTriangle, Lock, Flag, Loader2, Plus } from 'lucide-react';
import type { TaskDto as Task, MilestoneDto as Milestone } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { projectsApi } from '@/lib/api-hooks';
import type { ProjectMember } from '@/lib/project-members';
import { TaskFormDialog } from '../../_components/tasks/task-form-dialog';
import {
  EDITABLE_ROLES, BASELINE_ROLES,
  buildGanttTasks, buildGanttLinks, buildMarkers, scales, columns,
} from './gantt-mapping';
import { useGanttPersistence } from './use-gantt-persistence';
import { ganttLocalePt } from './gantt-locale-pt';

interface GanttClientProps {
  projectId: string;
  tasks: Task[];
  milestones: Milestone[];
  members: ProjectMember[];
  projectStart: string | null;
  projectEnd: string | null;
  baselineSetAt: string | null;
  baselineSetByName: string | null;
}

// ─── wrapper: RBAC + barra de baseline + reversão automática em caso de falha ───

export function GanttClient(props: GanttClientProps) {
  const { session, token } = useAuth();
  const router = useRouter();
  const confirm = useConfirm();
  const editable = EDITABLE_ROLES.includes(session.role);
  const canBaseline = BASELINE_ROLES.includes(session.role);
  const [reloadKey, setReloadKey] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [baselineBusy, setBaselineBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Recarrega o board a partir do servidor após criar/editar/excluir uma
  // tarefa pelo TaskFormDialog (mesmo dialog do Kanban/Backlog).
  function handleTaskSaved() {
    setReloadKey((k) => k + 1);
    router.refresh();
  }

  // Em caso de falha ao salvar: remonta o board (re-semeia com o estado do
  // servidor → reverte a edição otimista) e busca dados atualizados.
  function handleSaveError() {
    setSaveError(true);
    setReloadKey((k) => k + 1);
    router.refresh();
  }

  async function handleSetBaseline() {
    if (baselineBusy) return;
    const already = !!props.baselineSetAt;
    const confirmed = await confirm({
      title: already ? 'Redefinir a linha de base?' : 'Definir a linha de base?',
      description: already
        ? 'As datas atuais de todas as atividades substituirão a baseline aprovada anteriormente.'
        : 'As datas atuais de todas as atividades servirão de referência para medir desvios.',
      confirmLabel: already ? 'Redefinir' : 'Definir',
      variant: already ? 'destructive' : 'default',
    });
    if (!confirmed) return;
    setBaselineBusy(true);
    try {
      await projectsApi.setBaseline(props.projectId, token);
      setReloadKey((k) => k + 1);
      router.refresh();
    } finally {
      setBaselineBusy(false);
    }
  }

  useEffect(() => {
    if (!saveError) return;
    const id = setTimeout(() => setSaveError(false), 6000);
    return () => clearTimeout(id);
  }, [saveError]);

  const baselineLabel = props.baselineSetAt
    ? `Linha de base: ${new Date(props.baselineSetAt).toLocaleDateString('pt-BR')}${props.baselineSetByName ? ` · ${props.baselineSetByName}` : ''}`
    : 'Linha de base não definida';

  return (
    <div className="flex flex-col">
      {editable && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
          {canBaseline ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Flag size={13} className={props.baselineSetAt ? 'text-primary' : 'text-muted-foreground'} />
              {baselineLabel}
            </span>
          ) : <span />}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: 'hsl(var(--primary))' }}
            >
              <Plus size={13} /> Nova Tarefa
            </button>
            {canBaseline && (
              <button
                onClick={handleSetBaseline}
                disabled={baselineBusy}
                className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
              >
                {baselineBusy ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
                {props.baselineSetAt ? 'Redefinir linha de base' : 'Definir linha de base'}
              </button>
            )}
          </div>
        </div>
      )}
      {!editable && (
        <div className="flex items-center gap-1.5 bg-gray-100 text-muted-foreground px-4 py-2 text-xs font-medium">
          <Lock size={13} /> Modo somente leitura — seu perfil ({session.role}) não pode editar o cronograma.
        </div>
      )}
      {saveError && (
        <div className="flex items-center justify-between gap-3 bg-destructive/10 text-destructive px-4 py-2 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={14} />
            Não foi possível salvar a alteração — ela foi revertida.
          </span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-destructive/40 px-2.5 py-1 hover:bg-white/40"
          >
            Recarregar
          </button>
        </div>
      )}
      <GanttBoard
        key={reloadKey}
        {...props}
        editable={editable}
        onSaveError={handleSaveError}
        onEditTask={setEditingTaskId}
      />

      {creating && (
        <TaskFormDialog
          mode="create"
          projectId={props.projectId}
          members={props.members}
          onCreated={() => { setCreating(false); handleTaskSaved(); }}
          onClose={() => setCreating(false)}
        />
      )}

      {editingTaskId && (() => {
        const task = props.tasks.find((t) => t.id === editingTaskId);
        if (!task) return null;
        return (
          <TaskFormDialog
            mode="edit"
            task={task}
            projectId={props.projectId}
            members={props.members}
            onUpdated={handleTaskSaved}
            onDeleted={handleTaskSaved}
            onClose={() => setEditingTaskId(null)}
          />
        );
      })()}
    </div>
  );
}

// ─── board: monta os dados e renderiza o widget SVAR ────────────────────────────

interface GanttBoardProps extends GanttClientProps {
  editable: boolean;
  onSaveError: () => void;
  onEditTask: (taskId: string) => void;
}

function GanttBoard({
  projectId, tasks, milestones, projectEnd, editable, onSaveError, onEditTask,
}: GanttBoardProps) {
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [api, setApi] = useState<any>(undefined);

  useEffect(() => { setMounted(true); }, []);

  const ganttTasks = useMemo(() => buildGanttTasks(tasks, milestones), [tasks, milestones]);
  const ganttLinks = useMemo(() => {
    const visibleIds = new Set(ganttTasks.map((t) => String(t.id)));
    return buildGanttLinks(tasks, visibleIds);
  }, [tasks, ganttTasks]);
  const markers = useMemo(() => buildMarkers(projectEnd, ganttTasks), [projectEnd, ganttTasks]);

  const { menuHandler } = useGanttPersistence(api, {
    editable, projectId, token, links: ganttLinks, tasks, onError: onSaveError, onEditTask,
  });

  if (ganttTasks.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 py-24 flex flex-col items-center gap-3">
          <BarChart2 size={40} style={{ color: 'hsl(var(--muted-foreground))' }} />
          <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa com início e prazo definidos.</p>
          <p className="text-xs text-muted-foreground">Adicione tarefas no Backlog/Kanban (ou crie aqui pela barra de ferramentas).</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return <div style={{ height: 'calc(100vh - 150px)' }} />;
  }

  const CtxMenu = ContextMenu as any;

  return (
    <Locale words={ganttLocalePt}>
      <Willow>
        {/* A Toolbar nativa da SVAR foi removida de propósito: o botão de adicionar
            dela criava tarefa direto na API (título "New Task", datas vindas da
            escala visível), sem passar pelo TaskFormDialog e sem validação. Era um
            caminho de escrita não controlado — ver docs/incidentes/timezone-cronograma.md.
            O botão "Nova Tarefa" acima cobre a mesma função pelo caminho certo. */}
        <div
          style={{ height: 'calc(100vh - 180px)' }}
          onContextMenu={(e) => {
            if (menuHandler.current) { e.preventDefault(); menuHandler.current(e); }
          }}
        >
          <Gantt
            init={setApi}
            tasks={ganttTasks}
            links={ganttLinks}
            scales={scales}
            columns={columns}
            markers={markers}
            criticalPath={{ type: 'flexible' }}
            baselines
            readonly={!editable}
            zoom
          />
        </div>
        {api && <Tooltip api={api} />}
        {editable && api && <Editor api={api} />}
        {editable && api && (
          <CtxMenu api={api} init={(v: (e: any) => void) => { menuHandler.current = v; }} />
        )}
      </Willow>
    </Locale>
  );
}
