# Análise de Segurança — ERP Bioinfood (consolidada)

> **Data:** 2026-07-19 (1ª auditoria consolidada — `/seguranca-total`) · **Remediação aplicada no mesmo dia.**
> **Escopo:** `apps/api` (18 módulos) + `apps/web` (Next 16) + configuração de deploy visível no repo.
> **Método:** leitura de código + `pnpm audit --prod` + análise de alcançabilidade. **Não** cobre o painel do Railway (envs reais, rede, DNS) — ver "Fora do alcance".

> ## ✅ Status pós-remediação (2026-07-19)
> **Todos os achados acionáveis por código foram corrigidos e verificados** (72 testes verdes, `tsc`+`nest build` verdes, validação em runtime real):
> - **S1/S2** ✅ `validationSchema` (Joi) no `ConfigModule` + `registerAsync`/`ConfigService` — fallbacks `?? 'secret'` removidos. **Verificado:** API recusa boot com `JWT_SECRET` fraco (`Config validation error: "JWT_SECRET" length must be at least 16`).
> - **A1** ✅ `get-task` escopado por `projectId`. **Verificado:** projeto certo → 200, projeto errado → 403.
> - **A2** ✅ reorder/checklist/removeDependency escopados via `WHERE`. **Verificado:** checklist em projeto errado → 404.
> - **I1** ✅ `@nestjs/throttler` global (120/min) + auth 5-10/min + `trust proxy`. **Verificado:** 6ª tentativa de login → 429.
> - **I2** ✅ `Math.min` nas listagens com take do cliente (crm-activities, interactions).
> - **I3** ✅ `helmet` + `x-powered-by` off + body limit 1mb. **Verificado:** headers HSTS/nosniff/SAMEORIGIN presentes, sem `X-Powered-By`.
> - **I4** ✅ `AllExceptionsFilter` global (shape fixo, não vaza stack).
> - **S3** ✅ tradeoff do token documentado em `auth-provider.tsx` + `CLAUDE.md`.
> - **SC1** ✅ `pnpm.overrides` fixou multer/tar/file-type/postcss patched — audit caiu de **17 (10 high) → 2 moderate** (só `@nestjs/core` e `qs` transitivos, ver SC2).
> - **A9** ✅ imports mortos (`Reflector`, `JwtModule`) removidos como efeito colateral.
>
> **Aberto (aceito/deferido):** SC2 (NestJS 10→11 major, janela dedicada); privilégio do Postgres e envs reais do Railway (fora do alcance de código).
> O corpo abaixo é o diagnóstico original, mantido como registro.

---

---

## 1. Postura geral

O sistema está **razoavelmente seguro para o uso interno que tem hoje** (~12 usuários autenticados, dados de P&D), com fundação boa: três guards globais (`JwtAuthGuard` + `RolesGuard` + `ProjectAccessGuard`), `ValidationPipe` global com `whitelist`, CORS restrito por env, cookies `httpOnly`+`secure`+`sameSite`, timeout na única chamada externa (BrasilAPI), filtro de CLIENTE por `ProjectAccess`. **Mas há um 🔴 crítico que anula tudo isso: o fallback `JWT_SECRET ?? 'secret'`** — se a env faltar no Railway, qualquer um forja um token ADMIN. O caminho de ataque mais provável não é DDoS (o Railway absorve rede); é **(a) esse deploy sem `JWT_SECRET`, ou (b) brute-force de senha no `/auth/login`, que hoje não tem rate limit nenhum.**

---

## 2. Achados consolidados (ranqueados por risco real)

### 🔴 Crítico

**S1 · [Segredos] `JWT_SECRET ?? 'secret'` → forja de token ADMIN se a env faltar**
`apps/api/src/modules/auth/infra/auth.module.ts:21` e `jwt.strategy.ts:12`. Assinatura e validação caem no mesmo literal `'secret'`. `ConfigModule.forRoot` (`app.module.ts:31`) **sem `validationSchema`** — a app sobe sem `JWT_SECRET` e passa a aceitar qualquer JWT assinado com `'secret'`.
**Cenário:** serviço recriado no Railway, typo na env ou env nova esquecida → API sobe "saudável" → atacante monta `{sub, email, role:"ADMIN"}`, assina com `'secret'`, tem gestão total. Sem log, sem erro, sem sintoma. Falha **aberta**.
**Correção:** remover os dois fallbacks + `validationSchema` (Joi) cobrindo `JWT_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`. App sem segredo recusa startup. ~20 linhas. *(4ª análise consecutiva apontando — ver `docs/analise-backend.md` B1.)*

