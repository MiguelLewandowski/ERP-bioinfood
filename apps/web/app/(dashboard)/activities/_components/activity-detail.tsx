'use client'; // dialog de detalhe + navegação para o projeto

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { X, User2, Folder, CalendarRange, ArrowUpRight, Lock, AlertTriangle, Link2 } from 'lucide-react';
import type { ActivityDto } from '@bioinfood/shared';
import { STATUS_META, PRIORITY_META, isOverdue } from '@/lib/activities';

interface ActivityDetailProps {
  activity: ActivityDto;
  onClose: () => void;
}

function fmt(date: string | null): string {
  if (!date) return '—';
  return format(new Date(date), "dd 'de' MMM yyyy, HH:mm", { locale: ptBR }).replace(', 00:00', '');
}

export function ActivityDetail({ activity, onClose }: ActivityDetailProps) {
  const router = useRouter();
  const status = STATUS_META[activity.status];
  const priority = PRIORITY_META[activity.priority];
  const overdue = isOverdue(activity);
  const blocking = activity.predecessors.filter((p) => p.status !== 'DONE');

  function openInProject() {
    router.push(`/projects/${activity.project.id}/backlog?task=${activity.id}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <span
              className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: priority.color }}
              title={`Prioridade: ${priority.label}`}
            />
            <h2 className="text-lg font-semibold leading-snug text-[#1D1D1B]">{activity.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded p-0.5 text-[#706F6F] hover:text-[#575756] focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-[#575756]">
            Prioridade: {priority.label}
          </span>
          {blocking.length > 0 && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: '#FBE3E5', color: '#D64550' }}>
              <Lock size={11} /> Bloqueada
            </span>
          )}
          {overdue && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: '#FBE3E5', color: '#D64550' }}>
              <AlertTriangle size={11} /> Atrasada
            </span>
          )}
        </div>

        {activity.description && (
          <p className="mb-4 whitespace-pre-line text-sm text-[#706F6F]">{activity.description}</p>
        )}

        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-[#575756]">
            <Folder size={14} className="text-[#878787]" />
            <span className="text-[#878787]">Projeto:</span> {activity.project.name}
          </div>
          <div className="flex items-center gap-2 text-[#575756]">
            <User2 size={14} className="text-[#878787]" />
            <span className="text-[#878787]">Responsável:</span> {activity.assignee?.name ?? 'Não atribuído'}
          </div>
          <div className="flex items-center gap-2 text-[#575756]">
            <CalendarRange size={14} className="text-[#878787]" />
            <span className="text-[#878787]">Período:</span> {fmt(activity.startDate)} — {fmt(activity.dueDate)}
          </div>
          {activity.predecessors.length > 0 && (
            <div className="flex items-start gap-2 text-[#575756]">
              <Link2 size={14} className="mt-0.5 text-[#878787]" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[#878787]">Depende de:</span>
                {activity.predecessors.map((p) => (
                  <span
                    key={p.id}
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={p.status === 'DONE'
                      ? { backgroundColor: '#DCEFD6', color: '#156D1D' }
                      : { backgroundColor: '#F0F0F0', color: '#575756' }}
                  >
                    {p.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </dl>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-[#575756] hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#52B552]"
          >
            Fechar
          </button>
          <button
            onClick={openInProject}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#156D1D] focus:outline-none focus:ring-2 focus:ring-[#52B552]"
            style={{ backgroundColor: '#147F23' }}
          >
            Abrir no projeto <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
