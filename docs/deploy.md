# Como este sistema vai ao ar

Este documento é para quem precisa operar o ERP e nunca viu o projeto. Ele
responde: onde as coisas rodam, como publicar uma mudança, o que fazer quando o
banco precisa mudar e como voltar atrás quando algo dá errado.

Se você só quer **montar o ambiente do zero** (criar os serviços no Railway pela
primeira vez), esse é outro documento: [`deploy-railway.md`](./deploy-railway.md).
Aqui tratamos do ambiente que **já existe e já tem gente usando**.

> **Contexto que muda tudo:** o ERP está em produção com usuários reais da
> Bioinfood dentro. Não existe ambiente de homologação. Toda publicação acontece
> na frente dessas pessoas, e o banco de produção tem dados que ninguém digitou
> duas vezes.

---

## 1. O mapa

Há **duas branches com significado** e nenhuma outra:

| Branch | O que é | Publica? |
|---|---|---|
| `develop` | Integração. Onde as features se encontram e a suíte roda junta. | **Não.** Não está ligada a nada. |
| `main` | Produção. O que está em `main` é o que os usuários estão usando agora. | **Sim, sozinha.** Railway observa e faz deploy. |

Qualquer outra branch (`feat/…`, `fix/…`, `docs/…`) é trabalho em andamento e
sai de `develop`.

```
feat/minha-coisa ──┐
                   ├──► develop ──(promoção deliberada)──► main ──► Railway ──► usuários
fix/outra-coisa ───┘      ▲                                  │
                          │                                  ▼
                    roda a suíte                     migrations aplicam
                    ninguém vê                          sozinhas
```

O ponto do desenho: **`develop` é onde erro é barato e `main` é onde erro é
caro.** Mergear em `main` não é "guardar código", é o ato de publicar.

### Onde as coisas rodam

