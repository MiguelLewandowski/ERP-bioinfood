import { Clock, User2, Folder, Lock, Link2, AlertTriangle } from 'lucide-react';
import type { ActivityDto } from '@bioinfood/shared';
import { STATUS_META, PRIORITY_META, formatTime, isOverdue } from '@/lib/activities';

interface ActivityCardProps {
  activity: ActivityDto;
  showProject?: boolean;
  onClick?: (activity: ActivityDto) => void;
}

export function ActivityCard({ activity, showProject = true, onClick }: ActivityCardProps) {
  const status = STATUS_META[activity.status];
  const priority = PRIORITY_META[activity.priority];
  const time = formatTime(activity);
  // Bloqueada enquanto alguma antecessora não estiver concluída.
  const blockingPredecessors = activity.predecessors.filter((p) => p.status !== 'DONE');
  const isBlocked = blockingPredecessors.length > 0;
  const overdue = isOverdue(activity);
  const clickable = !!onClick;

  return (
    <div
      onClick={clickable ? () => onClick!(activity) : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick!(activity); } } : undefined}
      className={`flex items-start gap-3 rounded-lg border bg-white px-4 py-3 transition-colors ${
        overdue ? 'border-[#F5C2C6]' : 'border-gray-200'
      } ${clickable ? 'cursor-pointer hover:border-[#52B552] focus:border-[#52B552] focus:outline-none' : 'hover:border-gray-300'}`}
    >
      <span
        className="mt-1 h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: priority.color }}
        title={`Prioridade: ${priority.label}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-[#1D1D1B]">{activity.title}</p>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ backgroundColor: status.bg, color: status.color }}
          >
            {status.label}
          </span>
          {isBlocked && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: '#FBE3E5', color: '#D64550' }}
              title="Aguardando a conclusão da atividade antecessora"
            >
              <Lock size={10} /> Bloqueada
            </span>
          )}
          {overdue && (
            <span
              className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: '#FBE3E5', color: '#D64550' }}
              title="Prazo vencido e ainda não concluída"
            >
              <AlertTriangle size={10} /> Atrasada
            </span>
          )}
        </div>
        {activity.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-[#706F6F]">{activity.description}</p>
        )}
        {activity.predecessors.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-[#878787]">
            <Link2 size={11} />
            <span>Depende de:</span>
            {activity.predecessors.map((p) => (
              <span
                key={p.id}
                className="rounded px-1.5 py-0.5 font-medium"
                style={
                  p.status === 'DONE'
                    ? { backgroundColor: '#DCEFD6', color: '#156D1D' }
                    : { backgroundColor: '#F0F0F0', color: '#575756' }
                }
              >
                {p.title}
              </span>
            ))}
          </div>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#878787]">
          {time && (
            <span className="flex items-center gap-1">
              <Clock size={11} /> {time}
            </span>
          )}
          {activity.assignee && (
            <span className="flex items-center gap-1">
              <User2 size={11} /> {activity.assignee.name}
            </span>
          )}
          {showProject && (
            <span className="flex items-center gap-1">
              <Folder size={11} /> {activity.project.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
