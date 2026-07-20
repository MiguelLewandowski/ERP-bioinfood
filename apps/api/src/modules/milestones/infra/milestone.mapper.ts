import { MilestoneEntity } from '../domain/milestone.entity';

export interface MilestoneDto {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  date: Date;
  reached: boolean;
  order: number;
}

export function toMilestoneDto(m: MilestoneEntity): MilestoneDto {
  return {
    id: m.id,
    projectId: m.projectId,
    title: m.title,
    description: m.description,
    date: m.date,
    reached: m.reached,
    order: m.order,
  };
}
