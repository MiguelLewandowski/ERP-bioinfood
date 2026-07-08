import {
  Controller, Get, Post, Patch, Delete, Param, Body, HttpCode, UseGuards,
} from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ListPipelinesUseCase } from '../application/list-pipelines.use-case';
import { GetPipelineUseCase } from '../application/get-pipeline.use-case';
import { CreatePipelineUseCase } from '../application/create-pipeline.use-case';
import { UpdatePipelineUseCase } from '../application/update-pipeline.use-case';
import { DeletePipelineUseCase } from '../application/delete-pipeline.use-case';
import { ManageStagesUseCase } from '../application/manage-stages.use-case';
import { GetPipelineSummaryUseCase } from '../application/get-pipeline-summary.use-case';
import { CreatePipelineDto, UpdatePipelineDto } from './dto/pipeline.dto';
import { CreateStageDto, UpdateStageDto, ReorderStagesDto } from './dto/stage.dto';
import { toPipelineDto, toStageDto } from './pipeline.mapper';

// Configurar funis = só ADMIN. Ler (kanban/relatórios) = todos os papéis internos.
@Controller('pipelines')
@UseGuards(RolesGuard)
@Roles(SystemRole.ADMIN, SystemRole.APROVA, SystemRole.INSERE, SystemRole.CONSULTA)
export class PipelinesController {
  constructor(
    private listPipelines: ListPipelinesUseCase,
    private getPipeline: GetPipelineUseCase,
    private createPipeline: CreatePipelineUseCase,
    private updatePipeline: UpdatePipelineUseCase,
    private deletePipeline: DeletePipelineUseCase,
    private manageStages: ManageStagesUseCase,
    private getSummary: GetPipelineSummaryUseCase,
  ) {}

  @Get()
  async list() {
    return (await this.listPipelines.execute()).map(toPipelineDto);
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return toPipelineDto(await this.getPipeline.execute(id));
  }

  @Get(':id/summary')
  summary(@Param('id') id: string) {
    return this.getSummary.execute(id);
  }

  @Post()
  @Roles(SystemRole.ADMIN)
  async create(@Body() dto: CreatePipelineDto) {
    return toPipelineDto(await this.createPipeline.execute(dto));
  }

  @Patch(':id')
  @Roles(SystemRole.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdatePipelineDto) {
    return toPipelineDto(await this.updatePipeline.execute(id, dto));
  }

  @Delete(':id')
  @Roles(SystemRole.ADMIN)
  @HttpCode(204)
  async remove(@Param('id') id: string) {
    await this.deletePipeline.execute(id);
  }

  @Post(':id/stages')
  @Roles(SystemRole.ADMIN)
  async addStage(@Param('id') id: string, @Body() dto: CreateStageDto) {
    return toStageDto(await this.manageStages.add(id, dto));
  }

  // Static 'reorder' must be declared before ':stageId'.
  @Patch(':id/stages/reorder')
  @Roles(SystemRole.ADMIN)
  async reorderStages(@Param('id') id: string, @Body() dto: ReorderStagesDto) {
    await this.manageStages.reorder(id, dto.items);
    return { ok: true };
  }

  @Patch(':id/stages/:stageId')
  @Roles(SystemRole.ADMIN)
  async updateStage(
    @Param('id') id: string,
    @Param('stageId') stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return toStageDto(await this.manageStages.update(id, stageId, dto));
  }

  @Delete(':id/stages/:stageId')
  @Roles(SystemRole.ADMIN)
  @HttpCode(204)
  async removeStage(@Param('id') id: string, @Param('stageId') stageId: string) {
    await this.manageStages.remove(id, stageId);
  }
}
