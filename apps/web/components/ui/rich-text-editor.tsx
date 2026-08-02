'use client'; // contenteditable — não existe fora do browser

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import { TaskList } from '@tiptap/extension-list/task-list';
import { TaskItem } from '@tiptap/extension-list/task-item';
import { Placeholder } from '@tiptap/extensions/placeholder';
import {
  Bold, Italic, Strikethrough, Heading2, Heading3,
  List, ListOrdered, ListChecks, Quote, Link2, Undo2, Redo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Editor de texto rico do ERP — único, usado no TAP e nas anotações pessoais.
 *
 * Persiste **HTML**, sanitizado no servidor por
 * `apps/api/src/common/sanitize/rich-text.ts`. O conjunto de marcas produzido
 * aqui tem que caber na allowlist de lá: marca que o editor gera e o
 * sanitizador não conhece some no primeiro salvamento, sem erro nenhum na tela.
 *
 * Texto puro escrito antes do editor existir é HTML válido e vira parágrafo
 * sozinho — por isso não houve migration de dados.
 */
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  /** Disparado ao sair do editor — é o gancho do autosave do TAP. */
  onBlur?: () => void;
  placeholder?: string;
  /** Barra reduzida, para campo de formulário. Sem isto, barra completa. */
  compact?: boolean;
  /** Altura mínima da área de escrita. */
  minHeight?: number;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** HTML que o Tiptap devolve quando o documento está vazio. */
const EMPTY_HTML = '<p></p>';

function isBlank(html: string): boolean {
  return html === '' || html === EMPTY_HTML || html === '<p><br></p>';
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  compact = false,
  minHeight = compact ? 96 : 320,
  disabled = false,
  className,
  'aria-label': ariaLabel,
}: RichTextEditorProps) {
  const editor = useEditor({
    // Sem isto o App Router tenta renderizar contenteditable no servidor e a
    // hidratação diverge. É o passo que a doc do Tiptap para Next.js exige.
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        // Fora da allowlist do servidor — habilitar aqui só produziria
        // formatação que some ao salvar.
        horizontalRule: false,
        codeBlock: false,
        heading: { levels: [2, 3] },
        link: false, // configurado abaixo, com as travas de segurança
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        protocols: ['http', 'https', 'mailto'],
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder: placeholder ?? '' }),
    ],
    content: value || '',
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      // Documento vazio grava string vazia, não `<p></p>`. Sem isto, todo campo
      // em branco contaria como preenchido no menu lateral do TAP.
      onChange(isBlank(html) ? '' : html);
    },
    onBlur: () => onBlur?.(),
    editorProps: {
      attributes: {
        class: 'ProseMirror focus:outline-none px-3 py-2.5',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
      },
    },
  });

  // O valor pode mudar por fora (carregou o TAP, trocou de nota selecionada).
  // Só reescreve quando de fato divergiu do que está na tela — reescrever a cada
  // render mataria o cursor a cada tecla digitada.
  const lastEmitted = useRef(value);
  useEffect(() => {
    if (!editor) return;
    if (value === lastEmitted.current) return;
    const current = editor.getHTML();
    if (current === value || (isBlank(current) && !value)) {
      lastEmitted.current = value;
      return;
    }
    editor.commands.setContent(value || '', { emitUpdate: false });
    lastEmitted.current = value;
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  return (
    <div
      className={cn(
        'rich-text overflow-hidden rounded-lg border border-border bg-background transition-colors',
        'focus-within:border-ring',
        disabled && 'opacity-60',
        className,
      )}
    >
      {!disabled && <Toolbar editor={editor} compact={compact} />}
      <EditorContent editor={editor} style={{ minHeight }} className="cursor-text" />
    </div>
  );
}

function Toolbar({ editor, compact }: { editor: Editor | null; compact: boolean }) {
  if (!editor) {
    // Placeholder da barra enquanto o editor monta — sem isto a caixa "pula"
    // de altura no primeiro paint.
    return <div className="h-9 border-b border-border bg-muted/40" />;
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1.5 py-1">
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive('heading', { level: 2 })}
        label="Título"
      >
        <Heading2 size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive('heading', { level: 3 })}
        label="Subtítulo"
      >
        <Heading3 size={15} />
      </ToolbarButton>

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive('bold')}
        label="Negrito (Ctrl+B)"
      >
        <Bold size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive('italic')}
        label="Itálico (Ctrl+I)"
      >
        <Italic size={15} />
      </ToolbarButton>
      {!compact && (
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          label="Riscado"
        >
          <Strikethrough size={15} />
        </ToolbarButton>
      )}

      <Divider />

      <ToolbarButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive('bulletList')}
        label="Lista com marcadores"
      >
        <List size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive('orderedList')}
        label="Lista numerada"
      >
        <ListOrdered size={15} />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive('taskList')}
        label="Checklist"
      >
        <ListChecks size={15} />
      </ToolbarButton>

      {!compact && (
        <>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            label="Citação"
          >
            <Quote size={15} />
          </ToolbarButton>
          <ToolbarButton onClick={() => promptLink(editor)} active={editor.isActive('link')} label="Link">
            <Link2 size={15} />
          </ToolbarButton>
          <Divider />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            label="Desfazer (Ctrl+Z)"
          >
            <Undo2 size={15} />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            label="Refazer (Ctrl+Shift+Z)"
          >
            <Redo2 size={15} />
          </ToolbarButton>
        </>
      )}

      <span className="ml-auto hidden pr-1 text-[10px] text-muted-foreground sm:block">
        Tab indenta a lista
      </span>
    </div>
  );
}

function promptLink(editor: Editor) {
  const previous = (editor.getAttributes('link').href as string | undefined) ?? '';
  const url = window.prompt('Endereço do link', previous);
  if (url === null) return;
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }
  // Sem esquema explícito o Tiptap aceitaria `javascript:` — o servidor derruba,
  // mas o usuário veria o link "funcionar" até salvar. Barra aqui também.
  const safe = /^(https?:|mailto:)/i.test(url) ? url : `https://${url}`;
  editor.chain().focus().extendMarkRange('link').setLink({ href: safe }).run();
}

function ToolbarButton({
  onClick, active, disabled, label, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button" // dentro de <form>: sem isto, cada clique submeteria o TAP
      onMouseDown={(e) => e.preventDefault()} // não rouba o foco do texto
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        'disabled:pointer-events-none disabled:opacity-40',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-background hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px bg-border" aria-hidden />;
}
