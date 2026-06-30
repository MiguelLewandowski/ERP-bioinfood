'use client';
// Client Component: manages view mode, status filter, export modal and create dialog.

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutGrid, Table as TableIcon, FileDown, FileSpreadsheet, X, Download,
} from 'lucide-react';
import type { ProjectDto, ProjectStatus, SystemRole } from '@bioinfood/shared';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';
import {
  buildProjectsCsv, buildProjectsReportHtml, downloadCsv, printHtml,
  PROJECT_COLUMNS, PROJECT_STATUS_LABELS, DEFAULT_COLUMN_KEYS,
  type ProjectColumnKey,
} from '@/lib/project-report';
import ProjectCard from './project-card';
import ProjectsTable from './projects-table';
import ProjectDialog from './project-dialog';

interface ProjectsClientProps {
  projects: ProjectDto[];
}

type ViewMode = 'grid' | 'table';

const canCreate = (role: SystemRole) => role === 'ADMIN' || role === 'APROVA';
const STATUS_ORDER: ProjectStatus[] = [
  'PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED',
];

export default function ProjectsClient({ projects }: ProjectsClientProps) {
  const { session } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>([]);
  const [exportOpen, setExportOpen] = useState(false);

  // Lista filtrada por status (vazio = todos). Alimenta exibição e exportação.
  const filtered = useMemo(
    () => (statusFilter.length === 0
      ? projects
      : projects.filter((p) => statusFilter.includes(p.status))),
    [projects, statusFilter],
  );

  function onCreated() {
    setOpen(false);
    router.refresh();
  }

  function toggleStatus(status: ProjectStatus) {
    setStatusFilter((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Alternância de visualização */}
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
          <button
            onClick={() => setView('grid')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'grid' ? 'bg-[#147F23] text-white' : 'text-[#575756] hover:bg-gray-50',
            )}
          >
            <LayoutGrid size={14} /> Cards
          </button>
          <button
            onClick={() => setView('table')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              view === 'table' ? 'bg-[#147F23] text-white' : 'text-[#575756] hover:bg-gray-50',
            )}
          >
            <TableIcon size={14} /> Tabela
          </button>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <button
              onClick={() => setExportOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-[#575756] hover:bg-gray-50 transition-colors"
            >
              <Download size={14} /> Exportar relatório
            </button>
          )}
          {canCreate(session.role) && (
            <button
              onClick={() => setOpen(true)}
              className="px-4 py-2 rounded-lg text-white text-sm font-medium bg-[#147F23] hover:bg-[#156D1D] transition-colors focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            >
              + Novo Projeto
            </button>
          )}
        </div>
      </div>

      {/* Filtro por status */}
      {projects.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-[#878787]">Status:</span>
          <button
            onClick={() => setStatusFilter([])}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
              statusFilter.length === 0
                ? 'border-[#147F23] bg-[#147F23] text-white'
                : 'border-gray-200 text-[#575756] hover:bg-gray-50',
            )}
          >
            Todos
          </button>
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              onClick={() => toggleStatus(status)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                statusFilter.includes(status)
                  ? 'border-[#147F23] bg-[#147F23] text-white'
                  : 'border-gray-200 text-[#575756] hover:bg-gray-50',
              )}
            >
              {PROJECT_STATUS_LABELS[status]}
            </button>
          ))}
          {statusFilter.length > 0 && (
            <span className="text-xs text-[#878787]">
              {filtered.length} de {projects.length}
            </span>
          )}
        </div>
      )}

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
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-16 text-center text-sm text-[#878787]">
          Nenhum projeto com o status selecionado.
        </div>
      ) : view === 'table' ? (
        <ProjectsTable projects={filtered} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}

      <ProjectDialog open={open} onOpenChange={setOpen} onCreated={onCreated} />

      {exportOpen && (
        <ExportModal
          projects={filtered}
          filteredByStatus={statusFilter.length > 0}
          onClose={() => setExportOpen(false)}
        />
      )}
    </>
  );
}

interface ExportModalProps {
  projects: ProjectDto[];
  filteredByStatus: boolean;
  onClose: () => void;
}

function ExportModal({ projects, filteredByStatus, onClose }: ExportModalProps) {
  const [keys, setKeys] = useState<ProjectColumnKey[]>(DEFAULT_COLUMN_KEYS);

  function toggle(key: ProjectColumnKey) {
    setKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  function handleCsv() {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`projetos-${stamp}.csv`, buildProjectsCsv(projects, keys));
    onClose();
  }

  function handlePdf() {
    printHtml(buildProjectsReportHtml(projects, keys));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Download size={16} className="text-[#147F23]" />
            <h3 className="text-sm font-bold text-[#1D1D1B]">Exportar relatório de projetos</h3>
          </div>
          <button onClick={onClose} className="text-[#878787] hover:text-[#1D1D1B]">
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="mb-3 text-xs text-[#706F6F]">
            {projects.length} {projects.length === 1 ? 'projeto será exportado' : 'projetos serão exportados'}
            {filteredByStatus ? ' (filtro de status aplicado).' : '.'}
          </p>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold text-[#575756]">Colunas a incluir</p>
            <div className="flex gap-3 text-[11px]">
              <button
                onClick={() => setKeys(PROJECT_COLUMNS.map((c) => c.key))}
                className="font-medium text-[#147F23] hover:underline"
              >
                Todas
              </button>
              <button
                onClick={() => setKeys(DEFAULT_COLUMN_KEYS)}
                className="font-medium text-[#878787] hover:underline"
              >
                Padrão
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1">
            {PROJECT_COLUMNS.map((col) => (
              <label
                key={col.key}
                className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={keys.includes(col.key)}
                  onChange={() => toggle(col.key)}
                  className="h-4 w-4 rounded border-gray-300 accent-[#147F23]"
                />
                <span className="text-xs font-medium text-[#1D1D1B]">{col.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-[#575756] hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCsv}
            disabled={keys.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-[#575756] hover:bg-gray-50 disabled:opacity-40"
          >
            <FileSpreadsheet size={13} /> CSV
          </button>
          <button
            onClick={handlePdf}
            disabled={keys.length === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: '#147F23' }}
          >
            <FileDown size={13} /> PDF
          </button>
        </div>
      </div>
    </div>
  );
}
