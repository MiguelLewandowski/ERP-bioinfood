# Deploy no Railway — ambiente de testes

Guia completo para subir o ERP inteiro (banco + API + web) no Railway e operá-lo.
Companheiro deste doc: [`docs/testes-railway.md`](./testes-railway.md), com o roteiro
de teste e a limpeza dos dados de teste no fim.

> **Este ambiente é de teste, mas fica na internet pública.** Qualquer pessoa com a
> URL alcança a tela de login. Tudo que estiver no banco está exposto a quem tiver
> uma senha válida — não coloque dado real de cliente aqui sem decidir isso
> conscientemente.

---

## 1. Topologia

Três serviços num único projeto Railway, todos a partir deste mesmo repositório:

```
Projeto Railway "bioinfood-erp"
├── Postgres      (template do Railway)
├── api           (NestJS · apps/api · porta do $PORT)
└── web           (Next.js · apps/web · porta do $PORT)
```

O fluxo em produção é o mesmo do local:

```
navegador ──HTTPS──> web (Next)  ──> /api/proxy ──> api (Nest) ──> Postgres
                       │
                       └─ cookies httpOnly (access 15min / refresh 7d)
```

O navegador **nunca** fala com a API direto — o proxy BFF (`apps/web/app/api/proxy`)
lê o cookie no servidor e anexa o `Bearer`. Isso tem duas consequências práticas
para o deploy:

- `CORS_ORIGINS` na API é defesa em profundidade, não algo que sustenta o app.
  Nenhuma requisição de navegador chega à API com um `Origin` que precise passar.
- O serviço `web` precisa alcançar o serviço `api` **pelo servidor**, não pelo
  cliente. Por isso `NEXT_PUBLIC_API_URL` vale para o servidor Next, apesar do
  prefixo (ver a armadilha em §7).

### Por que o monorepo fica com Root Directory na raiz

Este é um monorepo **compartilhado** (pnpm workspaces + `packages/shared` em
TypeScript cru, consumido pelos dois apps). Não dá para apontar o Root Directory
de cada serviço para `apps/api` / `apps/web`: o build precisa do
`pnpm-workspace.yaml`, do lockfile e do `packages/shared` — todos na raiz.

A separação vem dos **comandos de build/start com `--filter`**, versionados em
`apps/api/railway.json` e `apps/web/railway.json`.

---

## 2. Pré-requisitos

- Conta no Railway com plano Hobby (o Trial não segura três serviços por muito tempo).
- Repositório no GitHub — já está: `MiguelLewandowski/ERP-bioinfood`.
- CLI instalada (já está, `railway 4.29`). Para conferir: `railway --version`.
- Build local passando: `pnpm build` na raiz. **Não suba nada com build quebrado** —
  o Railway vai falhar igual, só que mais devagar e cobrando.

Login (abre o navegador, precisa ser você quem roda):

```
! railway login
```

---

## 3. Criar o projeto e o banco

Pela CLI, da raiz do repo:

```bash
railway init --name bioinfood-erp     # cria o projeto e linka esta pasta
railway add --database postgres        # provisiona o Postgres
```

Ou pela UI: **New Project → Deploy PostgreSQL**.

O serviço Postgres passa a expor duas variáveis que vamos usar:

| Variável              | Onde vale                          | Uso                                  |
|-----------------------|------------------------------------|--------------------------------------|
| `DATABASE_URL`        | rede privada (`*.railway.internal`) | a API em runtime                     |
| `DATABASE_PUBLIC_URL` | internet (proxy TCP do Railway)     | rodar migration/seed do seu notebook |

A privada não é alcançável da sua máquina — é a causa nº 1 de "seed travou" (§7).

---

## 4. Criar o serviço `api`

Pela UI (mais previsível que a CLI para monorepo): **New → GitHub Repo →
ERP-bioinfood**. Depois, em **Settings** do serviço:

| Campo                  | Valor                          |
|------------------------|--------------------------------|
| Service Name           | `api`                          |
| Root Directory         | `/` (deixe vazio — é a raiz)   |
| Config-as-code path    | `apps/api/railway.json`        |

Não preencha Watch Paths na UI: eles vêm de `watchPatterns` no `railway.json`.
E precisam incluir os arquivos da **raiz** (`package.json`, `.nvmrc`,
`pnpm-lock.yaml`), senão mudar a versão do Node ou uma dependência do workspace
não dispara rebuild nenhum — o serviço fica servindo uma imagem velha sem avisar.

O `apps/api/railway.json` já traz build, start, healthcheck e política de restart:

```json
{
  "build":  { "buildCommand": "pnpm --filter @bioinfood/api prisma:generate && pnpm --filter @bioinfood/api build" },
  "deploy": {
    "startCommand": "pnpm --filter @bioinfood/api prisma:deploy && node apps/api/dist/src/main.js",
    "healthcheckPath": "/health"
  }
}
```

Três detalhes que custaram tempo para acertar e que você não deve "simplificar":

