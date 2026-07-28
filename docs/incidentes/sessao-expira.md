# Incidente — sessão expira a cada 15 minutos

**Status:** corrigido, aguardando deploy
**Branch:** `fix/sessao-expira`
**Diagnosticado em:** 2026-07-27
**Sintoma relatado:** usuários em produção eram deslogados e redirecionados para
`/login` a cada ~15 minutos de uso — exatamente o TTL do access token.

---

## Diagnóstico

### Causa raiz: divergência de shape entre a API e o BFF

O refresh **disparava, chegava até a API e funcionava lá dentro** — e o resultado
era descartado pelo BFF, que então tratava sucesso como sessão inválida.

A API devolve o par de tokens **achatado**:

```ts
// apps/api/src/modules/auth/infra/auth.controller.ts
@Post('refresh')
refresh(@Body() dto: RefreshDto) {
  return this.refreshUseCase.execute(dto.refreshToken);  // → { accessToken, refreshToken }
}
```

O BFF esperava **envelopado**, que é o shape do `/auth/login`:

```ts
// apps/web/app/api/auth/refresh/route.ts (antes)
const data = await apiRes.json();
return data.tokens                              // ← undefined, SEMPRE
  ? { ok: true, tokens: data.tokens as Tokens }
  : { ok: false, status: 401 };                 // ← caminho tomado em 100% dos casos
```

E o 401 sintético apagava os cookies:

```ts
const res = NextResponse.json({ message: 'Refresh inválido' }, { status: 401 });
res.cookies.delete('access_token');
res.cookies.delete('refresh_token');
```

Daí para o login: `lib/api.ts` → `'unauthorized'` → `window.location.href = '/'`;
e na navegação RSC, o `SessionRefreshGate` faz o mesmo.

### Das três hipóteses possíveis, era a terceira

Não era "o refresh nunca dispara" nem "dispara e falha": **dispara, funciona, e o
resultado é jogado fora**. O `POST :3001/auth/refresh` respondia **200** e o
`RefreshUseCase` rotacionava corretamente — revogava o jti atual e gravava o novo.

Consequência colateral: a cada ciclo o token do usuário era rotacionado no banco
e o par novo descartado. Como os cookies eram apagados na sequência, o token já
revogado nunca era reenviado — por isso a **detecção de reuso não disparava** e o
incidente aparecia como logout simples, sem o alerta de "sessão encerrada por
segurança" nos logs. Foi o que mascarou a causa.

### Por que exatamente 15min

O cookie `access_token` é gravado com `maxAge: 60*15`, igual ao TTL do JWT
(`jwt-token.service.ts`, `auth.module.ts`). Aos ~14min (margem de 60s em
`lib/auth.ts`) a primeira navegação ou chamada de API caía no caminho de
renovação — e o caminho de renovação estava quebrado desde que foi escrito.

### Por que passou pelos testes

`apps/web/lib/api.test.ts` mockava `/api/auth/refresh` devolvendo `{ ok: true }`
— o shape que o **BFF produz**, não o que a **API produz**. Isso cobre só o salto
navegador → BFF e confirma a suposição do próprio código. O salto BFF → API, onde
o shape divergia, não tinha teste nenhum.

Detalhe revelador: as fixtures dos testes de componente **são** tipadas pelos DTOs
de `@bioinfood/shared` (20 arquivos os importam). O par de tokens era justamente o
único contrato de fronteira **sem** tipo compartilhado — e foi exatamente ali que
os dois lados divergiram em silêncio.

### O que foi descartado na investigação

| Suspeita | Achado |
|---|---|
| Falta de interceptor de 401 | Existe e refaz a request original — `lib/api.ts` |
| Endpoint de refresh atrás do guard | Não. É `@Public()` |
| Middleware derrubando pro login | Não. `proxy.ts` deixa passar quando há refresh token |
| Corrida de N refreshes | Já coberta: single-flight por aba + dedupe por processo no BFF |
| Cookie não sobrevive a reload/aba | Sobrevive. `httpOnly`, `path:'/'`, `maxAge` 7d, sem `Domain` |
| Diferença dev × prod | Nenhuma. TTL é literal no código, sem env var |
| RSC sem encaminhar cookie | Não se aplica — RSC lê via `cookies()` e manda `Bearer` direto |

Reproduzia em dev igual a produção. Não era fenômeno de ambiente.

---

## Correção aplicada

**Etapa 1 — alinhar o contrato** (`fix: aceita o shape real do /auth/refresh…`)
`parseTokens()` em `app/api/auth/refresh/route.ts` aceita as duas formas
(achatada e envelopada) e exige os dois campos preenchidos — resposta inesperada
vira 401 explícito em vez de cookie vazio. Aceitar ambas evita acoplar o deploy
dos dois lados.

**Etapa 2 — teste do salto que faltava** (`test: cobre o salto BFF -> API…`)
`app/api/auth/refresh/route.test.ts`, com o upstream mockado no shape **real** da
API. Verificado que os casos falham contra o código anterior ao fix. O
`vitest.setup.ts` passou a ter os stubs de DOM condicionais, porque rotas do App
Router rodam em `@vitest-environment node`.

**Etapa 3 — contrato compartilhado** (`refactor: ancora o par de tokens…`)
`AuthTokensDto` / `AuthRefreshResponseDto` / `AuthLoginResponseDto` em
`packages/shared`, anotados nos dois lados (emite: `AuthController`,
`LoginUseCase`, `RefreshUseCase`; lê: as rotas BFF). Verificado que divergir o
tipo de propósito quebra o build da API.

