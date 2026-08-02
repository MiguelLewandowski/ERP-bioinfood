import { cookies } from 'next/headers';
import { AlertTriangle, Milestone, ShieldAlert, TrendingUp } from 'lucide-react';
import { milestonesApi, projectsApi, risksApi, stakeholdersApi, tasksApi } from '@/lib/api-hooks';
import { StatCard } from '@/components/ui/stat-card';
import { formatDay, todayInSaoPaulo } from '@/lib/dates';
import {
  computeMilestoneMetrics,
  computeRiskMetrics,
  computeScheduleHealth,
  computeTaskMetrics,
  keyStakeholders,
} from '@/lib/project-metrics';
import { ScheduleCard } from './_components/schedule-card';
import { TasksCard } from './_components/tasks-card';
import { AssigneeLoadCard } from './_components/assignee-load-card';
import { RisksCard } from './_components/risks-card';
import { MilestonesCard } from './_components/milestones-card';
import { OverviewCard } from './_components/overview-card';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProjectDashboardPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [project, tasks, risks, milestones, stakeholders] = await Promise.all([
    projectsApi.get(id, token),
    tasksApi.list(id, token),
    risksApi.list(id, token),
    milestonesApi.list(id, token),
    stakeholdersApi.list(id, token),
  ]);

  const today = todayInSaoPaulo();
  const taskMetrics = computeTaskMetrics(tasks, today);
  const schedule = computeScheduleHealth(project);
  const riskMetrics = computeRiskMetrics(risks);
  const milestoneMetrics = computeMilestoneMetrics(milestones, today);

  const severeRisks = riskMetrics.critical + riskMetrics.high;
  const nextMilestone = milestoneMetrics.overdue[0] ?? milestoneMetrics.next[0] ?? null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Progresso"
          value={`${taskMetrics.progress}%`}
          hint={`${taskMetrics.done} de ${taskMetrics.total} tarefas concluídas`}
          icon={TrendingUp}
          tone="primary"
          href={`/projects/${id}/kanban`}
        />
        <StatCard
          label="Tarefas atrasadas"
          value={taskMetrics.overdue.length}
          hint={
            taskMetrics.overdue.length === 0
              ? 'Nenhum prazo estourado'
              : `Mais antiga: ${formatDay(taskMetrics.overdue[0].dueDate!)}`
          }
          icon={AlertTriangle}
          tone={taskMetrics.overdue.length > 0 ? 'destructive' : 'default'}
          href={`/projects/${id}/backlog`}
        />
        <StatCard
          label="Riscos severos"
          value={severeRisks}
          hint={`${riskMetrics.critical} crítico(s) · de ${riskMetrics.total} mapeado(s)`}
          icon={ShieldAlert}
          tone={severeRisks > 0 ? 'warning' : 'default'}
          href={`/projects/${id}/risks`}
        />
        <StatCard
          label="Marcos atingidos"
          value={`${milestoneMetrics.reached}/${milestoneMetrics.total}`}
          hint={nextMilestone ? `Próximo: ${formatDay(nextMilestone.date)}` : 'Nenhum marco pendente'}
          icon={Milestone}
          href={`/projects/${id}/roadmap`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <ScheduleCard schedule={schedule} />
          <TasksCard projectId={id} metrics={taskMetrics} />
          <AssigneeLoadCard loads={taskMetrics.byAssignee} />
        </div>

        <div className="flex flex-col gap-4">
          <OverviewCard project={project} keyPeople={keyStakeholders(stakeholders)} />
          <RisksCard projectId={id} metrics={riskMetrics} />
          <MilestonesCard projectId={id} metrics={milestoneMetrics} />
        </div>
      </div>
    </div>
  );
}
