# ERP Bioinfood

## Contexto
ERP interno para a Bioinfood, startup de biotecnologia (~12 colaboradores, R&D as a Service). Dev solo (bolsista SET-I).
Substitui Notion, Excel e assinaturas desconexas.

## Stack
- Monorepo: Turborepo + pnpm workspaces
- Backend:  NestJS + Prisma + PostgreSQL
- Frontend: Next.js 16 (App Router, Turbopack, React 19) + Tailwind CSS + shadcn/ui
- Auth:     JWT — access token 15min + refresh token 7d — email/senha
- Deploy:   Railway
- PM:       pnpm

## Estrutura
```
bioinfood-erp/
├── apps/
│   ├── api/                → NestJS (porta 3001)
│   │   ├── prisma/         → schema, migrations e seed
│   │   └── src/modules/    → um diretório por módulo de domínio
│   └── web/                → Next.js (porta 3000)
│       ├── app/            → rotas (App Router)
│       ├── components/     → componentes compartilhados + ui/
│       └── lib/            → api client, hooks, utilitários
├── packages/
│   └── shared/             → DTOs e tipos compartilhados (@bioinfood/shared)
├── docs/
│   ├── agents/             → papéis usados pelas skills — não modificar
│   ├── design/             → identidade visual (PDFs) + design-tokens.md
│   └── regras-negocio/     → regras de negócio documentadas
├── .claude/commands/       → skills (slash commands)
├── turbo.json
├── package.json
└── CLAUDE.md
```

Módulos da API: `activities`, `auth`, `charter`, `contacts`, `crm-activities`,
`interactions`, `milestones`, `opportunities`, `organizations`, `pipelines`, `pops`,
`projects`, `risks`, `search`, `stakeholders`, `tasks`, `taxonomies`, `users`, `wbs`.

## Arquitetura — Clean Architecture (3 camadas)
src/modules/<nome>/

├── domain/       → entidades puras + interfaces de repositório

├── application/  → casos de uso

└── infra/        → controller + repositório Prisma + DTOs
Nunca colocar lógica de negócio no controller.

## Controle de acesso — RBAC via User.role
Role global no User, sem role por projeto.
- ADMIN    → gestão total
- PADRAO   → interno: vê e edita todos os projetos (cria projeto, aprova TAP, libera acesso a cliente).
             Não acessa a tela de usuários nem o CRM, e não faz exclusão definitiva — só soft delete.
- CLIENTE  → somente projetos em ProjectAccess (filtra via JOIN)

JwtAuthGuard global → RolesGuard por endpoint via @Roles() decorator.
ADMIN sempre passa no RolesGuard independente do decorator.

## Schema Prisma
Para qualquer dúvida de banco de dados, leia o arquivo fonte oficial em apps/api/prisma

## Skills (slash commands)
Use o skill correspondente à tarefa. Os skills estão em `.claude/commands/` e incorporam as regras dos agents:

| Skill | Quando usar |
|---|---|
| `/planejar <feature>` | Antes de qualquer feature nova — plano, fluxo, riscos |
| `/implementar-plano <plano>` | Orquestrar a execução de um plano já definido, tarefa a tarefa, delegando às skills |
| `/novo-modulo <nome>` | Criar módulo NestJS completo (Clean Architecture + RBAC) |
| `/nova-migration <desc>` | Alterar schema Prisma |
| `/nova-pagina <rota>` | Criar página Next.js (App Router) |
| `/novo-componente <nome>` | Criar componente React reutilizável |
| `/testes <alvo>` | Escrever testes (Vitest / Testing Library / Playwright) |
| `/erros-amigaveis <alvo>` | Validação Zod + tratamento de erro amigável em formulários |
| `/seguranca <alvo>` | Revisão de segurança e RBAC |
| `/seguranca-infra <alvo>` | Resiliência a abuso/DDoS: rate limits, payload, custo de query, headers |
| `/seguranca-secrets <alvo>` | Segredos e .env: validação de startup, vazamento no git/bundle, cookies |
| `/seguranca-total` | Auditoria completa: secrets + RBAC + infra + supply chain, consolidada em docs/analise-seguranca.md |
| `/deploy <o que>` | Checklist pré-deploy para Railway |
| `/commit <contexto>` | Criar commits semânticos, pequenos e separados por intenção |

