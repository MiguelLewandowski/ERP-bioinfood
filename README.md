# Bioinfood ERP

Sistema de gestão interno da Bioinfood — gestão de projetos de P&D, CRM e POPs.
Monorepo Turborepo com API NestJS e frontend Next.js.

## Stack

| Camada | Tecnologia |
|---|---|
| Monorepo | Turborepo + pnpm workspaces |
| Backend | NestJS 10 + Prisma 5 + PostgreSQL |
| Frontend | Next.js 16 (App Router, Turbopack) + React 19 + Tailwind + shadcn/ui |
| Auth | JWT — access token 15min + refresh token 7d |
| Testes | Vitest (API e web) + Testing Library (web) |
| Deploy | Railway |

## Pré-requisitos

- Node.js 20+
- pnpm 9+
- Docker e Docker Compose

## Setup

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Crie `apps/api/.env`:

```env
DATABASE_URL=postgresql://bioinfood:bioinfood@localhost:5432/bioinfood_erp
JWT_SECRET=sua-chave-secreta
JWT_REFRESH_SECRET=sua-chave-refresh
PORT=3001
```

Crie `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

> A API **não sobe** sem `DATABASE_URL`, `JWT_SECRET` e `JWT_REFRESH_SECRET` — a validação
> de config (Joi) falha fechada de propósito. Não existe fallback de segredo no código.

### 3. Subir o banco de dados

```bash
docker compose up -d
```

Aguarde o container iniciar (alguns segundos) antes de prosseguir.

### 4. Rodar migrations e seed

```bash
cd apps/api
npx prisma migrate deploy
npx prisma db seed
cd ../..
```

### 5. Iniciar o projeto

```bash
# Na raiz do monorepo:
pnpm dev
```

Acesse:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001

---

## Comandos

### Raiz do monorepo (via Turborepo)

```bash
pnpm dev     # sobe API e web em paralelo
pnpm build   # build de todos os workspaces
pnpm lint    # ESLint em todos os workspaces
pnpm test    # suíte completa (API + web)
pnpm seed    # roda o seed do Prisma
```

### Por workspace

```bash
# API
pnpm --filter @bioinfood/api test           # Vitest (unit + casos de uso)
pnpm --filter @bioinfood/api test:watch
pnpm --filter @bioinfood/api test:coverage

# Web
pnpm --filter @bioinfood/web test           # Vitest + Testing Library (jsdom)
pnpm --filter @bioinfood/web test:watch
```

### Banco de dados

```bash
docker compose down                                   # parar o banco
docker compose logs -f postgres                       # ver logs
cd apps/api && npx prisma studio                      # visualizar dados
cd apps/api && npx prisma migrate dev --name <desc>   # nova migration
```

> Migrations **nunca** são apagadas ou editadas — sempre adicione uma nova.

## Testes

O frontend usa **Vitest + jsdom + Testing Library**, com o helper
`apps/web/lib/test-utils.tsx` (`renderWithProviders`) que renderiza com os providers
reais (`AuthProvider`, `ConfirmProvider`) em vez de mocks — assim o fluxo de confirmação
de exclusão é exercitado de ponta a ponta. A API é sempre mockada nos testes de componente.

Padrão: **Arrange → Act → Assert**, nomes no formato `should X when Y`, em inglês.

Cobertura atual, defeitos encontrados pelos testes e o que ficou de fora estão em
[`docs/testes-frontend.md`](docs/testes-frontend.md).

## Controle de acesso

Role global no `User`, sem role por projeto:

São **três** papéis (desde 2026-07-23 — `APROVA`, `INSERE` e `CONSULTA` foram
fundidos em `PADRAO`):

| Role | Permissões |
|---|---|
| `ADMIN` | Gestão total — sempre passa no `RolesGuard`. Único que acessa usuários, CRM e exclusão definitiva. |
| `PADRAO` | Interno: vê e edita todos os projetos, cria projeto, aprova TAP e libera acesso a cliente. Sem tela de usuários, sem CRM, e exclusão só reversível (soft delete). |
| `CLIENTE` | Externo: somente projetos listados em `ProjectAccess`. |

`JwtAuthGuard` é global; `RolesGuard` é aplicado por endpoint via decorator `@Roles()`.

> `GET /users` continua aberto ao `PADRAO` porque alimenta os seletores de pessoa
> (equipe do TAP, responsável de tarefa, dono de pacote da EAP). O que o papel não
> acessa é a **tela** de usuários — criar, editar e resetar senha exigem `ADMIN`.

## Usuários de teste (seed)

| E-mail                     | Senha       | Role    |
| -------------------------- | ----------- | ------- |
| admin@bioinfood.com        | admin123    | ADMIN   |
| lider@bioinfood.com        | lider123    | PADRAO  |
| cliente@bioinfood.com      | cliente123  | CLIENTE |

A equipe do projeto de demonstração usa a senha `demo123` e o papel `PADRAO`:
`marina@`, `rafael@`, `juliana@`, `thiago@` e `camila@`.

## Projeto de demonstração

O seed cria **"Plataforma de Ingredientes Funcionais a partir de Coprodutos"**
(`apps/api/prisma/seeds/demo-project.ts`) — um P&D de 2 anos com o "hoje" caindo no
meio da execução, para avaliar as telas sem cadastrar nada à mão:

| Conteúdo | Volume |
|---|---|
| Tarefas | 45 (60% concluídas), 48 dependências, 15 itens de checklist |
| EAP / WBS | 16 nós em 2 níveis |
| Roadmap | 10 marcos (5 atingidos, 1 vencido) |
| Riscos | 8 (2 críticos, 5 altos) |
| Partes interessadas | 8 (patrocinador, responsável, equipe e externos) |
| TAP | todas as seções preenchidas, orçamento e aprovação |

O cronograma tem desvio proposital: 2 tarefas atrasadas e término previsto 11 dias
além do planejado, para exercitar os indicadores do dashboard. As datas derivam de
`PROJECT_START` no topo do arquivo — mudar essa constante desloca o projeto inteiro.

> O seed é idempotente: o projeto tem id fixo e é recriado a cada execução
> (usuários, contatos, cliente e POPs são upsert). Rodar `pnpm seed` de novo não duplica nada.

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
│   ├── agents/             → papéis usados pelas skills
│   ├── design/             → identidade visual e design-tokens.md
│   └── regras-negocio/     → regras de negócio documentadas
├── .claude/commands/       → skills (slash commands) do projeto
└── docker-compose.yml
```

