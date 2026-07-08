import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { INTERACTION_REPOSITORY } from './domain/interaction.repository';
import { InteractionsPrismaRepository } from './infra/interactions.prisma.repository';
import { InteractionsController } from './infra/interactions.controller';
import { ListInteractionsUseCase } from './application/list-interactions.use-case';
import { CreateInteractionUseCase } from './application/create-interaction.use-case';
import { UpdateInteractionUseCase } from './application/update-interaction.use-case';
import { DeleteInteractionUseCase } from './application/delete-interaction.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [InteractionsController],
  providers: [
    { provide: INTERACTION_REPOSITORY, useClass: InteractionsPrismaRepository },
    ListInteractionsUseCase,
    CreateInteractionUseCase,
    UpdateInteractionUseCase,
    DeleteInteractionUseCase,
  ],
})
export class InteractionsModule {}