---

## Riscos de segurança

As três etapas **não ampliam superfície nenhuma**. A rotação, a revogação do jti
e a detecção de reuso seguem intactas — o bug era puramente de leitura da
resposta.

Descartado explicitamente, por esconder o sintoma ou abrir buraco:

- **Aumentar o TTL do access token** — alarga a janela de um token roubado. Não é
  correção, é maquiagem.
- **Devolver o access token no corpo do `/api/auth/refresh`** — desfaria o ganho
  do proxy BFF; um XSS voltaria a poder emitir tokens sob demanda.
- **Tolerar refresh revogado na API** para "parar o logout" — mataria a detecção
  de roubo. É a armadilha clássica deste sintoma.
- **Deixar de apagar cookies em 503** — já estava correto: indisponibilidade não
  é sessão inválida.

Auditoria das flags de cookie (sem alteração necessária): `httpOnly` ✔,
`sameSite: 'lax'` ✔, `secure` em produção ✔, `path: '/'` ✔, sem `Domain` ✔.

### Risco que a correção torna ativo

Antes do fix a rotação nunca completava do lado do cliente, então a **dedupe por
processo** do BFF nunca era exercida de verdade. Com o fix, ela passa a ser o que
segura abas concorrentes — e ela é **por processo**.

> Se o serviço `web` no Railway rodar com mais de uma réplica, abas atendidas por
> réplicas diferentes voltam a correr, a API vê o mesmo jti duas vezes e a
> detecção de reuso derruba **todas** as sessões do usuário.
>
> **Confirmar 1 réplica antes do deploy.** Se escalar, a dedupe precisa ir para
> um lugar compartilhado (Redis) ou a API precisa tolerar a corrida.

---

## Como reproduzir

### Prova isolada, sem navegador

```bash
curl -s -X POST localhost:3001/auth/login -H 'content-type: application/json' \
  -d '{"email":"admin@bioinfood.com","password":"..."}'      # → { user, tokens: {...} }

curl -s -X POST localhost:3001/auth/refresh -H 'content-type: application/json' \
  -d '{"refreshToken":"<o refreshToken acima>"}'             # → { accessToken, refreshToken }
```

A diferença entre as duas formas — envelopada no login, achatada no refresh — é o
bug inteiro.

### No navegador

1. `pnpm dev`, login.
2. DevTools → Application → Cookies → apagar só `access_token` (simula os 15min
   sem esperar).
3. Navegar para qualquer rota do dashboard.

**Antes do fix:** pisca "Renovando sessão…" e cai em `/`. Na aba Network,
`POST /api/auth/refresh` = **401**, enquanto o log da API mostra o `/auth/refresh`
upstream em **200**. Essa discrepância 200-upstream / 401-BFF é a assinatura.

**Depois do fix:** o dashboard re-renderiza normalmente e o
`POST /api/auth/refresh` responde **200** com dois `Set-Cookie`.

### Na suíte

```bash
pnpm --filter @bioinfood/web test app/api/auth/refresh/route.test.ts
```

---

## Levantamento — outras rotas com o mesmo risco de contrato

Feito a pedido, **sem correção**. Todas as 5 rotas em `apps/web/app/api/`:

| Rota | Lê shape do upstream? | Risco | Teste de rota |
|---|---|---|---|
| `auth/refresh` | Sim — o par de tokens | **Era o bug.** Corrigido, tipado e testado | ✔ novo |
| `auth/login` | Sim — `data.tokens.accessToken`, `data.user.mustChangePassword` | **Mesmo risco, latente** | ✘ |
| `auth/change-password` | Só `err.message` no caminho de erro, com fallback | Baixo | ✘ |
| `auth/logout` | Não — fire-and-forget, ignora a resposta inteira | Nenhum | ✘ |
| `proxy/[...path]` | Não — repassa corpo e status crus | Nenhum de contrato | ✘ |

**`auth/login` é o que merece atenção.** Faz acesso profundo (`data.tokens.accessToken`)
sem guarda: se o shape divergir, dá `TypeError` → 500 no login. É a mesma classe de
bug, com uma diferença importante a favor — **falha ruidosa e imediata**, em vez de
silenciosa como era o refresh. A Etapa 3 já ancorou o tipo; falta o teste de rota.

O teste que existe é o antipadrão em estado puro: `components/auth/login-form.test.tsx`
mocka `/api/auth/login` devolvendo `{ user: {} }` — o shape que o **formulário**
consome, não o que a **rota** devolve. Verde independente do que a rota faça.

**`proxy/[...path]` não tem risco de contrato** — justamente porque não interpreta
shape nenhum. Mas é o caminho de 100% das chamadas do navegador e não tem teste
algum. Vale cobertura por criticidade (headers em `STRIPPED`, pass-through de
status, defesa de path traversal), não por risco de divergência.

**Fora do escopo de rotas BFF:** os 18 arquivos que mockam `@/lib/api` /
`@/lib/api-hooks` têm a mesma doença em tese — fixture escrita à mão a partir do
que o componente espera. Na prática o risco é **baixo**, porque 20 arquivos de
teste tipam as fixtures por `@bioinfood/shared`: mudar um DTO quebra o build do
teste. É a proteção que faltava justamente no par de tokens.

---

## Pendências

- [ ] Confirmar 1 réplica do serviço `web` no Railway **antes do deploy**
- [ ] Teste de rota para `auth/login` (risco latente, não corrigido nesta rodada)
- [ ] Teste de comportamento para `proxy/[...path]` (criticidade, não contrato)
