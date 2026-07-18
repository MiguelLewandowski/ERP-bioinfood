import { cookies } from 'next/headers';
import { projectsApi } from '@/lib/api-hooks';
import { PageHeader } from '@/components/ui/page-header';
import ProjectsClient from '@/components/projects/projects-client';

export default async function ProjectsPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';
  // Erro de API borbulha para o error.tsx do segmento.
  const projects = await projectsApi.list(token);

  return (
    <div className="p-6">
      <PageHeader title="Projetos" description="Acompanhamento de projetos em andamento" />
      <ProjectsClient projects={projects} />
    </div>
  );
}
