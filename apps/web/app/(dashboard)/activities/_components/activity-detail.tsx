'use client'; // dialog de detalhe + navegação para o projeto

import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User2, Folder, CalendarRange, ArrowUpRight, Lock, AlertTriangle, Link2 } from 'lucide-react';
import type { ActivityDto } from '@bioinfood/shared';
import { STATUS_META, PRIORITY_META, isOverdue } from '@/lib/activities';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

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
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <div className="flex items-start gap-2 pr-6">
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: priority.color }}
            title={`Prioridade: ${priority.label}`}
          />
          <DialogTitle className="leading-snug">{activity.title}</DialogTitle>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
            Prioridade: {priority.label}
          </span>
          {blocking.length > 0 && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}>
              <Lock size={11} /> Bloqueada
            </span>
          )}
          {overdue && (
            <span className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold" style={{ backgroundColor: 'hsl(var(--destructive) / 0.1)', color: 'hsl(var(--destructive))' }}>
              <AlertTriangle size={11} /> Atrasada
            </span>
          )}
        </div>

        {activity.description && (
          <p className="mb-4 whitespace-pre-line text-sm text-muted-foreground">{activity.description}</p>
        )}

        <dl className="space-y-2.5 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Folder size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Projeto:</span> {activity.project.name}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User2 size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Responsável:</span> {activity.assignee?.name ?? 'Não atribuído'}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarRange size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Período:</span> {fmt(activity.startDate)} — {fmt(activity.dueDate)}
          </div>
          {activity.predecessors.length > 0 && (
            <div className="flex items-start gap-2 text-muted-foreground">
              <Link2 size={14} className="mt-0.5 text-muted-foreground" />
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-muted-foreground">Depende de:</span>
                {activity.predecessors.map((p) => (
                  <span
                    key={p.id}
                    className="rounded px-1.5 py-0.5 text-[11px] font-medium"
                    style={p.status === 'DONE'
                      ? { backgroundColor: 'hsl(var(--success) / 0.2)', color: 'hsl(var(--primary-dark))' }
                      : { backgroundColor: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
                  >
                    {p.title}
                  </span>
                ))}
              </div>
            </div>
          )}
        </dl>

        <div className="mt-2 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={openInProject}>
            Abrir no projeto <ArrowUpRight size={15} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
