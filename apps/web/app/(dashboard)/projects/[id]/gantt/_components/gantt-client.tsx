'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gantt, Editor, Tooltip, ContextMenu, Willow,
} from '@svar-ui/react-gantt';
import { Locale } from '@svar-ui/react-core';
import '@svar-ui/react-gantt/all.css';
import './gantt-status.css';
import { BarChart2, AlertTriangle, Lock, Flag, Loader2, Plus, CalendarClock, Route, Layers } from 'lucide-react';
import type { TaskDto as Task, MilestoneDto as Milestone, WbsNodeDto } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { projectsApi } from '@/lib/api-hooks';
import { cn } from '@/lib/utils';
import type { ProjectMember } from '@/lib/project-members';
import { TaskFormDialog } from '../../_components/tasks/task-form-dialog';
import {
  EDITABLE_ROLES, BASELINE_ROLES, ZOOM_LEVELS, DEFAULT_ZOOM_LEVEL, zoomConfig,
  buildGanttTasks, buildGanttLinks, buildMarkers, buildGroupLabels, scales, columns,
  type ZoomLevelId,
} from './gantt-mapping';
import { useGanttPersistence } from './use-gantt-persistence';
import { ganttLocalePt } from './gantt-locale-pt';

interface GanttClientProps {
  projectId: string;
  tasks: Task[];
  milestones: Milestone[];
  wbsNodes: WbsNodeDto[];
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
  const [zoomLevel, setZoomLevel] = useState<ZoomLevelId>(DEFAULT_ZOOM_LEVEL);
  const [showCriticalPath, setShowCriticalPath] = useState(false);
  const [grouped, setGrouped] = useState(true);
  // Instância da SVAR erguida do board: o botão "Hoje" vive na barra de cima.
  const apiRef = useRef<any>(null);

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
      {/* UMA barra só. Antes eram duas linhas mais uma de legenda: além de comer
          altura, os controles de visualização ficavam separados das ações e
          "Agrupar por pacote" / "Caminho crítico" passavam batido. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-gray-200 bg-white px-4 py-2.5">
        <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
          {ZOOM_LEVELS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setZoomLevel(id)}
              aria-pressed={zoomLevel === id}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                zoomLevel === id
                  ? 'bg-white text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => apiRef.current?.exec('scroll-chart', { date: new Date() })}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-gray-50 hover:text-foreground"
        >
          <CalendarClock size={13} /> Hoje
        </button>

        {/* Ativos ganham fundo colorido para o estado ser óbvio sem clicar. */}
        <button
          onClick={() => setGrouped((v) => !v)}
          aria-pressed={grouped}
          title="Agrupa as linhas por pacote de nível 1 da EAP, com um cabeçalho por pacote"
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
            grouped
              ? 'border-primary bg-primary text-white'
              : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
          )}
        >
          <Layers size={13} /> Agrupar por pacote
        </button>

        <button
          onClick={() => setShowCriticalPath((v) => !v)}
          aria-pressed={showCriticalPath}
          title="Destaca a sequência de atividades que define a data de término do projeto"
          className={cn(
            'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors',
            showCriticalPath
              ? 'border-destructive bg-destructive text-white'
              : 'border-gray-200 text-muted-foreground hover:bg-gray-50',
          )}
        >
          <Route size={13} /> Caminho crítico
        </button>

        {editable && (
          <>
            <span className="mx-1 hidden h-5 w-px bg-gray-200 sm:block" />
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
                title={baselineLabel}
                className="flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
              >
                {baselineBusy ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
                {props.baselineSetAt ? 'Redefinir linha de base' : 'Definir linha de base'}
              </button>
            )}
          </>
        )}

        {/* Legenda no fim da mesma linha, empurrada para a direita. */}
        <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="gt-swatch-todo h-2 w-4 rounded-sm" /> A fazer</span>
          <span className="flex items-center gap-1.5"><i className="gt-swatch-doing h-2 w-4 rounded-sm" /> Em andamento</span>
          <span className="flex items-center gap-1.5"><i className="gt-swatch-done h-2 w-4 rounded-sm" /> Concluída</span>
          <span className="flex items-center gap-1.5"><i className="gt-swatch-milestone h-3 w-3 rotate-45 rounded-sm" /> Marco</span>
          <span className="flex items-center gap-1.5"><i className="h-2 w-4 rounded-sm border border-dashed border-muted-foreground" /> Linha de base</span>
        </div>
      </div>

      {canBaseline && editable && (
        <div className="flex items-center gap-1.5 border-b border-gray-200 bg-white px-4 py-1.5 text-xs text-muted-foreground">
          <Flag size={13} className={props.baselineSetAt ? 'text-primary' : 'text-muted-foreground'} />
          {baselineLabel}
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
        // Remonta ao trocar zoom/agrupamento/caminho crítico: a store da SVAR lê
        // essas configs na inicialização, não a cada render.
        key={`${reloadKey}-${zoomLevel}-${grouped}-${showCriticalPath}`}
        {...props}
        editable={editable}
        zoomLevel={zoomLevel}
        grouped={grouped}
        showCriticalPath={showCriticalPath}
        onApi={(a) => { apiRef.current = a; }}
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
  zoomLevel: ZoomLevelId;
  grouped: boolean;
  showCriticalPath: boolean;
  onApi: (api: any) => void;
  onSaveError: () => void;
  onEditTask: (taskId: string) => void;
}

function GanttBoard({
  projectId, tasks, milestones, wbsNodes, projectEnd, editable,
  zoomLevel, grouped, showCriticalPath, onApi, onSaveError, onEditTask,
}: GanttBoardProps) {
  const { token } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [api, setApi] = useState<any>(undefined);

  useEffect(() => { setMounted(true); }, []);

  // Abre já mostrando hoje. Um projeto de 2 anos abria em jul/25 e obrigava a
  // rolar até o presente antes de enxergar qualquer coisa em andamento.
  useEffect(() => {
    if (!api) return;
    onApi(api);
    api.exec('scroll-chart', { date: new Date() });
  }, [api, onApi]);

  const groupLabels = useMemo(() => buildGroupLabels(tasks, wbsNodes), [tasks, wbsNodes]);
  const ganttTasks = useMemo(
    () => buildGanttTasks(tasks, milestones, groupLabels),
    [tasks, milestones, groupLabels],
  );
  const ganttLinks = useMemo(() => {
    const visibleIds = new Set(ganttTasks.map((t) => String(t.id)));
    return buildGanttLinks(tasks, visibleIds);
  }, [tasks, ganttTasks]);
  const markers = useMemo(() => buildMarkers(projectEnd, ganttTasks), [projectEnd, ganttTasks]);

  const { menuHandler } = useGanttPersistence(api, {
    editable, projectId, token, links: ganttLinks, tasks, milestones,
    onError: onSaveError, onEditTask,
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
    // Reserva de espaço até o widget montar (ele é client-only). Mesma altura do
    // board, para não haver salto entre um e outro.
    return <div className="h-[calc(100vh-13rem)] min-h-[24rem]" />;
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
          // Altura EXPLÍCITA, não `flex-1`: a SVAR só mostra as próprias barras
          // de rolagem (vertical E horizontal) quando recebe uma caixa de altura
          // conhecida. Com `h-full`/`flex-1` a altura podia resolver para `auto`
          // dependendo da cadeia de ancestrais — aí o widget crescia com o
          // conteúdo, a rolagem vertical desaparecia e a horizontal ia para o fim
          // da página. `min-h` garante que nunca colapse em tela baixa.
          className="h-[calc(100vh-13rem)] min-h-[24rem]"
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
            // O caminho crítico SEMPRE foi calculado — o que faltava era poder
            // desligá-lo. Ligado o tempo todo, ele compete com a cor de status.
            criticalPath={showCriticalPath ? { type: 'flexible' } : null}
            // `groupBy` nativo da SVAR: os cabeçalhos de pacote são linhas
            // gerenciadas pela lib, não sintetizadas aqui. `taskHierarchy`
            // preserva a hierarquia de subtarefas dentro de cada grupo.
            groupBy={grouped ? { field: 'group', taskHierarchy: true, ungrouped: 'bottom' } : null}
            baselines
            readonly={!editable}
            zoom={{ ...zoomConfig, level: ZOOM_LEVELS.findIndex((l) => l.id === zoomLevel) }}
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
