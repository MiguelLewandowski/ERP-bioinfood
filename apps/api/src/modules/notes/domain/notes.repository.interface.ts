import { CreateNoteData, NoteEntity, UpdateNoteData } from './note.entity';

export const NOTES_REPOSITORY = 'NOTES_REPOSITORY';

/**
 * ⚠️ LEIA ANTES DE ACRESCENTAR MÉTODO AQUI.
 *
 * **Toda** operação recebe `ownerId` como PRIMEIRO parâmetro e filtra por ele.
 * É esta forma — e só ela — que torna a nota privada:
 *
 * - não existe `findById(id)` sem dono. Se existisse, um dia alguém chamaria
 *   sem filtrar e o vazamento apareceria sem nenhum aviso do compilador;
 * - não existe listagem global, nem "todas as notas", nem contagem por usuário;
 * - o `ownerId` vem SEMPRE do JWT no controller, nunca do corpo ou da query.
 *
 * ADMIN não é caso especial em lugar nenhum: ele chama os mesmos métodos com o
 * próprio id e recebe as próprias notas. A privacidade não depende de um guard
 * lembrar de barrar — depende de não haver caminho para pedir a nota de outro.
 */
export interface INotesRepository {
  findAllByOwner(ownerId: string): Promise<NoteEntity[]>;
  /** Devolve null quando a nota não existe OU não é do dono — indistinguível. */
  findByIdForOwner(ownerId: string, id: string): Promise<NoteEntity | null>;
  create(ownerId: string, data: CreateNoteData): Promise<NoteEntity>;
  update(ownerId: string, id: string, data: UpdateNoteData): Promise<NoteEntity | null>;
  softDelete(ownerId: string, id: string): Promise<boolean>;
}
