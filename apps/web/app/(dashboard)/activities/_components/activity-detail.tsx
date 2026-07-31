'use client'; // dialog de detalhe + navegação para o projeto

import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User2, Folder, CalendarRange, ArrowUpRight, Lock, AlertTriangle, Link2 } from 'lucide-react';
import type { ActivityDto } from '@bioinfood/shared';
import { STATUS_META, PRIORITY_META, isOverdue } from '@/lib/activities';
import { hasTimeComponent, parseCalendarDate } from '@/lib/dates';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ActivityDetailProps {
  activity: ActivityDto;
  onClose: () => void;
}

/**
 * Formata início/prazo da atividade.
 *
 * Era `format(new Date(date), "… HH:mm").replace(', 00:00', '')` — e errava duas
 * vezes no mesmo campo. `Task.startDate`/`dueDate` são **dia de calendário**,
 * gravados como meia-noite UTC; `new Date()` os lê em hora local e, em
 * `America/Sao_Paulo`, viram 21:00 do dia **anterior**. O `replace(', 00:00')`
 * nunca disparava, porque nunca era `00:00`.
 *
 * Efeito na tela: uma atividade de 02/08 a 21/08 aparecia como
 * "01 de ago 2026, 21:00 — 20 de ago 2026, 21:00". Ver o achado A2 de
 * docs/analise-uiux-atividades.md.
 *
 * Atividade com hora de verdade (uma reunião às 14h) continua exibindo a hora —
 * é o que `hasTimeComponent` separa.
 */
function fmt(date: string | null): string {
  if (!date) return '—';
  if (hasTimeComponent(date)) {
    return format(parseISO(date), "dd 'de' MMM yyyy, HH:mm", { locale: ptBR });
  }
  return format(parseCalendarDate(date), "dd 'de' MMM yyyy", { locale: ptBR });
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
      {/* Coluna flex: o corpo rola e o rodapé com os botões fica sempre
          visível, mesmo em notebooks baixos com descrição/predecessoras longas. */}
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0">
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-6">
        <div className="flex items-start gap-2 pr-8">
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: priority.color }}
            title={`Prioridade: ${priority.label}`}
          />
          <DialogTitle className="leading-snug">{activity.title}</DialogTitle>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
          <p className="whitespace-pre-line text-sm text-muted-foreground">{activity.description}</p>
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
        </div>

        <div className="flex shrink-0 flex-col-reverse justify-end gap-2 border-t border-border px-6 py-4 sm:flex-row sm:gap-3">
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          <Button onClick={openInProject}>
            Abrir no projeto <ArrowUpRight size={15} />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
