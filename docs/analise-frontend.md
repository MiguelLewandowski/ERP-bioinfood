# Análise de Frontend — ERP Bioinfood

> **Data:** 2026-07-19 (5ª passagem) · **Alvo:** `apps/web/app` + `apps/web/components` (~110 arquivos)
> **Revisor:** Tech Lead Frontend (skill `/analisar-frontend`)
> **Estado:** pós reforma de UX (tokens + `components/ui/` + migração completa) e onda CRM (branch `feat/crm-empresa-pessoa-negocio-tarefas`).

---

## 1. Resumo

**A leitura de tendência da 4ª passagem se confirmou: corrigir a base fez a correção grudar.** Com `components/ui/` criado e o `design-tokens.md` reescrito para tokens, os dois achados que haviam *triplicado* foram praticamente zerados — hex 955→**44** (11 arquivos, quase todos data-viz) e modais hand-rolled 17→**1** (o próprio `ui/dialog.tsx`). As server pages migraram para `api-hooks` (zero `fetchJson` local), `loading.tsx`/`error.tsx` cobrem **17 segmentos**, e o middleware centraliza autenticação com refresh proativo. A arquitetura está saudável; o que resta é **drift semântico** (mapas de status/prioridade redefinidos por tela, com escalas conflitantes) e um tradeoff de segurança a documentar (token no contexto client).

---

## 2. Pontos fortes (preservar)

- ✅ **Camada de dados fechada**: `lib/api.ts` (401 → refresh via BFF → retry → redirect; normalização de erro do ValidationPipe; corpo vazio tratado) + `lib/api-hooks.ts` tipado com DTOs de `@bioinfood/shared`. Zero `fetch` cru fora de auth. `NEXT_PUBLIC_API_URL` só em 3 rotas BFF (`app/api/auth/*`) e na lib — era 21 arquivos.
- ✅ **`components/ui/` existe e é usado**: 15 primitivos (dialog, button, badge, status-badge, empty-state, page-header, masked-input…). Único `fixed inset-0` do app está dentro do próprio `ui/dialog.tsx`.
- ✅ **`loading.tsx` em 17 segmentos + 17 `error.tsx`** — cobertura completa das rotas de dashboard (era 5 de ~14).
- ✅ **Middleware de auth centralizado** (`middleware.ts`): rota protegida por padrão, refresh proativo quando o token expira em <60s, redirect de troca de senha obrigatória. Nenhuma página faz guard manual.
- ✅ **Server Components fazem fetch inicial, clients interagem**; optimistic update com rollback (kanban CRM e projeto); `router.refresh()` após mutação em 15 arquivos.
- ✅ **Providers em contexto** (auth/confirm/breadcrumb) — sem prop drilling; `ConfirmProvider` unifica confirmação destrutiva.
- ✅ Tipos de domínio 100% de `@bioinfood/shared` — sem `any` de contrato, sem drift de DTO.

---

## 3. Achados por severidade

### 🟠 Alto

