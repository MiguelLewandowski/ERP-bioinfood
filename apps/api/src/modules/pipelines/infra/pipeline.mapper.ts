import { Pipeline, PipelineStageItem } from '../domain/pipeline.entity';

export interface StageDto {
  id: string;
  name: string;
  type: string;
  probability: number;
  color: string | null;
  order: number;
  isActive: boolean;
}

export interface PipelineDto {
  id: string;
  name: string;
  abbreviation: string;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  stages: StageDto[];
}

export function toStageDto(s: PipelineStageItem): StageDto {
  return {
    id: s.id, name: s.name, type: s.type, probability: s.probability,
    color: s.color, order: s.order, isActive: s.isActive,
  };
}

export function toPipelineDto(p: Pipeline): PipelineDto {
  return {
    id: p.id,
    name: p.name,
    abbreviation: p.abbreviation,
    isDefault: p.isDefault,
    isActive: p.isActive,
    order: p.order,
    stages: p.stages.map(toStageDto),
  };
}
