import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { ProjectHeader } from './_components/project-header';
import { ProjectNav } from './_components/project-nav';

async function getProject(id: string, token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch project');
  return res.json();
}

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const project = await getProject(id, token);
  if (!project) notFound();

  return (
    <div className="flex flex-col h-full">
      <ProjectHeader name={project.name} status={project.status} projectId={id} />
      <ProjectNav projectId={id} />
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </div>
    </div>
  );
}
