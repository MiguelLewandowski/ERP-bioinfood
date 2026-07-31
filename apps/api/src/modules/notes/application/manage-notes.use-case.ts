import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { INotesRepository, NOTES_REPOSITORY } from '../domain/notes.repository.interface';
import { CreateNoteData, UpdateNoteData } from '../domain/note.entity';
import { sanitizeRichText } from '../../../common/sanitize/rich-text';

@Injectable()
export class ManageNotesUseCase {
  constructor(@Inject(NOTES_REPOSITORY) private repo: INotesRepository) {}

  list(ownerId: string) {
    return this.repo.findAllByOwner(ownerId);
  }

  async get(ownerId: string, id: string) {
    const note = await this.repo.findByIdForOwner(ownerId, id);
    // 404, nunca 403: um 403 confirmaria que a nota EXISTE e é de outra
    // pessoa. Para quem não é dono, a nota simplesmente não existe.
    if (!note) throw new NotFoundException('Anotação não encontrada');
    return note;
  }

  create(ownerId: string, data: CreateNoteData) {
    return this.repo.create(ownerId, this.clean(data));
  }

  async update(ownerId: string, id: string, data: UpdateNoteData) {
    const note = await this.repo.update(ownerId, id, this.clean(data));
    if (!note) throw new NotFoundException('Anotação não encontrada');
    return note;
  }

  async remove(ownerId: string, id: string) {
    const removed = await this.repo.softDelete(ownerId, id);
    if (!removed) throw new NotFoundException('Anotação não encontrada');
  }

  /**
   * Sanitiza o HTML na camada de aplicação — o mesmo ponto único do TAP.
   * Título é texto puro: qualquer markup nele é escapado virando texto.
   */
  private clean<T extends CreateNoteData>(data: T): T {
    return {
      ...data,
      ...(data.title !== undefined ? { title: data.title.trim().slice(0, 200) } : {}),
      ...(data.contentHtml !== undefined
        ? { contentHtml: sanitizeRichText(data.contentHtml) }
        : {}),
    };
  }
}