- **`dist/src/main.js`, não `dist/main.js`.** O `prisma/seed.ts` entra no programa
  do TypeScript, então o `rootDir` inferido sobe para `apps/api/` e a saída fica em
  `dist/src/`. Se mudar o entrypoint, confira com `ls apps/api/dist`.
- **`prisma:generate` antes do build.** Não existe `postinstall` gerando o client;
  sem esse passo o `nest build` quebra em cima dos tipos do `@prisma/client`.
- **`prisma migrate deploy` no start.** É idempotente, então rodar a cada restart
  não custa nada, e se uma migration falhar o serviço não sobe — falha visível em
  vez de app de pé contra um schema errado. Alternativa mais correta: mover para o
  **Pre-deploy Command** do Railway (Settings → Deploy).

### Variáveis do serviço `api`

Em **Variables**:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<32+ chars aleatórios>
JWT_REFRESH_SECRET=<32+ chars aleatórios, DIFERENTE do de cima>
CORS_ORIGINS=https://${{web.RAILWAY_PUBLIC_DOMAIN}}
NODE_ENV=production
```

`${{Postgres.DATABASE_URL}}` e `${{web.RAILWAY_PUBLIC_DOMAIN}}` são *reference
variables* — o Railway resolve sozinho e reescreve se a URL mudar. Não copie e
cole o valor literal.

**Não defina `PORT`.** O Railway injeta a dele; o `main.ts` já lê `process.env.PORT`.
O `3001` do `.env` local é só local.

Gerando segredos (rode e cole o resultado):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

O `ConfigModule` valida essas variáveis com Joi no startup e **recusa subir** sem
elas (`JWT_SECRET` exige ≥16 caracteres). Se o deploy morrer no boot, leia o log:
o erro lista exatamente qual variável faltou.

Por fim: **Settings → Networking → Generate Domain**. Anote a URL.

---

## 5. Criar o serviço `web`

**New → GitHub Repo → ERP-bioinfood** de novo, no mesmo projeto:

| Campo               | Valor                          |
|---------------------|--------------------------------|
| Service Name        | `web`                          |
| Root Directory      | `/`                            |
| Config-as-code path | `apps/web/railway.json`        |

Variáveis:

```bash
NEXT_PUBLIC_API_URL=https://${{api.RAILWAY_PUBLIC_DOMAIN}}
NODE_ENV=production
```

`NODE_ENV=production` aqui não é decorativo: é o que liga a flag `secure` dos
cookies de sessão (`apps/web/app/api/auth/*/route.ts`). Sem ele os cookies saem
sem `Secure` num site HTTPS.

Depois: **Generate Domain**. Essa é a URL que as pessoas vão usar.

### Ordem que evita o problema do ovo e da galinha

`api` precisa do domínio de `web` e vice-versa. Como as *reference variables* só
resolvem depois que o domínio existe:

1. cria os dois serviços,
2. gera o domínio dos dois,
3. só então preenche `CORS_ORIGINS` e `NEXT_PUBLIC_API_URL`,
4. e força um **redeploy do `web`** (motivo em §7).

---

## 6. Migrations e seed

As migrations rodam sozinhas no start da API (§4). O seed é manual e roda **da sua
máquina** contra o banco do Railway.

Pegue a URL pública do banco (a privada não sai do datacenter):

```bash
railway variables list --service Postgres --kv    # copie DATABASE_PUBLIC_URL
```

E rode o seed com senhas de verdade:

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" \
SEED_ADMIN_PASSWORD="<senha forte>" \
SEED_LIDER_PASSWORD="<senha forte>" \
SEED_CLIENTE_PASSWORD="<senha forte>" \
pnpm seed
```

O seed **aborta** se detectar banco remoto sem essas variáveis. Isso é intencional:
os defaults `admin123`/`lider123`/`cliente123` só valem contra `localhost`, e num
deploy público seriam uma porta destrancada.

O que o seed cria: taxonomias e funil do CRM, três usuários (ADMIN / PADRAO /
CLIENTE), duas organizações, dois projetos e um projeto de demonstração completo
(TAP, EAP, 45 tarefas, roadmap, riscos, partes interessadas).

> **Rodar o seed duas vezes não troca a senha de ninguém.** Os `upsert` usam
> `update: {}`, então usuário existente fica como está. Para trocar senha, use a
> tela de usuários ou limpe os dados antes (§9).

---

## 7. Armadilhas deste repo

**`NEXT_PUBLIC_API_URL` é assada no build.** O prefixo `NEXT_PUBLIC_` faz o Next
substituir a variável pelo valor literal durante `next build` — inclusive no
código de servidor. Mudar essa variável e só reiniciar o serviço **não tem
efeito**: tem que redeployar o `web`. Se o login der "Serviço indisponível",
suspeite que ficou o `http://localhost:3001` do fallback assado no bundle.

**A API não tem domínio? O web não sobe direito.** Enquanto `api` não tiver
domínio público, `${{api.RAILWAY_PUBLIC_DOMAIN}}` resolve vazio e o `web`
builda apontando para lugar nenhum.

**O rate limit só existe em produção.** O `ThrottlerModule` tem
`skipIf: NODE_ENV !== 'production'`. No Railway ele está ligado: 120 req/min/IP no
geral e 5–10/min nas rotas de auth. Errar a senha cinco vezes em teste vai te
bloquear por um minuto — é o comportamento correto, não um bug.

**O IP real depende do proxy.** `main.ts` faz `app.set('trust proxy', 1)` e o proxy
BFF repassa `x-forwarded-for`. Sem isso o rate limit contaria todo mundo como um
IP só (o do servidor Next) e um usuário derrubaria o limite de todos.

**O Nixpacks usa Node 18 se ninguém disser o contrário.** O Next 16 exige
`>=20.9.0` e o build morre com uma linha discreta no meio do log. O `.nvmrc` na
raiz (fixado em `22`) é o que resolve — e só chega ao builder porque
`watchPatterns` inclui os arquivos da raiz.

**A UI acumula mudanças em staging.** Criar serviço e mexer em Settings não
aplica nada: fica tudo numa fila até você clicar em **Deploy** no topo do
projeto. Serviço que aparece na lista mas responde `ServiceInstance not found`
na CLI está nesse estado.

**Migration destrutiva não tem volta neste ambiente.** Não há backup automático no
Hobby. Antes de qualquer migration que dropa coluna, tire um dump (§10).

---

## 8. Verificando que subiu

```bash
# API viva e falando com o banco
curl -s https://<api>.up.railway.app/health          # {"status":"ok"}

# rota protegida continua protegida
curl -s -o /dev/null -w "%{http_code}\n" https://<api>.up.railway.app/projects   # 401

# web responde
curl -s -o /dev/null -w "%{http_code}\n" https://<web>.up.railway.app/           # 200
```

Se `/health` devolver 503, o processo subiu mas não alcança o Postgres — quase
sempre `DATABASE_URL` colada como literal em vez de `${{Postgres.DATABASE_URL}}`.

Logs ao vivo:

```bash
railway logs --service api
railway logs --service web
```

Daí em diante, o roteiro funcional está em [`docs/testes-railway.md`](./testes-railway.md).

---

## 9. Limpando os dados de teste

Duas opções, dependendo do que você quer jogar fora.

### Apagar os dados, manter o schema

Preserva as migrations já aplicadas — o ambiente continua de pé, só vazio:

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" \
ALLOW_DATA_RESET=yes \
RESET_DB_HOST_CONFIRM="<host da DATABASE_PUBLIC_URL>" \
pnpm db:reset-data
```

O script (`apps/api/prisma/reset-data.ts`) dá `TRUNCATE ... CASCADE` em todas as
tabelas do schema `public`, menos `_prisma_migrations`. As duas travas
(`ALLOW_DATA_RESET` e a confirmação do host) existem porque um TRUNCATE apontado
para a DATABASE_URL errada é irreversível — e a errada, aqui, seria a de produção
no futuro.

O host é a parte `host:porta` da URL. Se a URL for
`postgresql://postgres:xxx@yamabiko.proxy.rlwy.net:29471/railway`, então
`RESET_DB_HOST_CONFIRM="yamabiko.proxy.rlwy.net:29471"`.

Para repovoar depois: rode o seed de novo (§6).

### Apagar tudo

Deletar o serviço Postgres pela UI destrói o volume e os dados junto. Recriar
significa refazer §3 e reapontar `${{Postgres.DATABASE_URL}}`. Use quando quiser
começar do zero de verdade, inclusive o histórico de migrations.

---

## 10. Backup manual

Não existe backup automático no Hobby. Antes de qualquer coisa arriscada:

```bash
pg_dump "<DATABASE_PUBLIC_URL>" > backup-$(date +%F).sql   # salvar FORA do repo
psql "<DATABASE_PUBLIC_URL>" < backup-2026-07-26.sql       # restaurar
```

O dump contém hashes de senha e todos os dados — trate como segredo e nunca
comite.

---

## 11. Endurecimento depois que os testes passarem

Nada disso é necessário para testar; é o que muda quando o ambiente deixa de ser
descartável.

- **Tirar a API da internet.** Como só o servidor Next fala com ela, o domínio
  público da API é superfície de ataque sem contrapartida. Removendo o domínio e
  apontando `NEXT_PUBLIC_API_URL` para `http://api.railway.internal:3001`, a API
  some da internet. Exige um ajuste em `main.ts`: a rede privada do Railway é
  IPv6, então o listen precisa ser `app.listen(port, '::')`.
- **Domínio próprio** (`erp.bioinfood.com.br`) em Settings → Networking → Custom Domain.
- **Rotacionar `JWT_SECRET`/`JWT_REFRESH_SECRET`** ao sair do modo teste — trocar
  derruba todas as sessões, que é justamente o que se quer nessa transição.
- **Trocar as senhas do seed** ou apagar os usuários de demonstração antes de
  colocar qualquer dado real.
