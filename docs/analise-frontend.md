# Análise de Frontend — ERP Bioinfood

> **Data:** 2026-07-07 (3ª passagem, foco em `charter-client.tsx` / TAP)
> **Alvo:** `apps/web/app/(dashboard)/projects/[id]/charter/_components/charter-client.tsx`
> **Revisor:** Tech Lead Frontend (skill `/analisar-frontend`)
> **Estado:** CRM (organizations/contacts/pipelines/opportunities/interactions/crm-activities) implementado desde a 2ª passagem. `loading.tsx`/`error.tsx` agora existem em `clientes/*` e `crm/*` (A2 parcialmente resolvido — projeto/charter ainda sem).

## 3ª passagem — achados na tela do TAP

**C2 — Duplicação do formulário de projeto entre Charter e Settings**
`charter-client.tsx:377-483` embute um formulário completo de `Project` (nome/status/cliente/datas/objetivo/descrição) dentro da seção "Identificação" do TAP — os mesmos campos já existem, validados com Zod, em `settings/_components/project-settings-client.tsx:24-30`. O form embutido no Charter (`projectForm`, `charter-client.tsx:239`) não tem `zodResolver` — mesmo dado, duas superfícies, duas regras de validação (uma delas inexistente). O botão "Salvar" do TAP dispara até duas mutações (`PUT /charter` + `PATCH /projects/:id`) sem indicar ao usuário qual foi alterada.
**Status:** corrigido nesta sessão — bloco de edição removido do Charter, substituído por card resumo + link para Settings.

**C3 — Mensagem de Stakeholders desatualizada (falso limite)**
`charter-client.tsx:485-490` dizia que o CRM "ainda não está disponível" — mas o CRM foi implementado na sessão anterior. **Status:** corrigido — agora busca contatos reais do cliente do projeto via `contactsApi`.

**A4 — Sem indicador de progresso nas 8 seções do TAP**
Sidebar de navegação (`charter-client.tsx:304-319`) não mostra quais seções têm conteúdo. **Status:** corrigido — dot verde nas seções preenchidas.

**A5 — "Prioridade" é texto livre com placeholder de enum**
`charter-client.tsx:103` — placeholder "Alta / Média / Baixa" num `<input>` de texto livre. **Status:** corrigido — virou `<select>`.

**A6 — Aprovação de TAP sem confirmação nem data visível**
`charter-client.tsx:353-363` — sem `useConfirm()`; badge "Aprovado" não mostra `approvedAt`. **Status:** corrigido.

**A7 — `charter-client.tsx` fora do `api-hooks.ts`** (mesma raiz do C1 original, mas não fazia parte do escopo da 2ª passagem)
`charter-client.tsx:268,287` usavam `api.put`/`api.post` com path cru. **Status:** corrigido — `charterApi` adicionado a `api-hooks.ts`.

**Pendente (não resolvido nesta passagem, baixo esforço/baixo risco de deixar para depois):**
- Sem aviso de alterações não salvas ao sair da página.
- Campos "um por linha" (`specificObjectives`, `deliverables`) continuam texto opaco, sem virar lista estruturada.
- Rota `projects/[id]/charter` ainda sem `loading.tsx`/`error.tsx` (mesmo padrão do A2 original, ainda não estendido a todas as rotas de projeto).

---

# Passagens anteriores (histórico)

---

## 1. Resumo

A camada de **sessão/auth amadureceu muito** desde a 1ª passagem: renovação de token (middleware + interceptor 401 em `lib/api.ts`), `AuthProvider`/`useAuth` e tipos vindos de `@bioinfood/shared` — os 3 itens críticos anteriores estão **resolvidos**. O risco agora migrou para **duplicação da camada de dados** (existe um `lib/api-hooks.ts` tipado que **ninguém usa** enquanto cada página reimplementa seu próprio `fetch`) e para **drift de design** (334 hex hardcoded; os tokens `brand.*` do Tailwind estão mortos). Funciona bem hoje; a manutenção é que vai doer ao multiplicar módulos.

---

## 2. Pontos fortes (preservar)

- **Renovação de token completa**: `middleware.ts` (refresh proativo a 60s do `exp`) + `lib/api.ts` (retry em 401 + redirect). Resolve C1/A3 da 1ª passagem.
- **`AuthProvider` + `useAuth()`** elimina o prop drilling de token na maioria dos clients (A2 resolvido).
- **Tipos do contrato unificados**: `kanban/_components/types.ts` apenas reexporta `TaskDto`; `projects-client` usa `ProjectDto`. O `any` da 1ª passagem sumiu (A1 resolvido).
- Server Components fazem o fetch inicial; Client Components só interagem.
- Optimistic update **com rollback** no Kanban (`kanban-client.tsx:55-62`) — padrão correto.
- `checklistProgress` agora vem de `@bioinfood/shared` (lógica compartilhada com o back) — M3 parcialmente resolvido.