### Arquitetura dos módulos da API

Clean Architecture em 3 camadas — lógica de negócio nunca fica no controller:

```
src/modules/<nome>/
├── domain/        → entidades puras + interfaces de repositório
├── application/   → casos de uso
└── infra/         → controller + repositório Prisma + DTOs
```

Módulos existentes: `activities`, `auth`, `charter`, `contacts`, `crm-activities`,
`interactions`, `milestones`, `opportunities`, `organizations`, `pipelines`, `pops`,
`projects`, `risks`, `search`, `stakeholders`, `tasks`, `taxonomies`, `users`, `wbs`.

## Funcionalidades

- **Projetos** — TAP (charter), WBS, backlog, kanban, gantt, roadmap, riscos, partes interessadas e configurações
- **CRM** — hub unificado de empresas, pessoas, negócios (kanban de pipeline) e tarefas
- **Atividades** — visão global de tarefas atribuídas
- **POPs** — procedimentos operacionais padrão com versionamento
- **Usuários** — gestão de contas, papéis e reset de senha

## Documentação

| Documento | Conteúdo |
|---|---|
| [`docs/deploy.md`](docs/deploy.md) | **Como o sistema vai ao ar** — branches, promoção para produção, migration em produção, backup e restauração |
| [`CLAUDE.md`](CLAUDE.md) | Convenções, arquitetura e decisões de segurança do projeto |
| [`docs/analise-seguranca.md`](docs/analise-seguranca.md) | Auditoria de segurança viva (RBAC, secrets, infra) |
| [`docs/deploy-railway.md`](docs/deploy-railway.md) | Montar o ambiente no Railway do zero (setup inicial) |
| [`docs/testes-frontend.md`](docs/testes-frontend.md) | Cobertura de testes, bugs encontrados e dívidas |
| [`docs/design/design-tokens.md`](docs/design/design-tokens.md) | Tokens de design — ler antes de criar qualquer UI |
| [`docs/analise-backend.md`](docs/analise-backend.md) · [`analise-frontend.md`](docs/analise-frontend.md) · [`analise-uiux.md`](docs/analise-uiux.md) | Revisões técnicas por especialidade |

## Convenções

- TypeScript strict em todos os projetos
- Arquivos em `kebab-case` · classes em `PascalCase` · funções e variáveis em `camelCase`
- Commits semânticos: `feat:` `fix:` `chore:` `docs:` `refactor:` `test:`
- Branches: feature sai de `develop` e volta para `develop`. `main` é produção com
  auto-deploy — só recebe promoção deliberada ([`docs/deploy.md`](docs/deploy.md))
- Server Components por padrão no Next.js
- Sem `console.log` ou `TODO` no código commitado
