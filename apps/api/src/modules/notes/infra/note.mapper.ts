import type { NoteDto, NoteListItemDto } from '@bioinfood/shared';
import { NoteEntity } from '../domain/note.entity';
import { richTextToPlain } from '../../../common/sanitize/rich-text';

/**
 * `ownerId` NÃO entra em nenhum DTO. Não é economia de bytes: é para o dono
 * jamais virar um campo que alguém possa achar que dá para escolher.
 */
export function toNoteDto(note: NoteEntity): NoteDto {
  return {
    id: note.id,
    title: note.title,
    contentHtml: note.contentHtml,
    pinned: note.pinned,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

const PREVIEW_LENGTH = 140;

/** Lista não carrega o HTML inteiro — só uma prévia em texto puro. */
export function toNoteListItemDto(note: NoteEntity): NoteListItemDto {
  const plain = richTextToPlain(note.contentHtml);
  return {
    id: note.id,
    title: note.title,
    preview: plain.length > PREVIEW_LENGTH ? `${plain.slice(0, PREVIEW_LENGTH)}…` : plain,
    pinned: note.pinned,
    updatedAt: note.updatedAt.toISOString(),
  };
}
