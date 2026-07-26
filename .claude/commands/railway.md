Você é o operador do ambiente Railway deste projeto.

Este skill é para **operar um ambiente que já está no ar**: investigar, ver logs,
rodar migration, semear, limpar dados, diagnosticar deploy quebrado. Para o
checklist *antes* de subir código, o skill é `/deploy`. A referência completa é
`docs/deploy-railway.md`; o roteiro de teste é `docs/testes-railway.md`.

## Antes de qualquer coisa

Descubra o estado real em vez de supor:

```bash
railway status                          # projeto/ambiente/serviço linkados
railway variables list --service api    # variáveis resolvidas
railway logs --service api              # o que o serviço está dizendo
```

Se o usuário não estiver logado, peça que ele rode `! railway login` — é
interativo e abre o navegador, você não consegue fazer por ele.

## Regras de segurança que não se negociam

- **Nunca rode comando destrutivo sem confirmação explícita do usuário nesta
  conversa.** Isso inclui `db:reset-data`, deletar serviço, `TRUNCATE`, `DROP` e
  restaurar backup por cima de dados existentes.
- **Sempre confirme para qual banco você está apontando** antes de escrever
  qualquer coisa. Mostre o host da `DATABASE_URL` e peça confirmação.
- **Nunca imprima segredos.** Ao mostrar variáveis, mascare `JWT_SECRET`,
  `JWT_REFRESH_SECRET` e a senha dentro da `DATABASE_URL`.
- **Não comite dump de banco.** Ele tem hash de senha e dados de cliente.

## Banco: qual URL usar

| URL                   | Alcance                         | Use para                          |
|-----------------------|---------------------------------|-----------------------------------|
| `DATABASE_URL`        | só dentro do Railway (privada)  | a API em runtime                  |
| `DATABASE_PUBLIC_URL` | internet                        | seed/reset/dump da máquina local  |

Rodar seed da máquina com a URL privada **trava sem erro claro** — é o engano mais
comum. Pegue a pública com `railway variables list --service Postgres --kv`.

## Receitas

**Semear (só cria o que não existe; não troca senha de usuário existente):**
```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" \
SEED_ADMIN_PASSWORD="..." SEED_LIDER_PASSWORD="..." SEED_CLIENTE_PASSWORD="..." \
pnpm seed
```
O seed **aborta** contra banco remoto sem essas senhas — é proposital.

**Limpar dados de teste (destrutivo — confirme antes):**
```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" \
ALLOW_DATA_RESET=yes RESET_DB_HOST_CONFIRM="<host:porta>" \
pnpm db:reset-data
```

**Backup antes de mexer no schema:**
```bash
pg_dump "<DATABASE_PUBLIC_URL>" > backup-$(date +%F).sql   # fora do repo
```

**Migration:** roda sozinha no start da API. Para forçar da máquina:
`DATABASE_URL="<pública>" pnpm db:deploy`.

## Diagnóstico

| Sintoma                              | Primeira hipótese                                              |
|--------------------------------------|-----------------------------------------------------------------|
| Deploy sobe e morre em loop          | Joi barrou env faltando — leia o log do boot, ele nomeia a var   |
| `/health` → 503                      | `DATABASE_URL` literal em vez de `${{Postgres.DATABASE_URL}}`    |
| Login → "Serviço indisponível"       | `NEXT_PUBLIC_API_URL` errada assada no build → **redeploy** do web |
| Mudou variável e nada mudou          | `NEXT_PUBLIC_*` só vale após novo build; restart não basta       |
| Cookie sem `Secure`                  | falta `NODE_ENV=production` no serviço `web`                     |
| `429` inesperado                     | rate limit de auth (5–10/min) — é o comportamento correto        |
| Todo mundo tomando rate limit junto  | `x-forwarded-for` não chegando; conferir `trust proxy`           |
| Healthcheck falha mas o app responde | `healthcheckPath` errado ou `/health` deixou de ser `@Public()`  |

## O que investigar sempre antes de concluir

Não afirme que algo "está funcionando" sem ter visto a resposta. Verificações
baratas:

```bash
curl -s $API/health
curl -s -o /dev/null -w "%{http_code}\n" $API/projects   # tem que ser 401
curl -s -o /dev/null -w "%{http_code}\n" $WEB/           # tem que ser 200
```

**Tarefa:** $ARGUMENTS
