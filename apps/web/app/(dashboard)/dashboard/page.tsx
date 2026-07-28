import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  AlertTriangle, CalendarDays, FolderKanban, Target, ArrowRight, CheckCircle2,
} from 'lucide-react';
import type { ActivityDto, CrmActivityDto, ProjectDto } from '@bioinfood/shared';
import { getSession } from '@/lib/auth';
import { formatDay } from '@/lib/dates';
import { activitiesApi, crmActivitiesApi, projectsApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/ui/status-badge';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';

const DAY_MS = 24 * 60 * 60 * 1000;

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDate(dateStr: string): string {
  return formatDay(dateStr);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const canCrm = ['ADMIN'].includes(session.role);

  const now = new Date();
  const todayIso = iso(now);
  const from = iso(new Date(now.getTime() - 60 * DAY_MS));
  const to = iso(new Date(now.getTime() + 7 * DAY_MS));

  const [activities, projects, myCrmOverdue, myCrmToday] = await Promise.all([
    activitiesApi.list({ from, to }, token),
    projectsApi.list(token),
    // Minhas tarefas do CRM (responsável = eu) — best-effort, não derruba o dashboard.
    canCrm
      ? crmActivitiesApi.list(token, { responsibleId: session.sub, due: 'overdue' }).catch(() => [])
      : Promise.resolve([]),
    canCrm
      ? crmActivitiesApi.list(token, { responsibleId: session.sub, due: 'today' }).catch(() => [])
      : Promise.resolve([]),
  ]);
  const myCrmTasks = [...myCrmOverdue, ...myCrmToday];

  const open = (a: ActivityDto) => a.status !== 'DONE';
  const mine = activities.filter((a) => open(a) && a.assignee?.id === session.sub);
  const overdue = mine.filter((a) => a.dueDate && a.dueDate.slice(0, 10) < todayIso);
  const dueToday = mine.filter((a) => a.dueDate && a.dueDate.slice(0, 10) === todayIso);
  const upcoming = mine
    .filter((a) => a.dueDate && a.dueDate.slice(0, 10) > todayIso)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 6);

  const activeProjects = projects
    .filter((p) => ['PLANNING', 'IN_PROGRESS'].includes(p.status))
    .slice(0, 6);

  return (
    <div className="p-6">
      <PageHeader
        title="Dashboard"
        description="Seu dia de trabalho em um lugar só"
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coluna principal: minhas tarefas */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-accent" /> Minhas tarefas
                {overdue.length > 0 && (
                  <Badge variant="accent">
                    {overdue.length} atrasada{overdue.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
              <Link href="/activities" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Ver agenda <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {overdue.length === 0 && dueToday.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nada atrasado ou para hoje"
                  description="Suas próximas tarefas aparecem abaixo."
                  className="py-8"
                />
              ) : (
                [...overdue, ...dueToday].map((a) => <TaskRow key={a.id} activity={a} today={todayIso} />)
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <CalendarDays size={15} className="text-primary" /> Próximos 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {upcoming.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhuma tarefa sua com prazo na próxima semana.
                </p>
              ) : (
                upcoming.map((a) => <TaskRow key={a.id} activity={a} today={todayIso} />)
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral: projetos + CRM */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderKanban size={15} className="text-primary" /> Projetos ativos
              </CardTitle>
              <Link href="/projects" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                Todos <ArrowRight size={12} />
              </Link>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {activeProjects.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhum projeto ativo.</p>
              ) : (
                activeProjects.map((p) => <ProjectRow key={p.id} project={p} />)
              )}
            </CardContent>
          </Card>

          {canCrm && (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Target size={15} className="text-primary" /> Minhas tarefas (CRM)
                  {myCrmOverdue.length > 0 && (
                    <Badge variant="accent">
                      {myCrmOverdue.length} atrasada{myCrmOverdue.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </CardTitle>
                <Link href="/crm" className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Ver tudo <ArrowRight size={12} />
                </Link>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {myCrmTasks.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">Nenhuma tarefa do CRM para hoje.</p>
                ) : (
                  myCrmTasks.slice(0, 6).map((t) => <CrmTaskRow key={t.id} task={t} today={todayIso} />)
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({ activity, today }: { activity: ActivityDto; today: string }) {
  const due = activity.dueDate?.slice(0, 10);
  const isOverdue = !!due && due < today;
  const isToday = due === today;
  return (
    <Link
      href={`/projects/${activity.project.id}/kanban`}
      className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
          {activity.title}
        </span>
        <span className="block truncate text-xs text-muted-foreground">{activity.project.name}</span>
      </span>
      {due && (
        <Badge variant={isOverdue ? 'accent' : isToday ? 'warning' : 'neutral'}>
          {isToday ? 'Hoje' : formatDate(due)}
        </Badge>
      )}
    </Link>
  );
}

function CrmTaskRow({ task, today }: { task: CrmActivityDto; today: string }) {
  const due = task.dueDate?.slice(0, 10);
  const isOverdue = !!due && due < today;
  const isToday = due === today;
  const orgName = task.organization?.tradeName ?? task.organization?.legalName ?? task.contact?.name;
  return (
    <Link
      href="/crm"
      className="group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60"
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary">
          {task.title}
        </span>
        {orgName && <span className="block truncate text-xs text-muted-foreground">{orgName}</span>}
      </span>
      {due && (
        <Badge variant={isOverdue ? 'accent' : isToday ? 'warning' : 'neutral'}>
          {isToday ? 'Hoje' : formatDate(due)}
        </Badge>
      )}
    </Link>
  );
}

function ProjectRow({ project }: { project: ProjectDto }) {
  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 transition-colors hover:bg-muted/60"
    >
      <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
        {project.name}
      </span>
      <StatusBadge status={project.status} />
    </Link>
  );
}
