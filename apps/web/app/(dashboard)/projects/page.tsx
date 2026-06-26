import { cookies } from 'next/headers';
import type { ProjectDto } from '@bioinfood/shared';
import ProjectsClient from '@/components/projects/projects-client';

async function getProjects(token: string): Promise<ProjectDto[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return [];
  return res.json();
}

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  const projects = await getProjects(token);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1B]">Projetos</h1>
          <p className="text-sm text-[#706F6F] mt-0.5">Acompanhamento de projetos em andamento</p>
        </div>
      </div>
      <ProjectsClient projects={projects} />
    </div>
  );
}