**A1 · [Auth/RBAC] `GET /projects/:projectId/tasks/:id` ignora o `projectId` → CLIENTE lê task de qualquer projeto**
`apps/api/src/modules/tasks/application/use-cases/get-task.use-case.ts:8` (`execute(id)`), `tasks.controller.ts:77-80` (`@Get(':id')` **sem `@Roles`**, não passa `projectId`). O `ProjectAccessGuard` valida o `:projectId` da URL, mas a task é buscada só por `id`.
**Cenário:** CLIENTE com acesso ao projeto A chama `GET /projects/A/tasks/<id-de-task-do-projeto-B>` e lê título/descrição/checklist de projeto de outro cliente — quebra o isolamento que o `ProjectAccess` existe para garantir. O padrão correto está **no mesmo arquivo**: `update`/`delete` já validam `task.projectId !== projectId`.
**Correção:** `getTask.execute(projectId, id)` + `ForbiddenException` se não bater. 3 linhas. *(Cross-ref: `analise-backend.md` A1.)*

### 🟠 Alto

**I1 · [Infra] `/auth/login`, `/auth/refresh`, `/auth/change-password` sem rate limiting → brute-force livre**
Nenhum `@nestjs/throttler` no projeto (`grep` = 0). `login.use-case.ts` não tem contagem de tentativas.
**Cenário:** com senhas de seed no padrão `nome123`, um script tenta milhares de senhas/min contra `/auth/login` sem nenhuma barreira — é o ataque mais provável e barato neste app. Também permite floodar o refresh.
**Correção:** `@nestjs/throttler` global folgado (ex.: 100/min/IP) + `@Throttle` agressivo (5/min) nas 3 rotas de auth. Exige `trust proxy` para o throttler ver o IP real atrás do Railway (senão o limite vira global-compartilhado). ~30 linhas.

**A2 · [Auth/RBAC] Sub-recursos de task escrevíveis sem validar posse do pai (IDOR latente)**
`tasks.controller.ts:73` (`reorder` sem `projectId`), `:117-119` (`removeDep(depId)` sem escopo), `:123-139` (checklist por `taskId`/`itemId` sem cadeia até o projeto).
**Cenário:** hoje `@Roles(INSERE+)` barra CLIENTE e papéis internos têm escopo global → exploração real baixa. Mas é IDOR latente: vira escalonamento imediato se o RBAC ganhar escopo por projeto, e já permite mutar dados pela URL do projeto errado. O padrão certo já existe no CRM (`opportunities.prisma.repository.ts:115`, `where:{id,stageId}`).
**Correção:** propagar `projectId` e escopar no `WHERE`. *(Cross-ref: `analise-backend.md` A2.)*

**S2 · [Segredos] `JWT_REFRESH_SECRET` sem validação → refresh assinado com `undefined` se faltar**
`jwt-token.service.ts:25,34` usa `process.env.JWT_REFRESH_SECRET` cru, sem fallback e sem validação de startup. Se faltar, `sign`/`verify` operam com `undefined` — comportamento indefinido no fluxo de refresh.
**Correção:** coberto pelo mesmo `validationSchema` de S1.

### 🟡 Médio

**I2 · [Infra] Listagens com `take` controlado pelo cliente sem teto**
`crm-activities.prisma.repository.ts:85` (`take: filter.take ?? 200`) e `interactions.prisma.repository.ts:59` (`?? 50`) — o `take` vem da query string sem `Math.min`. `?take=999999` faz varredura completa da tabela.
**Cenário:** usuário interno (ou token vazado) dispara `?take=9999999` repetidamente → full scan por request → pressão de CPU/memória no Postgres do plano Railway. As demais listagens usam constantes fixas (500/1000/5000) — não controladas pelo cliente, mas `pipelines:121 take:5000` e `opportunities:67 take:1000` são altas o suficiente para revisar.
**Correção:** `Math.min(take ?? default, 100)` nas duas rotas com input do cliente. *(Cross-ref: `analise-backend.md` B2.)*

**I3 · [Infra] Sem `helmet` nem headers de proteção; sem limite explícito de body**
`main.ts:5-16` não aplica `helmet` (sem `X-Content-Type-Options`, `X-Frame-Options`/CSP; `X-Powered-By` do Express exposto) e não configura limite de body (default Express ~100kb — aceitável, mas não explícito).
**Correção:** `app.use(helmet())` + `app.disable('x-powered-by')`. ~2 linhas.

