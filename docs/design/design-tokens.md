# Design Tokens — ERP Bioinfood

> Fonte da identidade: `docs/design/bio_in_food.pdf` e `docs/design/paleta de cor.pdf`.
> **Regra nº 1: cor entra SEMPRE por token semântico.** Hex inline (`bg-[#147F23]`,
> `style={{ color: '#575756' }}`) é **proibido** — o ESLint acusa. Nova cor = novo
> token em `apps/web/app/globals.css` + `apps/web/tailwind.config.ts`, nunca hex no componente.

## Tokens semânticos (usar estes)

| Classe Tailwind | Resolve para | Uso |
|---|---|---|
| `bg-primary` / `text-primary` | `#147F23` | CTAs, botões principais, navegação ativa |
| `bg-primary-dark` | `#156D1D` | hover/ênfase do primário (`hover:bg-primary-dark`) |
| `text-primary-foreground` | `#FFFFFF` | texto sobre fundo primário |
| `text-foreground` | `#1D1D1B` | texto principal (títulos, corpo) |
| `text-muted-foreground` | `#706F6F` | texto secundário, placeholder, labels |
| `bg-muted` / `bg-secondary` | cinza 96% | fundos suaves, hover de linha |
| `border-border` / `border-input` | cinza 90% | bordas de cards, inputs |
| `ring-ring` | `#52B552` | anel de foco (`focus-visible:ring-2 ring-ring`) |
| `bg-success` / `text-success` | `#46AD48` | estados positivos (concluído, ativo, ganho) |
| `bg-warning` / `text-warning` | `#FFB000` | destaque de atenção |
| `bg-accent` / `text-accent` | `#DD8005` | alerta forte (âmbar da marca) |
| `bg-destructive` / `text-destructive` | vermelho | ações destrutivas (excluir, perder) |
| `bg-card` / `text-card-foreground` | branco / `#1D1D1B` | cards e superfícies |
| `bg-sidebar` / `bg-sidebar-hover` / `text-sidebar-foreground` | `#1D1D1B` / `#303030` / branco | shell escura (sidebar/topbar) |

Não existe token `info` (a identidade Bioinfood não tem azul) — usar `muted` para neutro informativo.

## De-para de migração (hex antigo → token)

| Hex encontrado no código | Substituir por |
|---|---|
| `#147F23` | `primary` |
| `#156D1D` | `primary-dark` |
| `#46AD48` | `success` |
| `#52B552` | `ring` (foco) ou `success` (decorativo) |
| `#86C175` | `success/40` (fundo suave; nunca texto) |
| `#1D1D1B` | `foreground` (texto) ou `sidebar` (fundo escuro) |
| `#303030` | `sidebar-hover` |
| `#575756` / `#706F6F` | `muted-foreground` |
| `#878787` | `muted-foreground` (ou `disabled:opacity-50`) |
| `#DD8005` / `#C16C06` | `accent` |
| `#FFB000` / `#FFB727` / `#FDC75F` | `warning` (fundo suave: `warning/20`) |
| `text-red-600`, `red-*` ad-hoc | `destructive` |

## Paleta da marca (referência — NÃO usar direto no código)

Verde `#156D1D → #147F23 → #46AD48 → #52B552 → #86C175` · Cinza `#1D1D1B → #303030 → #3C3C3B → #575756 → #706F6F → #878787` · Âmbar `#C16C06 → #DD8005 → #FF910A → #FFB000 → #FFB727 → #FDC75F` · Branco `#FFFFFF`.
Estes hex vivem exclusivamente nas variáveis de `globals.css`.

## Regras de uso da marca

- O verde é a cor primária — CTAs, botões principais, navegação ativa. Mais escuro = maior peso.
- O âmbar é **exclusivo** para alertas/atenção — nunca como cor de ação, nunca sobre fundo verde.
- Texto branco apenas sobre fundos escuros (`primary`, `primary-dark`, `sidebar`).
- Cinzas médios são para texto secundário/bordas/disabled — nunca fundo de elemento interativo.
- Evitar `#000` puro: o "preto" da marca é `foreground` (`#1D1D1B`).
- Nunca usar o verde claro (`#86C175`) como cor de texto — contraste insuficiente em branco.

## Componentes base (`apps/web/components/ui/`)

Antes de criar qualquer UI, verificar se já existe primitivo aqui — **não** reescrever
markup de botão/modal/tabela na tela. Catálogo (criado na fase F1 da reforma de UX;
exemplo canônico de uso: tela **Users**):

| Componente | Uso |
|---|---|
| `button` | variantes default/secondary/outline/ghost/destructive |
| `input`, `textarea`, `label`, `select` | formulários (com react-hook-form + zod) |
| `dialog` | ÚNICO overlay permitido — nunca `fixed inset-0` manual |
| `badge`, `status-badge` | status de entidades (mapa status→variante centralizado) |
| `card`, `table`, `skeleton` | superfícies, listagens, loading |
| `empty-state` | estado vazio com ícone + título + CTA |
| `page-header` | cabeçalho de página (título + descrição + ações + breadcrumb) |
| `dropdown-menu` | menus de ação |

> Enquanto um componente do catálogo ainda não existir, criá-lo em `components/ui/`
> (base shadcn/Radix — deps já instaladas) em vez de improvisar na tela.
