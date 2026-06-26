'use client';
// Client Component: manages dialog open state and optimistic list update.

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectDto, SystemRole } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import ProjectCard from './project-card';
import ProjectDialog from './project-dialog';

interface ProjectsClientProps {
  projects: ProjectDto[];
}

const canCreate = (role: SystemRole) => role === 'ADMIN' || role === 'APROVA';

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  const { session } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  function onCreated() {
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        {canCreate(session.role) && (
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
          >
            + Novo Projeto
          </button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <span className="text-3xl">📁</span>
          </div>
          <h3 className="text-lg font-semibold text-[#575756]">Nenhum projeto encontrado</h3>
          <p className="text-sm text-[#706F6F] mt-1 mb-4">Crie o primeiro projeto para começar</p>
          {canCreate(session.role) && (
            <button
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              + Novo Projeto
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />
    </>
  );
}