Skills de revisão e análise (não escrevem código de feature, produzem diagnóstico):

| Skill | Quando usar |
|---|---|
| `/analisar-backend` | Revisão do backend NestJS por um Tech Lead sênior |
| `/analisar-frontend` | Revisão do frontend Next.js por um Tech Lead sênior |
| `/analisar-uiux` | Revisão de UI/UX por um designer sênior |
| `/analisar-cientista` | Avaliação do ERP pela ótica de quem usa o sistema todo dia |
| `/analisar-oportunidades` | Visão de produto e negócio sobre o que construir a seguir |
| `/council` | Submeter uma decisão ao conselho — contraponto sem bajulação |
| `/ralph-loop` | Trabalho autônomo e contínuo (piloto automático) |

## Design
Antes de criar qualquer componente de UI, ler `docs/design/design-tokens.md`.

## Testes
Vitest nos dois apps. `pnpm test` na raiz roda a suíte completa via Turborepo.
- **API**: Vitest puro sobre casos de uso, com repositórios mockados.
- **Web**: Vitest + jsdom + Testing Library. O helper `apps/web/lib/test-utils.tsx`
  (`renderWithProviders`) usa os providers **reais** (`AuthProvider`, `ConfirmProvider`)
  em vez de mocks — o fluxo de confirmação de exclusão precisa ser exercitado de ponta a
  ponta. A API é mockada via `vi.mock('@/lib/api-hooks')` ou `vi.mock('@/lib/api')`.

Padrão: **Arrange → Act → Assert**, nomes `should X when Y`, em inglês.
Cobertura atual, bugs encontrados e dívidas: `docs/testes-frontend.md`.

> Ao testar formulário, lembrar que validação nativa do HTML (`type="email"`,
> `type="number"` com `min`/`max`, `required`) bloqueia o submit **antes** do zod rodar —
> a mensagem do schema nunca aparece nesses casos.

> Campo de dia é dia de calendário, não instante: usar `parseCalendarDate()` de
> `apps/web/lib/dates.ts` ao formatar `date`/`dueDate`/`startDate`. `new Date('2026-10-01')`
> é meia-noite **UTC** e renderiza um dia antes em `America/Sao_Paulo`.

## Convenções
- TypeScript strict em todos os projetos
- Arquivos: kebab-case
- Classes: PascalCase · funções/vars: camelCase
- Commits: feat: fix: chore: docs: refactor: test:
- Nunca apagar migrations — sempre adicionar novas
- Server Components por padrão no Next.js
- Sem console.log ou TODO no código commitado

## Segurança — decisões conscientes
- **Falha fechada de config**: `ConfigModule` valida `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL` (Joi) no startup. App sem env crítica **não sobe** — nunca adicionar fallback literal de segredo (`?? 'secret'`).
- **Token nunca no client (proxy BFF)**: o access token não chega ao navegador. As chamadas do client vão para `/api/proxy/[...path]` (mesma origem), que lê o cookie `httpOnly` no servidor e anexa o `Bearer` ao encaminhar para a API. O `AuthProvider` não recebe token — `useAuth().token` é `''` no browser e é ignorado pelo `api` client. Server Components (RSC) chamam a API direto com o token do cookie; **nunca** passar esse token como prop de Client Component (voltaria a vazar no payload RSC). Detalhe em `docs/analise-seguranca.md` (S3, resolvido).
- **Sessão**: access token 15min, refresh 7d rotativo (uso único). Logout revoga o refresh no banco (`POST /auth/logout`), não só apaga o cookie. Reuso de um refresh já revogado é tratado como roubo → revoga todas as sessões do usuário e força login.
- **Rate limit**: `@nestjs/throttler` global (120/min/IP); auth (`login`/`refresh`/`change-password`) com limite agressivo (5-10/min). Requer `trust proxy` no `main.ts` para ver o IP real atrás do Railway.

## Variáveis de ambiente
apps/api/.env
  DATABASE_URL=
  JWT_SECRET=
  JWT_REFRESH_SECRET=
  PORT=3001

apps/web/.env.local
  NEXT_PUBLIC_API_URL=http://localhost:3001

## Regra de ouro
Se uma decisão impactar arquitetura, banco ou segurança:
pare, documente a dúvida e pergunte antes de implementar.