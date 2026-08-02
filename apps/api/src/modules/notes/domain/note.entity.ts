/**
 * Anotação pessoal — ÚNICO dado privado do ERP.
 *
 * Regra: só o dono lê, **nem ADMIN**. Isso não contradiz o RBAC — ele governa
 * papel, e aqui a trava é de posse, que é filtro de dado. Ver
 * `notes.repository.interface.ts` para como a garantia é construída.
 */
export interface NoteEntity {
  id: string;
  ownerId: string;
  title: string;
  contentHtml: string | null;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteData {
  title?: string;
  contentHtml?: string | null;
  pinned?: boolean;
}

export type UpdateNoteData = CreateNoteData;
