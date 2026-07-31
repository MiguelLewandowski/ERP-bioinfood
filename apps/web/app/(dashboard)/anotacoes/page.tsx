import { cookies } from 'next/headers';
import { notesApi } from '@/lib/api-hooks';
import { NotesClient } from './_components/notes-client';

/**
 * A API resolve o dono pelo token — não há (e não deve haver) parâmetro de
 * usuário nesta rota. É o que torna a anotação privada, inclusive do ADMIN.
 */
export default async function AnotacoesPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('access_token')?.value ?? '';

  const notes = await notesApi.list(token);

  return <NotesClient initialNotes={notes} />;
}