**I4 · [Infra] Sem filtro global de exceção → shape de erro inconsistente**
Zero `ExceptionFilter`/`APP_FILTER` no projeto. Erros não tratados viram 500 sem shape padronizado; risco de vazar detalhe interno em produção se `NODE_ENV` não estiver setado.
**Correção:** `AllExceptionsFilter` global com shape fixo `{message, statusCode}`. *(Cross-ref: `analise-backend.md` A8.)*

**S3 · [Segredos] Access token exposto ao JS do client — tradeoff não documentado**
`apps/web/app/(dashboard)/layout.tsx:15-18` injeta o token no `<AuthProvider token>`; ele viaja no payload RSC e é legível por qualquer script (o `httpOnly` do cookie fica anulado na prática). É tradeoff deliberado (client chama a API `:3001` com Bearer), mas **nada no código ou no CLAUDE.md registra isso** — grep por "tradeoff/XSS/httpOnly" no `auth-provider.tsx` = 0.
**Cenário:** um XSS neste app rouba a sessão pelo contexto/DOM, não precisa do cookie. Aceitável para app interno, mas invisível para quem for mexer.
**Correção:** documentar como decisão consciente (comentário + CLAUDE.md). *(Cross-ref: `analise-frontend.md` A2.)*

### 🔵 Baixo

**SC1 · [Supply chain] 17 vulns no `pnpm audit --prod` — mas as de app não são alcançáveis**
`multer <2.2.0` (10 highs) vem transitivamente de `@nestjs/platform-express`, mas **nenhum `FileInterceptor`/upload é usado** (`grep` = 0) → caminho não alcançável. `tar`/`file-type` são de build/transitivos; `postcss <8.5.10` é build-time. Risco de exploração hoje ≈ nulo.
**Correção (higiene):** `pnpm update` para puxar os patches transitivos; considerar `@nestjs/*` 10→11 (major) numa janela dedicada, não urgente.

**SC2 · [Supply chain] NestJS 10.x com 11.x disponível** — `pnpm outdated` mostra todo o core Nest um major atrás. Sem vuln direta crítica; planejar upgrade para não acumular dívida.

**A3 · [Auth/RBAC] `JWT_SECRET = 'change-me'` no `.env.example`** — correto que seja placeholder, mas confirmar que o Railway **não** herdou o placeholder (verificação fora do alcance do código — ver abaixo).

---

## 3. Postura por pilar

| Pilar | Estado | Nota |
|---|---|---|
| **Segredos & config** | 🔴 | Fundação de cookies/CORS boa, mas `?? 'secret'` + sem `validationSchema` é crítico e persiste há 4 análises |
| **Auth & RBAC** | 🟠 | Guards globais e CRM exemplares; núcleo `tasks` com IDOR de leitura (🔴 A1) e latente (A2) |
| **Infra & abuso** | 🟠 | Sem rate limit em auth (brute-force livre) e sem helmet; `take` do cliente sem teto |
| **Supply chain** | ✅/🟡 | 17 vulns mas as sérias (multer) **não alcançáveis**; higiene de `pnpm update` pendente |

Tendência: primeira auditoria consolidada — sem baseline anterior. Os achados de RBAC/secrets **confirmam** o que `analise-backend.md` já registrava (persistem inalterados).

---

## 4. Plano de endurecimento priorizado

1. **Matar `?? 'secret'` + `validationSchema` no ConfigModule** (S1+S2+A3) — 🔴, ~20 linhas, ~30min. Fecha a única porta de comprometimento total. **Antes de qualquer deploy.**
2. **Rate limit em auth** (I1) — 🟠, `@nestjs/throttler` + `trust proxy`, ~30 linhas, ~1h. Fecha o brute-force.
3. **Escopar `tasks` pelo `projectId`** (A1+A2) — 🔴 A1 é vazamento real hoje; `get` são 3 linhas, o resto é `WHERE` escopado copiando o CRM. ~1h.
4. **helmet + teto de `take` + exception filter** (I2+I3+I4) — 🟡, endurecimento barato, ~1h somado.
5. **`pnpm update` transitivo + registrar tradeoff do token** (SC1+S3) — higiene, ~30min.

---

## 5. Fora do alcance desta auditoria

- **Painel do Railway**: valores reais das envs (o `JWT_SECRET` de produção pode já estar correto — S1 é sobre *falha se faltar*, não prova de que falta), `NODE_ENV=production`, rede, escalonamento, TLS.
- **DDoS volumétrico de rede** (L3/L4): responsabilidade da borda do Railway, não da aplicação.
- **Privilégio da credencial do Postgres** (`DATABASE_URL` provavelmente owner — dívida a registrar, não verificável pelo código).
- **Pentest dinâmico / fuzzing**: esta é auditoria estática de código.
