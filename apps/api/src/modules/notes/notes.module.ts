import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NOTES_REPOSITORY } from './domain/notes.repository.interface';
import { NotesPrismaRepository } from './infra/notes.prisma.repository';
import { NotesController } from './infra/notes.controller';
import { ManageNotesUseCase } from './application/manage-notes.use-case';

@Module({
  imports: [PrismaModule],
  controllers: [NotesController],
  providers: [
    { provide: NOTES_REPOSITORY, useClass: NotesPrismaRepository },
    ManageNotesUseCase,
  ],
  // Deliberadamente NÃO exporta o repositório: nenhum outro módulo deve
  // alcançar anotação pessoal. Se um dia precisar, é decisão de privacidade,
  // não de conveniência.
})
export class NotesModule {}
