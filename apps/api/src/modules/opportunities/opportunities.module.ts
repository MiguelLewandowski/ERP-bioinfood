import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { OPPORTUNITY_REPOSITORY } from './domain/opportunity.repository';
import { OpportunitiesPrismaRepository } from './infra/opportunities.prisma.repository';
import { OpportunitiesController } from './infra/opportunities.controller';
import { ListOpportunitiesUseCase } from './application/list-opportunities.use-case';
import { ListOrgOpportunitiesUseCase } from './application/list-org-opportunities.use-case';
import { CreateOpportunityUseCase } from './application/create-opportunity.use-case';
import { UpdateOpportunityUseCase } from './application/update-opportunity.use-case';
import { DeleteOpportunityUseCase } from './application/delete-opportunity.use-case';
import { MoveOpportunityUseCase } from './application/move-opportunity.use-case';
import { ReorderOpportunitiesUseCase } from './application/reorder-opportunities.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [OpportunitiesController],
  providers: [
    { provide: OPPORTUNITY_REPOSITORY, useClass: OpportunitiesPrismaRepository },
    ListOpportunitiesUseCase,
    ListOrgOpportunitiesUseCase,
    CreateOpportunityUseCase,
    UpdateOpportunityUseCase,
    DeleteOpportunityUseCase,
    MoveOpportunityUseCase,
    ReorderOpportunitiesUseCase,
  ],
})
export class OpportunitiesModule {}
