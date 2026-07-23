import { cookies } from 'next/headers';
import { milestonesApi, projectsApi, tasksApi } from '@/lib/api-hooks';
import { GanttClient } from './_components/gantt-client';
import { extractMembers } from '@/lib/project-members';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function GanttPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const [project, tasks, milestones] = await Promise.all([
    projectsApi.get(id, token),
    tasksApi.list(id, token),
    milestonesApi.list(id, token),
  ]);

  return (
    <GanttClient
      projectId={id}
      tasks={tasks}
      milestones={milestones}
      members={extractMembers(project)}
      projectStart={project.startDate ?? null}
      projectEnd={project.endDate ?? null}
      baselineSetAt={project.baselineSetAt ?? null}
      baselineSetByName={project.baselineSetBy?.name ?? null}
    />
  );
}
