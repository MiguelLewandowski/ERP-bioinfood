import { cn } from '@/lib/utils';

/**
 * Renderiza texto rico em modo leitura, com a MESMA folha de estilo do editor
 * (`.rich-text` em globals.css) — o que se vê ao ler é o que se viu ao escrever.
 *
 * ## Por que `dangerouslySetInnerHTML` aqui não é descuido
 *
 * O HTML já passou pela allowlist do servidor
 * (`apps/api/src/common/sanitize/rich-text.ts`) no momento da escrita: `script`,
 * `style`, `iframe`, todo `on*` e `javascript:` em `href` não sobrevivem ao
 * `PUT`. A sanitização é **na escrita**, ponto único, e não na leitura —
 * sanitizar de novo aqui duplicaria a regra em dois lugares que podem divergir.
 *
 * A consequência prática: **nunca** passar para este componente HTML que não
 * tenha vindo do banco por aquele caminho. Conteúdo de origem nova (importação,
 * colagem direta, integração) precisa passar pelo sanitizador antes.
 */
interface RichTextContentProps {
  html: string | null | undefined;
  className?: string;
  /** Texto exibido quando não há conteúdo. */
  emptyLabel?: string;
}

export function RichTextContent({ html, className, emptyLabel }: RichTextContentProps) {
  const isEmpty = !html || html.trim() === '' || html === '<p></p>';

  if (isEmpty) {
    return emptyLabel ? (
      <p className={cn('text-sm italic text-muted-foreground', className)}>{emptyLabel}</p>
    ) : null;
  }

  return (
    <div
      className={cn('rich-text', className)}
      dangerouslySetInnerHTML={{ __html: html as string }}
    />
  );
}
