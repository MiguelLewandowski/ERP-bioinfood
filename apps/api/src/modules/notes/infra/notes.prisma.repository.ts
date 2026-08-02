import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { INotesRepository } from '../domain/notes.repository.interface';
import { CreateNoteData, NoteEntity, UpdateNoteData } from '../domain/note.entity';

/**
 * Todo `where` daqui carrega `ownerId` **e** `deletedAt: null`. Não há exceção,
 * e não deve passar a haver: é o filtro que faz a nota ser privada.
 *
 * `updateMany`/`deleteMany` em vez de `update`/`delete` nas escritas é
 * deliberado — a variante singular só aceita `where` por campo único, o que
 * obrigaria a buscar por id primeiro e escrever depois, abrindo a janela de
 * escrever na nota de outro entre as duas chamadas. Com `updateMany`, o
 * `ownerId` faz parte do próprio UPDATE.
 */
@Injectable()
export class NotesPrismaRepository implements INotesRepository {
  constructor(private prisma: PrismaService) {}

  async findAllByOwner(ownerId: string): Promise<NoteEntity[]> {
    return this.prisma.note.findMany({
      where: { ownerId, deletedAt: null },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
      take: 500,
    });
  }

  async findByIdForOwner(ownerId: string, id: string): Promise<NoteEntity | null> {
    return this.prisma.note.findFirst({ where: { id, ownerId, deletedAt: null } });
  }

  async create(ownerId: string, data: CreateNoteData): Promise<NoteEntity> {
    return this.prisma.note.create({
      data: {
        ownerId,
        title: data.title?.trim() || 'Sem título',
        contentHtml: data.contentHtml ?? null,
        pinned: data.pinned ?? false,
      },
    });
  }

  async update(ownerId: string, id: string, data: UpdateNoteData): Promise<NoteEntity | null> {
    const { count } = await this.prisma.note.updateMany({
      where: { id, ownerId, deletedAt: null },
      data,
    });
    if (count === 0) return null;
    return this.findByIdForOwner(ownerId, id);
  }

  async softDelete(ownerId: string, id: string): Promise<boolean> {
    const { count } = await this.prisma.note.updateMany({
      where: { id, ownerId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    return count > 0;
  }
}
