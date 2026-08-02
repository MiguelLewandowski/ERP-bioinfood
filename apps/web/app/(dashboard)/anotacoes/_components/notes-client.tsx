'use client'; // editor + autosave + seleção de nota

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Plus, NotebookPen, Pin, PinOff, Trash2, Lock, Search } from 'lucide-react';
import type { NoteDto, NoteListItemDto } from '@bioinfood/shared';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { useAuth } from '@/components/providers/auth-provider';
import { useConfirm } from '@/components/providers/confirm-provider';
import { notesApi } from '@/lib/api-hooks';
import { getErrorMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';

/** Espera depois da última tecla antes de gravar. */
const AUTOSAVE_DELAY = 1200;

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved';

interface NotesClientProps {
  initialNotes: NoteListItemDto[];
}

export function NotesClient({ initialNotes }: NotesClientProps) {
  const { token } = useAuth();
  const confirm = useConfirm();

  const [notes, setNotes] = useState<NoteListItemDto[]>(initialNotes);
  const [selectedId, setSelectedId] = useState<string | null>(initialNotes[0]?.id ?? null);
  const [current, setCurrent] = useState<NoteDto | null>(null);
  const [loadingNote, setLoadingNote] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [search, setSearch] = useState('');

  // O `contentHtml` só vem no GET de detalhe — a lista traz prévia em texto
  // puro, para não carregar todo o HTML de todas as notas de uma vez.
  useEffect(() => {
    if (!selectedId) { setCurrent(null); return; }
    let active = true;
    setLoadingNote(true);
    notesApi
      .get(selectedId, token)
      .then((note) => { if (active) { setCurrent(note); setSaveState('idle'); } })
      .catch((err) => { if (active) toast.error(getErrorMessage(err)); })
      .finally(() => { if (active) setLoadingNote(false); });
    return () => { active = false; };
  }, [selectedId, token]);

  const save = useCallback(
    async (id: string, patch: { title?: string; contentHtml?: string }) => {
      setSaveState('saving');
      try {
        const updated = await notesApi.update(id, patch, token);
        setSaveState('saved');
        setNotes((prev) =>
          prev.map((n) => (n.id === id
            ? { ...n, title: updated.title, updatedAt: updated.updatedAt }
            : n)),
        );
      } catch (err) {
        setSaveState('dirty');
        toast.error(getErrorMessage(err));
      }
    },
    [token],
  );

  // Autosave com debounce. O timer vive num ref para o efeito de limpeza
  // alcançá-lo — e para trocar de nota não deixar um save pendente da anterior
  // gravando por cima da nova.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<{ id: string; patch: { title?: string; contentHtml?: string } } | null>(null);

  const flush = useCallback(() => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    const p = pending.current;
    pending.current = null;
    if (p) void save(p.id, p.patch);
  }, [save]);

  function scheduleSave(id: string, patch: { title?: string; contentHtml?: string }) {
    setSaveState('dirty');
    pending.current = { id, patch: { ...pending.current?.patch, ...patch } };
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, AUTOSAVE_DELAY);
  }

  // Sair da página com alteração pendente perderia o que foi digitado. Mesma
  // rede usada no TAP depois que o botão "Salvar" saiu de lá.
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saveState === 'dirty' || saveState === 'saving') e.preventDefault();
    }
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveState]);

  // Grava o pendente ao desmontar (navegou para outra rota do app).
  useEffect(() => () => { if (timer.current) flush(); }, [flush]);

  async function createNote() {
    flush();
    try {
      const created = await notesApi.create({ title: 'Sem título' }, token);
      setNotes((prev) => [
        { id: created.id, title: created.title, preview: '', pinned: false, updatedAt: created.updatedAt },
        ...prev,
      ]);
      setSelectedId(created.id);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function togglePin(note: NoteListItemDto) {
    try {
      const updated = await notesApi.update(note.id, { pinned: !note.pinned }, token);
      setNotes((prev) => {
        const next = prev.map((n) => (n.id === note.id ? { ...n, pinned: updated.pinned } : n));
        // Mesma ordenação do backend: fixadas primeiro, depois por atualização.
        return next.sort((a, b) =>
          Number(b.pinned) - Number(a.pinned)
          || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  async function removeNote(note: NoteListItemDto) {
    const ok = await confirm({
      title: `Excluir "${note.title}"?`,
      description: 'A anotação sai da sua lista. Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
      variant: 'destructive',
    });
    if (!ok) return;

    try {
      await notesApi.remove(note.id, token);
      setNotes((prev) => {
        const next = prev.filter((n) => n.id !== note.id);
        if (selectedId === note.id) setSelectedId(next[0]?.id ?? null);
        return next;
      });
      toast.success('Anotação excluída');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  const term = search.trim().toLowerCase();
  const visible = term
    ? notes.filter((n) =>
        n.title.toLowerCase().includes(term) || n.preview.toLowerCase().includes(term))
    : notes;

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Anotações</h1>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock size={13} />
            Só você vê estas anotações — nem um administrador tem acesso a elas
          </p>
        </div>
        <Button onClick={createNote}>
          <Plus size={16} /> Nova anotação
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* ── Lista ── */}
        <aside className="flex w-full shrink-0 flex-col rounded-xl border border-border bg-card lg:w-72">
          <div className="border-b border-border p-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Buscar nas suas anotações"
                placeholder="Buscar…"
                className="w-full rounded-lg border border-border bg-background py-1.5 pl-9 pr-3 text-sm focus:border-ring focus:outline-none"
              />
            </div>
          </div>

          <ul className="min-h-0 flex-1 overflow-y-auto p-2">
            {visible.length === 0 ? (
              <li className="px-2 py-8 text-center text-xs text-muted-foreground">
                {notes.length === 0 ? 'Nenhuma anotação ainda.' : 'Nada bate com a busca.'}
              </li>
            ) : (
              visible.map((note) => (
                <li key={note.id}>
                  <button
                    onClick={() => { flush(); setSelectedId(note.id); }}
                    className={cn(
                      'group w-full rounded-lg px-2.5 py-2 text-left transition-colors',
                      selectedId === note.id ? 'bg-muted' : 'hover:bg-muted/50',
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      {note.pinned && <Pin size={11} className="shrink-0 text-primary" />}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                        {note.title}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); togglePin(note); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault(); e.stopPropagation(); togglePin(note);
                          }
                        }}
                        title={note.pinned ? 'Desafixar' : 'Fixar no topo'}
                        aria-label={note.pinned ? `Desafixar ${note.title}` : `Fixar ${note.title}`}
                        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        {note.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                      </span>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); removeNote(note); }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault(); e.stopPropagation(); removeNote(note);
                          }
                        }}
                        title="Excluir"
                        aria-label={`Excluir ${note.title}`}
                        className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
                      >
                        <Trash2 size={12} />
                      </span>
                    </div>
                    {note.preview && (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{note.preview}</p>
                    )}
                    <p className="mt-0.5 text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        {/* ── Editor ── */}
        <section className="flex min-h-0 flex-1 flex-col">
          {!selectedId || !current ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-border bg-card">
              <EmptyState
                icon={NotebookPen}
                title={loadingNote ? 'Abrindo…' : 'Nenhuma anotação selecionada'}
                description={
                  notes.length === 0
                    ? 'Crie sua primeira anotação. Ela fica visível só para você.'
                    : 'Escolha uma anotação na lista ao lado.'
                }
                action={
                  notes.length === 0
                    ? <Button onClick={createNote}><Plus size={14} /> Nova anotação</Button>
                    : undefined
                }
              />
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex items-center gap-3">
                <input
                  value={current.title}
                  onChange={(e) => {
                    const title = e.target.value;
                    setCurrent((c) => (c ? { ...c, title } : c));
                    scheduleSave(current.id, { title });
                  }}
                  onBlur={flush}
                  aria-label="Título da anotação"
                  placeholder="Sem título"
                  className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 text-lg font-bold text-foreground transition-colors placeholder:text-muted-foreground hover:border-border focus:border-ring focus:outline-none"
                />
                <SaveIndicator state={saveState} />
              </div>

              <RichTextEditor
                // `key` remonta o editor ao trocar de nota: sem isso o
                // histórico de desfazer atravessaria de uma nota para outra.
                key={current.id}
                value={current.contentHtml ?? ''}
                onChange={(html) => {
                  setCurrent((c) => (c ? { ...c, contentHtml: html } : c));
                  scheduleSave(current.id, { contentHtml: html });
                }}
                onBlur={flush}
                placeholder="Escreva aqui. Use a barra acima para títulos, listas e checklists."
                minHeight={420}
                className="min-h-0 flex-1"
                aria-label="Conteúdo da anotação"
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;

  const label = state === 'saving'
    ? 'Salvando…'
    : state === 'saved'
      ? 'Salvo'
      : 'Alterações não salvas';

  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap text-xs',
        state === 'saved' ? 'text-primary' : 'text-muted-foreground',
      )}
    >
      {label}
    </span>
  );
}