---

## 3. Achados por severidade

### 🔴 Crítico

**C1 — Camada de dados duplicada: `lib/api-hooks.ts` é código morto**
`apps/web/lib/api-hooks.ts` define `tasksApi`, `risksApi`, `projectsApi`, etc. **totalmente tipados** — mas `grep` confirma **zero importações** fora do próprio arquivo. Em paralelo:
- Cada server page reimplementa seu próprio fetch: `projects/page.tsx:5` (`getProjects`), `kanban/page.tsx:4` (`getTasks`), `gantt/page.tsx:5` (`fetchJson`)…
- Cada client chama `api.post`/`api.patch` com **path string cru**: `kanban-client.tsx:59`, `backlog-client.tsx:51`, `risks-client.tsx:55,67`, `charter-client.tsx:143,154`, `task-create-dialog.tsx:40`.

**Impacto (acoplamento/escala):** três fontes de verdade para "como chamo a API". A rota `/projects/:id/tasks` está escrita à mão em ~6 lugares; renomear um endpoint ou trocar um header obriga a caçar strings. O investimento já feito no `api-hooks.ts` está sendo desperdiçado.
**Correção:** adotar `api-hooks.ts` como **única** porta de dados. Server pages chamam `tasksApi.list(id, token)`; clients chamam `tasksApi.create/update/reorder`. Apagar os `getTasks`/`fetchJson` locais. Mover a duplicada `refreshTokens` do middleware para reuso se fizer sentido.

---

### 🟠 Alto

**A1 — 334 hex hardcoded em 24 arquivos; tokens `brand.*` do Tailwind mortos**
`tailwind.config.ts:46-54` define `brand.green (#147F23)`, `brand.orange`, etc. — e **nenhum componente os usa**. Em vez disso: `bg-[#147F23]` e, pior, `style={{ backgroundColor: '#147F23' }}` inline (`risks-client.tsx:92,114`, `charter-client.tsx:179,195,225`, `backlog-client.tsx:94,106`, `task-create-dialog.tsx:54`, `gantt-client.tsx` em vários pontos).
**Impacto (design/escala):** mudar a paleta = editar 334 ocorrências. `style={{}}` inline também impede `hover:`/`focus:` e variações de estado.
**Correção:** usar as classes `bg-brand-green`, `text-brand-green`, `hover:bg-brand-green-dark` (já mapeadas). Onde a cor é dinâmica (ex.: `scoreColor` em riscos), mapear para um nº pequeno de classes via lookup `Record<…, string>` em vez de hex inline. Banir `style={{ backgroundColor }}` no review.

**A2 — Sem `loading.tsx` nem `error.tsx` em nenhuma rota (0 arquivos)**
`glob` por `{loading,error}.tsx` retorna vazio. Some-se a isso que **todo server fetch engole erro** retornando `[]`/`null` (`kanban/page.tsx:9`, `projects/page.tsx:10`, `gantt/page.tsx:11`).
**Impacto (UX):** API fora do ar → tela renderiza "Nenhuma tarefa" (falso vazio), nunca um estado de erro; durante o fetch, nada de skeleton. O `project-skeleton.tsx` existe mas continua sem uso (B1 da 1ª passagem persiste).
**Correção:** `loading.tsx` (com `project-skeleton`) e `error.tsx` (com "Tentar novamente") por segmento de rota. Parar de engolir erro no fetch — deixar `throw` borbulhar para o `error.tsx`.

**A3 — Estado de servidor copiado para `useState` sem invalidação nos clients de módulo**
`kanban-client.tsx:36`, `backlog-client.tsx:36`, `risks-client.tsx:41`, `wbs-client.tsx`, `gantt` (memo sobre props) — todos fazem `useState(initialTasks)` e mutam **só a cópia local**. Nenhum chama `router.refresh()` após mutação (só `projects-client` e `settings` o fazem).
**Impacto (estado/consistência):** editar uma tarefa no Kanban não reflete no Gantt/Backlog sem reload manual; duas abas dessincronizam. O cálculo de "progresso" do Gantt fica obsoleto assim que o checklist muda em outra tela.
**Correção:** após cada mutação bem-sucedida, `router.refresh()` para re-executar o Server Component (mantendo o optimistic local apenas para latência). Alternativa maior (não obrigatória agora, YAGNI): React Query, mas só quando o nº de telas justificar.

