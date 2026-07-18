import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { projectsApi } from '@/lib/api-hooks';
import { ApiError } from '@/lib/errors';
import { ProjectHeader } from './_components/project-header';
import { ProjectNav } from './_components/project-nav';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const project = await projectsApi.get(id, token).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err; // outros erros borbulham para o error boundary
  });

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader name={project.name} status={project.status} projectId={id} client={project.client} />
      <ProjectNav projectId={id} />
      <div className="flex-1 overflow-y-auto bg-muted/40">
        {children}
      </div>
    </div>
  );
}
