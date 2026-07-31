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
│   ├── regras-negocio/     → regras de negócio documentadas
│   └── tasks/              → tarefas detalhadas (bugs/features) prontas para implementar
├── .claude/commands/       → skills (slash commands)
├── turbo.json
├── package.json
└── CLAUDE.md
```

Módulos da API: `activities`, `auth`, `charter`, `contacts`, `crm-activities`,
`interactions`, `milestones`, `notes`, `opportunities`, `organizations`, `pipelines`,
`pops`, `projects`, `risks`, `search`, `stakeholders`, `stock`, `tasks`, `taxonomies`,
`users`, `wbs`.

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

### ⚠️ Exceção única: anotações pessoais (`/notes`)

**Anotação pessoal é privada do dono — nem ADMIN lê.** É o único dado do ERP assim, e é
intencional: decisão do Miguel em 2026-07-30. **Não "corrigir".**

Isso *não* contraria a regra acima. O `RolesGuard` continua deixando ADMIN passar — mexer
nele para abrir exceção afetaria todos os outros módulos. A privacidade vem de outra
camada: o guard governa **papel**, e aqui a trava é de **posse**, que é filtro de dado.

A garantia é por **ausência de caminho**, não por bloqueio:

- `ownerId` nunca é parâmetro de entrada — vem sempre do JWT (`@CurrentUser()`);
- `INotesRepository` obriga `ownerId` como primeiro argumento em **todo** método. Não
  existe `findById(id)` sem dono, então esquecer de filtrar não compila;
- não há listagem global, DTO com `ownerId`, nem export do repositório;
- escrita usa `updateMany` com o `ownerId` dentro do próprio UPDATE;
- nota alheia devolve **404, nunca 403** (403 confirmaria que ela existe);
- `notes` está em `CONTENT_REDACTED_ENTITIES` do `AuditInterceptor` — senão o conteúdo
  cairia em `AuditLog`, que o ADMIN lê. Era a porta dos fundos da garantia.

> **Qualquer endpoint novo que aceite um `ownerId` vindo de fora quebra tudo isso.**
> Detalhes e testes: `apps/api/src/modules/notes/` e
> `apps/api/src/modules/notes/application/manage-notes.use-case.spec.ts`.

## Schema Prisma
Para qualquer dúvida de banco de dados, leia o arquivo fonte oficial em apps/api/prisma

## Skills (slash commands)
Use o skill correspondente à tarefa. Os skills estão em `.claude/commands/` e incorporam as regras dos agents:

| Skill | Quando usar |
|---|---|
| `/planejar <feature>` | Antes de qualquer feature nova — plano, fluxo, riscos |
| `/nova-tarefa <anotação>` | Transformar anotação crua de bug/melhoria em tarefa detalhada em `docs/tasks/` |
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
| `/railway <tarefa>` | Operar o ambiente já no ar: logs, migration, seed, limpeza, diagnóstico |
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

## Datas — dia de calendário vs instante
**Antes de aplicar `parseCalendarDate`, decida qual dos dois o campo é.** Aplicar
conversão de dia puro num instante **introduz** o bug em vez de corrigi-lo.

| Tipo | Exemplos | Como renderizar |
|---|---|---|
| **Dia de calendário** — o usuário escolheu uma data num `type="date"` | `Task.dueDate`/`startDate`/`baselineStart`/`baselineEnd`/`actualStart`/`actualEnd`, `Project.startDate`/`endDate`, `Milestone.date`, `Opportunity.expectedCloseDate` | `parseCalendarDate()` / `formatDay()` de `apps/web/lib/dates.ts` |
| **Instante** — o sistema carimbou um momento | `createdAt`, `updatedAt`, `approvedAt`, `baselineSetAt`, `completedAt`, `Activity.dueDate` (é agenda) | `new Date(iso)` direto, em hora local. **Nunca** `parseCalendarDate` |

Por quê: `new Date('2026-10-01')` (ou o ISO com `Z` que a API devolve) é meia-noite
**UTC** e renderiza um dia antes em `America/Sao_Paulo` — erro num campo de dia.
Já num instante, a hora local é a informação correta: uma versão de POP criada às
22h de Brasília é `01:00Z` do dia seguinte, e `parseCalendarDate` a exibiria no dia
errado.

> Um mesmo helper de formatação **não pode** servir aos dois tipos. Se um `fmtDate`
> local formata `approvedAt` e `startDate`, separe em `fmtInstant`/`fmtDay` antes de
> corrigir qualquer coisa. Caso real: `charter-client.tsx`.

Histórico e inventário verificado: `docs/incidentes/timezone-cronograma.md`.

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

> Ao testar formatação de data, cobrir os **dois** tipos da seção "Datas — dia de
> calendário vs instante": um teste que só exercita dia de calendário passa com um
> helper que quebra instantes.

## Fluxo de branches
- `develop` → branch de **integração**. Não publica em lugar nenhum. Toda feature
  branch sai dela e volta para ela.
- `main` → **produção**. O Railway observa e faz deploy sozinho; há usuários reais
  dentro. `main` só recebe **promoção deliberada** de `develop`, via merge `--no-ff`.
- Nunca abrir feature branch a partir de `main` nem de outra feature branch.
- Nunca commitar direto em `main`.
- Migration destrutiva vai em **duas publicações** (aditiva primeiro, remoção depois):
  `prisma:deploy` roda no `startCommand` da API, então toda migration em `main`
  aplica **sozinha** ao banco de produção.
- Runbook completo (promoção, migration em produção, backup, restauração,
  variáveis de ambiente): `docs/deploy.md`.

### Teste de rota BFF (`apps/web/app/api/**`)

> **Mocke o upstream com o shape REAL da API, nunca com o shape que o BFF espera.**
> Mock que devolve a suposição do próprio código não testa integração nenhuma —
> ele confirma a suposição e fica verde enquanto a produção quebra.

Caso real: o `/auth/refresh` da API devolve o par de tokens **achatado**
(`{ accessToken, refreshToken }`), mas o BFF lia `data.tokens`, que só existe na
resposta do `/auth/login`. O teste mockava a rota devolvendo `{ ok: true }` — o
shape que o BFF **produz** — então cobria só o salto navegador → BFF e passava.
O salto BFF → API não tinha teste, e a sessão morria a cada 15min em produção.
Ver `docs/incidentes/sessao-expira.md`.

Na prática:
- Antes de escrever o mock, **abra o use-case da API** e copie o shape que ele
  realmente retorna. Não deduza do que o BFF lê.
- Todo contrato de fronteira API↔BFF mora em `packages/shared` e é anotado nos
  **dois** lados — assim a divergência vira erro de build, não logout em produção.
- Rotas do App Router precisam de `// @vitest-environment node` no topo do
  arquivo: `NextRequest`/`NextResponse` não funcionam em jsdom.

## Convenções
- TypeScript strict em todos os projetos
- Arquivos: kebab-case
- Classes: PascalCase · funções/vars: camelCase
- Commits: feat: fix: chore: docs: refactor: test:
- Nunca apagar migrations — sempre adicionar novas
- `pnpm-lock.yaml` e `package.json` viajam **no mesmo commit**. O lockfile guarda o
  *specifier*, não só a versão resolvida — mudar `^2.7.1` para `2.7.1` já o
  desatualiza. Local passa (o `pnpm install` reconcilia sozinho), o build do
  Railway morre em `ERR_PNPM_OUTDATED_LOCKFILE`
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

## Deploy (Railway)
Operar o que já está no ar (promover, migrar, restaurar): `docs/deploy.md`.
Montar o ambiente do zero: `docs/deploy-railway.md` · Roteiro de teste: `docs/testes-railway.md`.

Três serviços num projeto (`Postgres`, `api`, `web`), todos com Root Directory na
**raiz** do monorepo — `packages/shared` é TS cru e o build precisa do workspace
inteiro. A separação vem do `--filter` nos comandos, versionados em
`apps/api/railway.json` e `apps/web/railway.json`.

- Entrypoint da API é `dist/src/main.js` (o `prisma/seed.ts` sobe o `rootDir` do tsc).
- `prisma:generate` roda antes do build — não há `postinstall`.
- `NEXT_PUBLIC_API_URL` é **assada no build**: trocar exige redeploy do `web`, não restart.
- `NODE_ENV=production` no `web` é o que liga o `Secure` dos cookies de sessão.
- Seed contra banco remoto exige `SEED_ADMIN_PASSWORD`/`SEED_LIDER_PASSWORD`/
  `SEED_CLIENTE_PASSWORD` — aborta sem elas, para não publicar `admin123` na internet.
- Limpar dados de teste: `pnpm db:reset-data` (exige `ALLOW_DATA_RESET=yes` e
  confirmação do host do banco).
- Remover só o que o seed criou, preservando cadastro real: `pnpm db:unseed`
  (dry-run por padrão; apaga com `UNSEED_CONFIRM=yes` + `UNSEED_DB_HOST_CONFIRM`).
  Preserva sempre `admin@bioinfood.com`, as taxonomias e o funil padrão do CRM.

## Regra de ouro
Se uma decisão impactar arquitetura, banco ou segurança:
pare, documente a dúvida e pergunte antes de implementar.