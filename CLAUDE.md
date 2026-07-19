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

## Estrutura a criar
bioinfood-erp/

├── apps/

│   ├── api/          → NestJS (porta 3001)

│   └── web/          → Next.js (porta 3000)

├── packages/

│   └── shared/       → DTOs e tipos compartilhados

├── docs/

│   ├── agents/       → já existem, não modificar

│   └── design/       → identidade-visual.pdf e paleta-de-cores.pdf

├── .claude/

│   └── commands/

├── turbo.json

├── package.json

└── CLAUDE.md

## Arquitetura — Clean Architecture (3 camadas)
src/modules/<nome>/

├── domain/       → entidades puras + interfaces de repositório

├── application/  → casos de uso

└── infra/        → controller + repositório Prisma + DTOs
Nunca colocar lógica de negócio no controller.

## Controle de acesso — RBAC via User.role
Role global no User, sem role por projeto.
- ADMIN    → gestão total
- APROVA   → cria projetos, aprova docs, libera acesso para clientes
- INSERE   → edita dados dos projetos
- CONSULTA → leitura de todos os projetos internos
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

## Design
Antes de criar qualquer componente de UI, ler `docs/design/design-tokens.md`.

## Convenções
- TypeScript strict em todos os projetos
- Arquivos: kebab-case
- Classes: PascalCase · funções/vars: camelCase
- Commits: feat: fix: chore: docs: refactor:
- Nunca apagar migrations — sempre adicionar novas
- Server Components por padrão no Next.js
- Sem console.log ou TODO no código commitado

## Segurança — decisões conscientes
- **Falha fechada de config**: `ConfigModule` valida `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL` (Joi) no startup. App sem env crítica **não sobe** — nunca adicionar fallback literal de segredo (`?? 'secret'`).
- **Token no client (tradeoff aceito)**: o access token é injetado no `AuthProvider` para o client chamar a API direto com `Bearer`; isso o torna legível pelo JS da página (o `httpOnly` do cookie não protege desse caminho). Aceito por ser app interno — não colocar dado sensível de cliente externo confiando só nisso. Detalhe em `docs/analise-seguranca.md` (S3).
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