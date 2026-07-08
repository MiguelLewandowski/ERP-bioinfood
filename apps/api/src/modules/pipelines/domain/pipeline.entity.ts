import { StageType } from '@prisma/client';

export interface PipelineStageItem {
  id: string;
  name: string;
  type: StageType;
  probability: number;
  color: string | null;
  order: number;
  isActive: boolean;
}

export interface Pipeline {
  id: string;
  name: string;
  isDefault: boolean;
  isActive: boolean;
  order: number;
  stages: PipelineStageItem[];
}

export interface CreateStageData {
  name: string;
  type?: StageType;
  probability?: number;
  color?: string;
  order?: number;
}

export interface UpdateStageData {
  name?: string;
  type?: StageType;
  probability?: number;
  color?: string;
  order?: number;
  isActive?: boolean;
}

export interface CreatePipelineData {
  name: string;
  isDefault?: boolean;
  stages?: CreateStageData[];
}

export interface UpdatePipelineData {
  name?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface ReorderItem {
  id: string;
  order: number;
}

export interface StageSummary {
  stageId: string;
  name: string;
  type: StageType;
  count: number;
  amount: string; // Decimal sum serialized as string
}

export interface PipelineSummary {
  stages: StageSummary[];
  openTotal: string;
  weightedTotal: string;
  wonCount: number;
  lostCount: number;
  conversionRate: number; // 0..1, won / (won + lost); 0 when none closed
}
