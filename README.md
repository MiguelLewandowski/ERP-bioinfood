# Bioinfood ERP

Sistema de gestão interno da Bioinfood.

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

## Comandos úteis

```bash
# Parar o banco
docker compose down

# Ver logs do banco
docker compose logs -f postgres

# Abrir Prisma Studio (visualizar dados)
cd apps/api && npx prisma studio

# Criar nova migration
cd apps/api && npx prisma migrate dev --name <descricao>
```

## Usuários de teste (seed)

| E-mail                     | Senha       | Role    |
| -------------------------- | ----------- | ------- |
| admin@bioinfood.com        | admin123    | ADMIN   |
| lider@bioinfood.com        | lider123    | APROVA  |
| cliente@bioinfood.com      | cliente123  | CLIENTE |

## Estrutura

```
bioinfood-erp/
├── apps/
│   ├── api/          → NestJS (porta 3001)
│   └── web/          → Next.js (porta 3000)
├── packages/
│   └── shared/       → Tipos compartilhados
├── docs/
│   ├── agents/       → Documentos de agentes
│   └── design/       → Identidade visual
└── docker-compose.yml
```