Um projeto no [Railway](https://railway.app) com três serviços:

| Serviço | O que é | Observa |
|---|---|---|
| `Postgres` | O banco. Todos os dados do ERP. | — |
| `api` | NestJS. Fala com o banco. | `main` |
| `web` | Next.js. É o que as pessoas abrem no navegador. | `main` |

`api` e `web` têm **Root Directory na raiz** do monorepo, não em `apps/api` e
`apps/web`. Isso é intencional: `packages/shared` é TypeScript cru e o build
precisa do workspace inteiro. O que separa os dois serviços é o `--filter` nos
comandos, versionado em `apps/api/railway.json` e `apps/web/railway.json`.

---

## 2. Publicar uma mudança

Você tem trabalho pronto numa branch e quer colocá-lo no ar.

### Passo 1 — a branch entra em `develop`

```bash
git checkout develop
git pull
git merge --no-ff feat/minha-coisa
```

Antes de seguir, com a `develop` já atualizada:

```bash
pnpm install          # se package.json ou o lockfile mudaram
pnpm test             # a suíte inteira, os dois apps
pnpm lint
pnpm build            # o build quebra por coisa que o teste não pega
```

Se algo falhar aqui, **conserte em `develop`**. Foi exatamente para isso que ela
existe. Nada disso chegou perto dos usuários ainda.

### Passo 2 — a promoção para `main`

Este é o passo que publica. Faça-o consciente de que está publicando.

```bash
git checkout main
git pull
git merge --no-ff develop
git push origin main
```

`--no-ff` importa: força um commit de merge, então o histórico de `main` vira uma
lista legível de publicações em vez de uma fileira de commits soltos. Quando algo
quebrar, é esse commit que você reverte.

Assim que o `push` completa, o Railway começa a construir. Ninguém precisa
apertar nada.

### Passo 3 — confirmar que subiu

Não confie no "Deployed" verde do painel: ele diz que o processo subiu, não que o
sistema funciona.

```bash
curl -s https://<dominio-da-api>/health           # deve responder ok
curl -s -o /dev/null -w "%{http_code}\n" \
     https://<dominio-da-api>/projects            # deve ser 401, não 200 nem 500
curl -s -o /dev/null -w "%{http_code}\n" https://<dominio-do-web>   # deve ser 200
```

O segundo comando é o mais importante dos três: um `200` ali significa que uma
rota protegida ficou aberta. Um `500` significa que a API subiu sem conseguir
falar com o banco.

Depois, abra o sistema no navegador e faça login de verdade. Leva 30 segundos e
pega a classe de problema que nenhum `curl` pega.

### Passo 4 — quando dá errado

Reverta primeiro, investigue depois. Com usuários dentro, o tempo quebrado é o
custo real.

```bash
git checkout main
git revert -m 1 <hash-do-commit-de-merge>
git push origin main
```

O `-m 1` é obrigatório em commit de merge: diz ao git para voltar ao estado do
primeiro pai, isto é, `main` antes da publicação. O Railway reconstrói sozinho.

**Reverter código não reverte migration.** Se a publicação incluía mudança de
banco, leia a seção 3 antes de reverter — a ordem correta é outra.

---

## 3. Mudar o banco em produção

Leia esta seção inteira antes de rodar qualquer coisa. É a parte do sistema onde
o erro não tem desfazer.

### O que acontece sozinho

`apps/api/railway.json` define:

```json
"startCommand": "pnpm --filter @bioinfood/api prisma:deploy && node apps/api/dist/src/main.js"
```

Ou seja: **toda migration presente em `main` é aplicada automaticamente ao banco
de produção** no momento em que o serviço `api` sobe. Não há aprovação, não há
confirmação, não há aviso.

A consequência prática: no instante em que você faz merge em `main`, uma
migration que apaga uma coluna apaga a coluna. Se a migration falhar, o `&&`
impede a API de subir — o sistema fica fora do ar até alguém resolver o banco.

### A regra

**Migration destrutiva vai em duas publicações, nunca em uma.**

Destrutiva é qualquer uma que remova ou renomeie coluna ou tabela, ou que
adicione coluna `NOT NULL` sem default. Nesses casos:

1. **Publicação 1 — aditiva.** Cria o campo novo, mantém o antigo. O código passa
   a escrever nos dois e a ler do novo. Publique e deixe rodando alguns dias.
2. **Publicação 2 — a remoção.** Só depois de confirmar que nada usa o campo
   antigo, remova-o.

Renomear uma coluna direto é o erro clássico: entre o momento em que a migration
aplica e o momento em que o novo código está servindo, o código antigo está
consultando uma coluna que não existe mais.

### Antes de publicar qualquer migration

```bash
# 1. Backup. Sem exceção. Ver seção 4.
pg_dump "<DATABASE_PUBLIC_URL>" > backup-antes-da-migration-$(date +%F).sql

# 2. Leia o SQL que você está prestes a aplicar — não o schema, o SQL.
cat apps/api/prisma/migrations/<timestamp>_<nome>/migration.sql

# 3. Ensaie contra uma cópia, nunca contra produção.
createdb ensaio
psql ensaio < backup-antes-da-migration-$(date +%F).sql
DATABASE_URL="postgresql://localhost/ensaio" pnpm db:deploy
```

Procure no `migration.sql` por `DROP`, `ALTER COLUMN … SET NOT NULL` e qualquer
coisa com `CASCADE`. É onde os dados somem.

### Regra que não se quebra

**Nunca edite nem apague uma migration já aplicada.** O Prisma guarda um registro
das migrations aplicadas e detecta quando o arquivo mudou; o banco entra em
estado inconsistente e o deploy passa a falhar no boot. Errou numa migration? A
correção é uma migration nova.

### Se a migration falhar em produção

O sintoma é a API não subir e o log mostrar erro de migration. O banco fica
marcado como falho e o Prisma se recusa a continuar.

```bash
railway logs --service api                      # leia o erro de verdade primeiro
railway variables list --service Postgres --kv  # pegue DATABASE_PUBLIC_URL

# Marque a migration falha como revertida e corrija o estado à mão:
DATABASE_URL="<DATABASE_PUBLIC_URL>" \
  pnpm --filter @bioinfood/api exec prisma migrate resolve --rolled-back "<nome_da_migration>"
```

Se o banco ficou meio-migrado, restaurar o backup (seção 4) é mais rápido e mais
seguro do que consertar à mão sob pressão.

---

## 4. Backup e restauração

O plano Hobby do Railway **não faz backup automático**. O único backup que existe
é o que alguém rodou.

### Fazer

```bash
railway variables list --service Postgres --kv   # copie DATABASE_PUBLIC_URL
pg_dump "<DATABASE_PUBLIC_URL>" > backup-$(date +%F).sql
```

Use a URL **pública** (`DATABASE_PUBLIC_URL`). A privada só funciona de dentro da
rede do Railway.

O arquivo contém hashes de senha e todos os dados dos clientes. Guarde **fora do
repositório**, num lugar com controle de acesso. Nunca comite. Nunca mande por
canal aberto.

Faça um backup antes de toda migration e antes de qualquer script de limpeza de
dados.

### Restaurar

Restaurar **substitui** o conteúdo atual. Tudo que entrou depois do dump se perde.

```bash
# 1. Pare o tráfego: Railway → serviço `web` → Settings → Remove Domain.
#    Sem isso, gente continua escrevendo num banco que você está reescrevendo.

# 2. Salve o estado atual mesmo que pareça ruim — ele pode ter dados que o
#    backup não tem.
pg_dump "<DATABASE_PUBLIC_URL>" > antes-da-restauracao-$(date +%F).sql

# 3. Restaure.
psql "<DATABASE_PUBLIC_URL>" < backup-2026-07-26.sql

# 4. Confira antes de reabrir: usuários e projetos batem com o esperado?
psql "<DATABASE_PUBLIC_URL>" -c 'SELECT count(*) FROM "User";'
psql "<DATABASE_PUBLIC_URL>" -c 'SELECT count(*) FROM "Project";'

# 5. Devolva o domínio do `web` e faça um login de verdade.
```

O passo 2 parece paranoia e não é: quase todo desastre de restauração vem de
descobrir tarde demais que o backup era mais antigo do que se pensava.

---

## 5. Variáveis de ambiente

Não existem em arquivo neste repositório — vivem no painel do Railway, em
**Variables**, por serviço. `.env` é só desenvolvimento local e está no
`.gitignore`.

### Serviço `api`

| Variável | Valor | Para que serve |
|---|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Conexão com o banco |
| `JWT_SECRET` | 32+ caracteres aleatórios | Assina o access token |
| `JWT_REFRESH_SECRET` | 32+ aleatórios, **diferente** do de cima | Assina o refresh token |
| `CORS_ORIGINS` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` | Quem pode chamar a API |
| `NODE_ENV` | `production` | — |

### Serviço `web`

| Variável | Valor | Para que serve |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://${{api.RAILWAY_PUBLIC_DOMAIN}}` | Onde o `web` acha a API |
| `NODE_ENV` | `production` | **Liga o `Secure` dos cookies de sessão** |

### Quatro coisas que dão errado aqui

1. **`${{...}}` são *reference variables*.** O Railway resolve sozinho e reescreve
   se a URL mudar. Colar o valor literal funciona hoje e quebra silenciosamente
   quando o domínio mudar.

2. **`NEXT_PUBLIC_API_URL` é assada no build.** O prefixo `NEXT_PUBLIC_` faz o
   Next substituir a variável pelo texto literal durante `next build`. Trocar o
   valor e **reiniciar** o serviço não tem efeito nenhum — é preciso
   **redeployar** o `web`. Sintoma típico: login respondendo "Serviço
   indisponível" depois de uma troca de domínio.

3. **`NODE_ENV=production` no `web` não é decorativo.** É a condição que liga a
   flag `Secure` dos cookies de sessão (`apps/web/app/api/auth/*/route.ts`). Sem
   ela, um site HTTPS emite cookie de sessão sem `Secure`.

4. **Não defina `PORT`.** O Railway injeta a dele e o `main.ts` já lê
   `process.env.PORT`. O `3001` só vale local.

### Gerar um segredo

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

A API valida `JWT_SECRET`, `JWT_REFRESH_SECRET` e `DATABASE_URL` no startup
(Joi) e **se recusa a subir** sem elas. Isso é intencional — é melhor não subir
do que subir inseguro. Se o deploy morrer no boot, o log diz exatamente qual
variável faltou.

**Trocar `JWT_SECRET` ou `JWT_REFRESH_SECRET` derruba a sessão de todo mundo.**
Às vezes é exatamente o que se quer (suspeita de vazamento); nunca é algo a fazer
por acidente numa terça de manhã.

---

## 6. Scripts de dados

Todos rodam **da sua máquina** contra o banco remoto, e todos exigem confirmação
explícita — de propósito.

| Comando | O que faz |
|---|---|
| `pnpm seed` | Popula o banco. Exige `SEED_ADMIN_PASSWORD`, `SEED_LIDER_PASSWORD`, `SEED_CLIENTE_PASSWORD` e `SEED_DEMO_PASSWORD` (são **quatro**). Aborta contra banco remoto sem elas — os defaults são públicos neste repositório. |
| `pnpm db:unseed` | Remove só o que o seed criou, preservando cadastro real. Dry-run por padrão; apaga com `UNSEED_CONFIRM=yes` + `UNSEED_DB_HOST_CONFIRM`. Preserva `admin@bioinfood.com`, as taxonomias e o funil do CRM. |
| `pnpm db:reset-data` | **Apaga todos os dados**, mantém o schema. Exige `ALLOW_DATA_RESET=yes` e confirmação do host. |
| `pnpm db:deploy` | Aplica migrations pendentes. Em produção isso já acontece sozinho no start da API. |

Detalhe de cada um em [`deploy-railway.md`](./deploy-railway.md) §6 e §9.

> Rodar o seed duas vezes **não troca a senha de ninguém** — os `upsert` usam
> `update: {}`. Se um ambiente já foi semeado com senha padrão, re-semear **não
> fecha o buraco**; só o reset dos dados fecha.

---

## 7. Quando algo está errado agora

| Sintoma | Comece por aqui |
|---|---|
| Site fora do ar | `railway logs --service web` e `--service api`. A API sobe? |
| API não sobe | Log do boot. Quase sempre é variável faltando ou migration falhando (seção 3). |
| Login diz "Serviço indisponível" | `NEXT_PUBLIC_API_URL` errada **ou** certa mas sem redeploy do `web` (seção 5, item 2). |
| Erro de CORS no navegador | `CORS_ORIGINS` no `api` não bate com o domínio real do `web`. |
| Tudo lento | Painel do Postgres: uso de conexão e de disco. |
| Publicação quebrou algo | Reverta primeiro (seção 2, passo 4). Investigue com o sistema no ar. |

```bash
railway logs --service api --lines 200
railway logs --service web --lines 200
railway status
```

---

## 8. Se você é a única pessoa que sabe operar isto

Então este documento é o seu backup, e ele só vale se estiver correto. Toda vez
que operar algo aqui e a realidade divergir do que está escrito, **corrija o
texto na hora**. Documentação de operação errada é pior do que documentação
ausente: ela é seguida com confiança.

Coisas que hoje vivem só na cabeça de alguém e deveriam estar registradas em
lugar seguro (gerenciador de senhas da empresa, não neste repositório):

- quem tem acesso à conta do Railway, e quem tem acesso se essa pessoa não estiver;
- onde ficam os backups e quem consegue lê-los;
- quem é o `admin@bioinfood.com` e quem sabe a senha dele.
