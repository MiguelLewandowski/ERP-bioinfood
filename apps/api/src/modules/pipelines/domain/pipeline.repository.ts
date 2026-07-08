import {
  CreatePipelineData,
  CreateStageData,
  Pipeline,
  PipelineStageItem,
  PipelineSummary,
  ReorderItem,
  UpdatePipelineData,
  UpdateStageData,
} from './pipeline.entity';

export const PIPELINE_REPOSITORY = 'PIPELINE_REPOSITORY';

export interface IPipelineRepository {
  findAll(): Promise<Pipeline[]>;
  findById(id: string): Promise<Pipeline | null>;
  create(data: CreatePipelineData): Promise<Pipeline>;
  update(id: string, data: UpdatePipelineData): Promise<Pipeline>;
  softDelete(id: string): Promise<void>;
  clearDefaultExcept(id: string): Promise<void>;
  countPipelines(): Promise<number>;

  findStage(pipelineId: string, stageId: string): Promise<PipelineStageItem | null>;
  addStage(pipelineId: string, data: CreateStageData): Promise<PipelineStageItem>;
  updateStage(stageId: string, data: UpdateStageData): Promise<PipelineStageItem>;
  removeStage(stageId: string): Promise<void>;
  reorderStages(items: ReorderItem[]): Promise<void>;

  // Invariant helpers.
  countActiveOpenStages(pipelineId: string, excludeStageId?: string): Promise<number>;
  countOpportunitiesInStage(stageId: string): Promise<number>;

  summary(pipelineId: string): Promise<PipelineSummary>;
}
