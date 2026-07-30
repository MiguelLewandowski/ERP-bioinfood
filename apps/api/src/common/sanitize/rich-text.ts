import sanitizeHtml from 'sanitize-html';

/**
 * Allowlist do texto rico do ERP — ponto ÚNICO por onde passa todo HTML
 * escrito por usuário (campos narrativos do TAP e anotações pessoais).
 *
 * A regra é: o que não está listado aqui **não** chega ao banco. Allowlist, não
 * blocklist — blocklist perde para a próxima entidade HTML esquisita, allowlist
 * não.
 *
 * O conjunto espelha exatamente o que o `RichTextEditor` do web consegue
 * produzir (`apps/web/components/ui/rich-text-editor.tsx`). Mudou lá, muda aqui:
 * marca que o editor gera e o sanitizador não conhece some no primeiro salvamento,
 * e o usuário vê a formatação "não pegar" sem nenhum erro na tela.
 */
const ALLOWED_TAGS = [
  'p', 'br',
  'strong', 'em', 's', 'code',
  'h2', 'h3',
  'ul', 'ol', 'li',
  'blockquote',
  'a',
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ALLOWED_TAGS,
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    // Checklist do Tiptap: a marca vive em data-*, não em CSS.
    ul: ['data-type'],
    li: ['data-type', 'data-checked'],
  },
  // `javascript:` e `data:` ficam de fora — é o vetor clássico de XSS por link.
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href'],
  // Link de usuário é conteúdo de terceiro: abre fora e sem window.opener.
  transformTags: {
    a: sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' }),
  },
  // Sem isto, `<script>alert(1)</script>` perde a tag mas mantém o texto
  // "alert(1)" no corpo — ruído inútil no campo do usuário.
  nonTextTags: ['script', 'style', 'textarea', 'noscript', 'iframe'],
};

/**
 * Sanitiza HTML de texto rico. `null`/`undefined` atravessam intactos — campo
 * não preenchido continua não preenchido, não vira string vazia.
 *
 * Texto puro passa sem alteração, que é o que faz os TAPs escritos antes do
 * editor continuarem legíveis sem migration nenhuma.
 */
export function sanitizeRichText<T extends string | null | undefined>(html: T): T {
  if (html === null || html === undefined) return html;
  return sanitizeHtml(html, OPTIONS) as T;
}

/**
 * Aplica `sanitizeRichText` só nas chaves informadas, preservando o resto do
 * objeto. Evita que um `Object.entries` distraído sanitize um campo numérico ou
 * um id.
 */
export function sanitizeRichTextFields<T extends object>(data: T, keys: readonly (keyof T)[]): T {
  const out = { ...data };
  for (const key of keys) {
    const value = out[key];
    if (typeof value === 'string') {
      out[key] = sanitizeRichText(value) as T[keyof T];
    }
  }
  return out;
}

/**
 * Texto puro a partir do HTML — para busca e para prévia em lista, onde markup
 * só atrapalha.
 */
export function richTextToPlain(html: string | null | undefined): string {
  if (!html) return '';
  // Fecha-tag vira espaço ANTES de remover o markup. Sem isto,
  // `<h2>Escopo</h2><li>Item</li>` colapsa em "EscopoItem" e a busca passa a
  // casar por uma palavra que não existe no texto.
  const spaced = html.replace(/<\/(p|h2|h3|li|ul|ol|blockquote)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ');
  return sanitizeHtml(spaced, { allowedTags: [], allowedAttributes: {} })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}