---

### 🟡 Médio

**M1 — Optimistic update do Backlog não tem rollback**
`backlog-client.tsx:44-51` — `onDragEnd` faz `setTasks(reordered)` e `await api.patch(...reorder)` **sem `try/catch`**. Se o PATCH falhar, a ordem na tela fica mentindo em relação ao servidor (o Kanban faz certo no `:60-62`).
**Correção:** guardar a ordem anterior e restaurar no `catch`, igual ao Kanban.

**M2 — `gantt` destoa do padrão: token por prop + `fetchJson` próprio**
`gantt/page.tsx:35` passa `token` como prop e `gantt-client.tsx:146` o recebe — enquanto todos os outros clients usam `useAuth()`. O Gantt nem usa o token (só repassa). Reintroduz localmente o prop drilling que A2 eliminou.
**Correção:** remover a prop `token` do `GanttClient`; se precisar mutar, usar `useAuth()`. Trocar o `fetchJson` por `tasksApi`/`milestonesApi` (C1).

**M3 — Modais hand-rolled sem acessibilidade, com Radix disponível**
`project-dialog.tsx:52`, `task-create-dialog.tsx:62`, `risks-client.tsx:155` — `<div className="fixed inset-0">` sem focus trap, sem fechar no `Esc`, sem `role="dialog"`/`aria-modal`/`aria-labelledby`. Confirmação de exclusão em riscos é inline (ok), mas o Dialog em si não prende foco.
**Impacto (a11y/consistência):** navegação por teclado escapa do modal; leitores de tela não anunciam. E há 3 implementações divergentes do mesmo overlay.
**Correção:** um único `<Dialog>` baseado no Radix (`@radix-ui/react-dialog`, já no projeto) em `components/ui/` e reuso nos 3 lugares.

**M4 — Heurística de progresso do Gantt ainda no front**
`gantt-client.tsx:176-178` — quando não há checklist, infere progresso de `status` (DONE=100, IN_PROGRESS=50). É regra de negócio no client; se o back mudar a definição de "progresso", diverge silenciosamente do resto.
**Correção:** expor `progressPercentage` no `TaskDto` e consumir; manter no front só a renderização.

---

### 🔵 Baixo

**B1 — Schemas Zod duplicados por formulário, não compartilhados com o back**
Cada form redefine seu `schema` local (`project-dialog.tsx:13`, `risks-client.tsx:18`, `task-create-dialog.tsx:12`, `charter-client.tsx:15`). Regras (ex.: `max(200)`) podem divergir do `ValidationPipe` do NestJS.
**Correção:** exportar os schemas de `packages/shared` e importar nos dois lados. Baixa urgência enquanto as regras forem simples.

**B2 — `project-skeleton.tsx` continua órfão** (ver A2). Usar em `loading.tsx`.

**B3 — Sem paginação** em `projects`, `users`, `backlog` — irrelevante hoje, relevante a partir de ~200 registros.

---

## 4. Prontidão para escala (muitos módulos)

| Risco | Hoje | Ao multiplicar módulos |
|---|---|---|
| `api-hooks` ignorado + fetch ad-hoc | ~6 server fetch + ~10 calls cruas | dezenas de paths à mão, refactor de endpoint impossível |
| Hex hardcoded | 334 / 24 arquivos | paleta efetivamente imutável |
| Sem `loading`/`error.tsx` | 0 rotas cobertas | toda rota nova nasce com falso-vazio em erro |
| `useState(initial)` sem refresh | 5 clients | drift entre telas vira regra, não exceção |
| Modal hand-rolled | 3 cópias | N cópias divergentes, a11y inexistente |

---

## 5. Top 3 ações priorizadas

1. **Unificar a camada de dados em `lib/api-hooks.ts`** (C1) — adotar o que já existe e apagar os `getTasks`/`fetchJson`/calls cruas. Maior alívio de manutenção por menor esforço.
2. **Matar o hex hardcoded usando os tokens `brand.*`** (A1) — substituir `bg-[#hex]` e `style={{backgroundColor}}` pelas classes já mapeadas; banir hex no review.
3. **`loading.tsx` + `error.tsx` por rota e parar de engolir erros no fetch** (A2) — fecha o falso-vazio e dá UX de carregamento consistente para todo módulo novo.

> **Resolvido desde a 1ª passagem:** C1 (refresh de token), A3 (401 global), A2 (prop drilling via AuthProvider), A1 (`any` → DTOs do shared), M2-projects (router.refresh em `projects-client`), M3-parcial (`checklistProgress` compartilhado).