**A1 — Mapas semânticos de status e prioridade duplicados por tela, com escalas conflitantes** *(novo como achado de arquitetura; é a causa raiz dos achados #1/#2 da análise de UI/UX de 2026-07-19)*
A fonte única existe — `components/ui/status-badge.tsx` (com comentário "nunca redefinir cores de status localmente") e `lib/activities.ts:132` (`PRIORITY_META`) — mas:
- **Status de projeto** redefinido em `components/projects/projects-table.tsx:9` e `project-card.tsx:18` (`STATUS_COLORS` com `bg-blue-100` fora da paleta) + labels re-declarados em `project-card.tsx:10`, `charter-client.tsx:27`, `project-settings-client.tsx:18`, `lib/project-report.ts:4` — 5 cópias do mesmo de-para.
- **Prioridade de task** tem 2 escalas *contraditórias*: `lib/activities.ts:132` (Alta=âmbar, Crítica=vermelho) vs `kanban-card.tsx:8` + `backlog-row.tsx:14` (`PRIORITY_CONFIG` local: Alta=verde `#86C175`, Crítica=verde `#147F23`) — a mesma entidade Task muda de cor entre telas.
**Impacto (acoplamento/escala):** o padrão que fez hex e modais regredirem era exatamente este — mapa local por tela. Hoje são ~9 arquivos com `PLANNING` e ~9 com `PRIORITY_*`; cada onda nova escolhe um dos dois vocabulários (ou inventa um terceiro).
**Correção:** `StatusBadge` nos componentes de projeto (apagar `STATUS_COLORS`/`STATUS_LABELS` locais, importar labels de um único lugar); criar `PriorityBadge` (ou constante única em `lib/`) e apagar os `PRIORITY_CONFIG` de kanban/backlog.

**A2 — Access token exposto ao JavaScript do client via contexto**
`app/(dashboard)/layout.tsx:15-18` lê o cookie `httpOnly` no server e injeta o token cru no `<AuthProvider token={token}>` — ou seja, o token viaja serializado no payload RSC e fica legível por qualquer script da página. O `httpOnly` do cookie fica **anulado na prática**: um XSS lê o token do contexto/DOM mesmo sem acessar o cookie.
**Impacto (segurança):** é um tradeoff deliberado (o client chama a API `:3001` direto com `Bearer`), mas hoje ele é invisível — nada documenta que o `httpOnly` não protege de verdade.
**Correção (mínima, KISS):** documentar o tradeoff no código e no CLAUDE.md como decisão consciente; correção completa (se um dia houver dados sensíveis de cliente externo): proxy BFF para as chamadas do client, mantendo o token só em cookie. Não recomendo reescrever agora — app interno, 12 usuários — mas a decisão precisa estar registrada.

### 🟡 Médio

**M1 — Schemas Zod continuam locais; `packages/shared` não tem nenhum** *(persiste desde a 3ª passagem, era M2)*
6 arquivos com `z.object` no web; `packages/shared/src/index.ts` tem 0 usos de zod. Regras podem divergir do `ValidationPipe` do Nest (ex.: `project-dialog.tsx:24` limita nome a 200 chars — o backend limita?).
**Correção:** `packages/shared/src/schemas.ts` com os schemas dos forms principais, importado dos dois lados. Começar pelos 2-3 forms mais editados (projeto, oportunidade, empresa).

**M2 — `charter-client.tsx` com 703 linhas mistura formulário + gerador de PDF inline**
`charter-client.tsx:238+` embute ~200 linhas de template HTML/CSS de exportação dentro do client component (junto com 9 `useState` de form).
**Impacto:** o maior arquivo do frontend tem duas responsabilidades sem relação; o template não é testável nem reutilizável.
**Correção:** extrair o template para `lib/charter-pdf.ts` (função pura `CharterDto → string`), no padrão do `lib/project-report.ts` que já existe.

**M3 — Hex remanescente em badges de UI comum (fora da exceção de data-viz)**
Dos 44 hex em 11 arquivos, a maioria é data-viz legítima (heatmap de riscos, matriz de stakeholders, WBS, export PDF). Mas `kanban-card.tsx:9-12`, `backlog-row.tsx:14-17` e `lib/activities.ts:133-140` usam hex para **badges e dots de UI normal** — exatamente o que a regra de tokens proíbe.
**Correção:** resolve-se de graça junto com A1 (o `PriorityBadge` único usa tokens).

### 🔵 Baixo

**B1 — `cookies().get('access_token')` copiado em ~15 server pages** enquanto `lib/auth.ts:6` já expõe `getAccessToken()`. Funciona, mas é o mesmo padrão de duplicação que A1; trocar quando tocar em cada página.
**B2 — Forms de auth com `fetch` cru** (`login-form.tsx:27`, `change-password-form.tsx:38`, `sidebar.tsx:36` para logout) — aceitável por serem rotas BFF internas sem Bearer, mas um helper `bffApi` de 5 linhas eliminaria a exceção.
**B3 — Sem paginação** em projects/users/backlog/empresas — segue irrelevante no volume atual (~12 usuários); revisitar a partir de ~200 registros.
**B4 — `dados-tab.tsx` (633 linhas) e `task-form-dialog.tsx` (581)** — grandes mas coesos; dividir só se voltarem a crescer.

---

## 4. Prontidão para escala (muitos módulos)

| Risco | 4ª passagem | Hoje | Ao multiplicar módulos |
|---|---|---|---|
| Hex hardcoded | 955 / 66 arq. | **44 / 11 arq.** ✅ | resto é data-viz; badge de prioridade sai com A1 |
| Modal hand-rolled | 17 | **1 (o próprio ui/dialog)** ✅ | base existe; regressão improvável |
| Server pages fora da lib de dados | 21 | **0** ✅ | rotas numa fonte única |
| `loading`/`error.tsx` | 5 de ~14 segmentos | **17 segmentos** ✅ | padrão consolidado |
| Mapas status/prioridade locais | não medido | **~9 arq. cada** 🔺 | cada onda escolhe um vocabulário — mesmo mecanismo que fez hex regredir |
| Zod compartilhado | 0 | **0** ⚠️ | drift de validação cresce com nº de forms |
| Tipos do contrato | shared ✅ | shared ✅ | escala bem |

---

## 5. Top 3 ações priorizadas

1. **Unificar os mapas semânticos (A1 + M3):** `StatusBadge` em `projects-table`/`project-card`, `PriorityBadge` único em `components/ui/`, apagar os 7+ mapas locais. É a mesma jogada que zerou hex/modais: consertar a base antes que a próxima onda copie o padrão errado. (~1-2h)
2. **Registrar o tradeoff do token no client (A2):** um parágrafo no CLAUDE.md + comentário no `auth-provider.tsx`. Custo ~10min; evita que uma futura sessão "corrija" o httpOnly acreditando que ele protege, ou exponha dado sensível achando que o client é seguro.
3. **`schemas.ts` em `packages/shared` (M1):** começar pelos forms de projeto e oportunidade; importar no Nest via pipe. Fecha o último drift de contrato que resta.

> **Resolvido desde a 4ª passagem:** A1-hex (955→44, doc de tokens reescrito, `brand.*` substituído por tokens semânticos), M1-modais (17→1, `components/ui/` criado com 15 primitivos), A3-server-pages (21→0, `api-hooks` universal), A2-loading/error (5→17 segmentos), B1-skeleton (em uso nos `loading.tsx`), `wbs-client.tsx` migrado para a camada de dados.
> **Confirmação da tese da 4ª passagem:** tudo que ganhou base reutilizável **grudou e se espalhou sozinho**; o achado novo (A1) é o último lugar onde a base existe mas não é imposta.
