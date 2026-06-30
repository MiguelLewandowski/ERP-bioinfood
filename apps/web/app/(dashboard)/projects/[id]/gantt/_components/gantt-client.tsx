'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Gantt, Toolbar, Editor, Tooltip, ContextMenu, Willow,
} from '@svar-ui/react-gantt';
import '@svar-ui/react-gantt/all.css';
import './gantt-status.css';
import { BarChart2, AlertTriangle, Lock, Flag, Loader2 } from 'lucide-react';
import type { TaskDto as Task, MilestoneDto as Milestone } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { projectsApi } from '@/lib/api-hooks';
import {
  EDITABLE_ROLES, BASELINE_ROLES,
  buildGanttTasks, buildGanttLinks, buildMarkers, scales, columns,
} from './gantt-mapping';
import { useGanttPersistence } from './use-gantt-persistence';

interface GanttClientProps {
  projectId: string;
  token: string;
  tasks: Task[];
  milestones: Milestone[];
  projectStart: string | null;
  projectEnd: string | null;
  baselineSetAt: string | null;
  baselineSetByName: string | null;
}

// ─── wrapper: RBAC + barra de baseline + reversão automática em caso de falha ───

export function GanttClient(props: GanttClientProps) {
  const { session } = useAuth();
  const router = useRouter();
  const editable = EDITABLE_ROLES.includes(session.role);
  const canBaseline = BASELINE_ROLES.includes(session.role);
  const [reloadKey, setReloadKey] = useState(0);
  const [saveError, setSaveError] = useState(false);
  const [baselineBusy, setBaselineBusy] = useState(false);

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
    const msg = already
      ? 'Redefinir a linha de base? As datas atuais de todas as atividades substituirão a baseline aprovada anteriormente.'
      : 'Definir a linha de base com as datas atuais de todas as atividades? Servirá de referência para medir desvios.';
    if (!window.confirm(msg)) return;
    setBaselineBusy(true);
    try {
      await projectsApi.setBaseline(props.projectId, props.token);
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
      {canBaseline && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-4 py-2">
          <span className="flex items-center gap-1.5 text-xs text-[#706F6F]">
            <Flag size={13} className={props.baselineSetAt ? 'text-[#147F23]' : 'text-[#878787]'} />
            {baselineLabel}
          </span>
          <button
            onClick={handleSetBaseline}
            disabled={baselineBusy}
            className="flex items-center gap-1.5 rounded-lg border border-[#147F23] px-3 py-1.5 text-xs font-semibold text-[#147F23] hover:bg-[#147F23] hover:text-white transition-colors disabled:opacity-50"
          >
            {baselineBusy ? <Loader2 size={13} className="animate-spin" /> : <Flag size={13} />}
            {props.baselineSetAt ? 'Redefinir linha de base' : 'Definir linha de base'}
          </button>
        </div>
      )}
      {!editable && (
        <div className="flex items-center gap-1.5 bg-gray-100 text-[#575756] px-4 py-2 text-xs font-medium">
          <Lock size={13} /> Modo somente leitura — seu perfil ({session.role}) não pode editar o cronograma.
        </div>
      )}
      {saveError && (
        <div className="flex items-center justify-between gap-3 bg-[#FBE3E5] text-[#D64550] px-4 py-2 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <AlertTriangle size={14} />
            Não foi possível salvar a alteração — ela foi revertida.
          </span>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-[#D64550]/40 px-2.5 py-1 hover:bg-white/40"
          >
            Recarregar
          </button>
        </div>
      )}
      <GanttBoard key={reloadKey} {...props} editable={editable} onSaveError={handleSaveError} />
    </div>
  );
}

// ─── board: monta os dados e renderiza o widget SVAR ────────────────────────────

interface GanttBoardProps extends GanttClientProps {
  editable: boolean;
  onSaveError: () => void;
}

function GanttBoard({
  projectId, token, tasks, milestones, projectEnd, editable, onSaveError,
}: GanttBoardProps) {
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
    editable, projectId, token, links: ganttLinks, onError: onSaveError,
  });

  if (ganttTasks.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl border border-gray-200 py-24 flex flex-col items-center gap-3">
          <BarChart2 size={40} style={{ color: '#878787' }} />
          <p className="text-sm font-medium text-[#575756]">Nenhuma tarefa com início e prazo definidos.</p>
          <p className="text-xs text-[#706F6F]">Adicione tarefas no Backlog/Kanban (ou crie aqui pela barra de ferramentas).</p>
        </div>
      </div>
    );
  }

  if (!mounted) {
    return <div style={{ height: 'calc(100vh - 150px)' }} />;
  }

  const CtxMenu = ContextMenu as any;

  return (
    <Willow>
      {editable && api && <Toolbar api={api} />}
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
  );
}
