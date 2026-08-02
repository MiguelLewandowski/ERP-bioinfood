# Testes de Frontend — ERP Bioinfood

> **Data:** 2026-07-20 (1ª passagem) · **Alvo:** todos os formulários de `apps/web`
> **Autor:** QA (skill `/testes`) · **Branch:** `feat/crm-empresa-pessoa-negocio-tarefas`
> **Estado:** 209 testes em 18 arquivos, todos verdes. `tsc --noEmit` limpo, ESLint com 0 erros. A suíte da API (81 testes) segue passando.

---

## 1. Resumo

**O frontend não tinha nenhum teste.** O script `test` do `apps/web/package.json` apontava para `jest`, que nunca esteve nas dependências — rodar `pnpm test` no workspace web falhava. Esta passagem montou a infraestrutura (vitest + jsdom + Testing Library) e cobriu **14 formulários** com 209 testes.

A ordem de cobertura seguiu a regra da skill: **auth primeiro, depois operações que alteram dados, depois regra de negócio.** RBAC entrou como cidadão de primeira classe — não só "renderiza", mas *quem vê o quê*.

Escrever os testes expôs **3 defeitos reais** que estavam em produção silenciosamente. Dois foram corrigidos nesta sessão; o terceiro está documentado abaixo e aguarda decisão.

---

## 2. Infraestrutura criada

| Arquivo | Papel |
|---|---|
| `apps/web/vitest.config.ts` | jsdom + `@vitejs/plugin-react` + alias `@/` |
| `apps/web/vitest.setup.ts` | `jest-dom`, `cleanup` por teste e os stubs de jsdom que os dialogs do Radix exigem (`hasPointerCapture`, `ResizeObserver`, `matchMedia`) |
| `apps/web/lib/test-utils.tsx` | `renderWithProviders` — renderiza com `AuthProvider` e `ConfirmProvider` **reais** |

**Decisão consciente:** o helper usa os providers de verdade em vez de mockar `useAuth`/`useConfirm`. Isso faz o fluxo de confirmação de exclusão ser exercitado de ponta a ponta (abrir → confirmar/cancelar → chamar ou não a API), que é exatamente o comportamento que mais importa nas ações destrutivas. Mockar o hook teria testado o mock.

Padrão dos testes: **Arrange → Act → Assert**, nomes `should X when Y`, tudo em inglês (regra do projeto). A API é sempre mockada via `vi.mock('@/lib/api-hooks')` ou `vi.mock('@/lib/api')`.

```bash
pnpm --filter @bioinfood/web test        # roda a suíte
pnpm --filter @bioinfood/web test:watch  # modo watch
```

---

## 3. Cobertura por formulário

### Auth e autorização (prioridade 1)

| Arquivo | Testes | O que garante |
|---|---:|---|
| `components/auth/login-form` | 11 | Regras de senha, redirect por `mustChangePassword`, erro do servidor e de rede, botão travado em voo |
| `components/auth/change-password-form` | 10 | Confirmação que precisa coincidir, e o payload que **nunca** envia o `confirmPassword` |
| `components/users/user-dialog` | 13 | Papel padrão `CONSULTA`, e-mail imutável na edição, recarga dos campos ao trocar de usuário |
| `components/users/reset-password-dialog` | 7 | Senha mínima, confirmação, aviso de encerramento de sessões |

### CRM (prioridade 2)

| Arquivo | Testes | O que garante |
|---|---:|---|
| `crm/_components/opportunity-dialog` | 16 | Moeda mascarada → número, congelar/reativar, exclusão só após confirmar |
| `crm/_components/pessoa-dialog` | 15 | Vínculo obrigatório com empresa na criação, cargo atualizado só quando muda |
| `crm/_components/task-dialog` | 14 | Todos os 6 campos que a API aceita, exclusão só após confirmar |
| `components/clientes/cliente-dialog` | 16 | **Regra de CNPJ obrigatório salvo empresa estrangeira**, máscara, enriquecimento por CNPJ, follow-ups best-effort |
| `crm/empresas/[id]/contatos-tab` | 9 | Marcadores de relacionamento indo no **vínculo**, não no contato |
| `crm/_components/opportunity-timeline` *(dívida)* | 0 | Timeline migrou de empresa p/ negócio (2026-08-01); os 9 testes antigos de `timeline-tab` foram removidos junto do arquivo e ainda não têm equivalente no componente novo |

### Projetos (prioridade 2 e 3)

| Arquivo | Testes | O que garante |
|---|---:|---|
| `projects/[id]/_components/tasks/task-form-dialog` | 20 | As duas regras de cronograma, `status` só enviado na edição, data+hora combinadas num timestamp |
| `projects/[id]/settings/project-settings-client` | 12 | Regra de data de término, submit travado enquanto o form não está sujo, **zona de perigo só para ADMIN** |
| `projects/[id]/stakeholders/stakeholders-client` | 11 | **RBAC de escrita (INSERE+) e exclusão (APROVA+)**, contato travado na edição |
| `projects/[id]/risks/risks-client` | 10 | Níveis padrão, confirmação inline antes de excluir |
| `projects/[id]/roadmap/roadmap-client` | 9 | Ordenação por data + **2 testes de regressão de fuso horário** |
| `components/projects/project-dialog` | 10 | Data de fim não pode anteceder a de início |
| `app/(dashboard)/pops/pops-client` | 6 | Título obrigatório e limite de 200 caracteres |
| `components/layout/quick-add` | 11 | **RBAC do menu inteiro**, projetos encerrados fora da lista |

**Total: 209 testes / 18 arquivos.**

---

## 4. Bugs reais encontrados pelos testes

### 🔴 B1 — Labels não associados aos campos *(corrigido)*

`<label>` sem `htmlFor` e `<input>` sem `id` em **~37 campos de 8 componentes**, incluindo os dois formulários mais críticos do app: login e troca de senha. Leitor de tela anunciava campo sem nome.

Descoberto no primeiro teste escrito — `getByLabelText('E-mail')` não encontrou nada. A query é a recomendada justamente porque testa a associação acessível.

**Correção:** `htmlFor`/`id` nos campos com label visível; `aria-label` nos selects de `timeline-tab` e `contatos-tab`, que só tinham `placeholder` (zero mudança visual). Commits `dc1c22f` e seguintes.

> Os wrappers do tipo `<label><input type="checkbox" /> Texto</label>` **não** eram bug — associação implícita funciona ali.

### 🔴 B2 — Data dos marcos aparecia um dia antes *(corrigido)*

`new Date('2026-10-01')` é interpretado como **meia-noite UTC**; renderizado em `America/Sao_Paulo` (UTC−3) vira **30/09**. Todo marco do roadmap aparecia um dia adiantado — na timeline, no tooltip e na lista.

Evidência veio do próprio output de falha, que mostrava `title="Entrega da fase 2 — 30/09/2026"` para um marco de `2026-10-01`. Confirmado fora do teste:

```
new Date("2026-10-01")            -> 30/09/2026
new Date("2026-10-01T00:00:00")   -> 01/10/2026
```

**Correção:** `apps/web/lib/dates.ts` com `parseCalendarDate()`, aplicado nos 5 pontos de `roadmap-client.tsx`. Dois testes de regressão cobrem tanto `'2026-09-01'` quanto `'2026-09-01T00:00:00.000Z'`. Commit `8731808`.

> **Campo de dia é dia de calendário, não instante.** Qualquer tela nova que formate `date`/`dueDate`/`startDate` deve passar por `parseCalendarDate`. O sweep completo nas demais telas **não** foi feito — ver §6.

### 🟡 B3 — Story points sem mensagem de erro inline *(não corrigido — decisão pendente)*

`task-form-dialog.tsx` renderiza erro inline em todos os campos **menos** Story Points. As mensagens do zod (`'Mínimo 1'` / `'Máximo 100'`) são inalcançáveis: não existe bloco `{errors.storyPoints && ...}` no JSX.

**Não há risco de dado inválido** — o `min={1} max={100}` nativo do `type="number"` bloqueia o envio. É inconsistência de UX: o usuário recebe o tooltip nativo do browser em vez da mensagem no padrão do resto do form.

O teste documenta o comportamento **real** (`validity.rangeOverflow`/`rangeUnderflow` + requisição não sai), não o desejado. Corrigir é decisão de produto.

---

## 5. Onde a premissa do teste estava errada (e não o código)

Três vezes um teste falhou e a causa era a minha premissa, não um defeito. Registrado aqui porque a fronteira entre "ajustar teste honestamente" e "enfraquecer teste para passar verde" é fina — em nenhum destes a regra deixou de ser verificada.

| Caso | O que eu assumi | O que acontece de verdade |
|---|---|---|
| E-mail malformado no login | zod mostraria `'E-mail inválido'` | `type="email"` faz o browser **bloquear o submit** antes do react-hook-form rodar. Confirmado com probe: `checkValidity() === false`, `typeMismatch === true`. O teste passou a afirmar a garantia real — *a requisição não sai* |
| Título do marco / botão "Nova POP" | Elemento único na tela | Título de marco renderiza **duas vezes** (tooltip da timeline + lista); "Nova POP" existe no header **e** no empty state. Ambos legítimos — query ambígua era minha |
| Fixtures de `PopDto` e `ContactListItemDto` | `latestVersion` sem `createdBy`; `link.id` | O contrato exige `createdBy` (não opcional) e a chave é `link.linkId`. Fixtures corrigidas contra os DTOs de `@bioinfood/shared` |

**Lição para as próximas passagens:** quando um teste de formulário falha por "mensagem não aparece", checar primeiro se validação nativa do HTML está bloqueando o submit. `type="email"`, `type="number"` com `min`/`max`, e `required` fazem o zod nunca rodar.

---

## 6. O que ficou de fora

| Item | Motivo |
|---|---|
| `charter-client.tsx` (TAP) | Formulário grande, priorizei os críticos |
| `dados-tab.tsx` (633 linhas) | idem |
| `wbs-client.tsx` | idem |
| Form inline de versão em `pop-row.tsx` | idem |
| **Labels desses 4 componentes** | A dívida de acessibilidade do B1 **continua** neles |
| Sweep de `parseCalendarDate` fora do roadmap | Outras telas que formatam campo de dia podem ter o mesmo off-by-one do B2 |
| Testes E2E (Playwright) | Não instalado no projeto; a skill prevê para login / criação de projeto / aprovação |

Também **não** rodei a aplicação — a verificação foi suíte de testes, `tsc --noEmit` e ESLint.

---

## 7. Ações sugeridas para a próxima passagem

1. **Fechar o B1 nos 4 componentes restantes** — mecânico, mesma correção já aplicada em 8 arquivos.
2. **Auditar o B2 no resto do app** — `grep` por `new Date(` sobre campo de dia; trocar por `parseCalendarDate`.
3. **Decidir o B3** — adicionar o `<p>` de erro em Story Points para uniformizar, ou assumir a validação nativa como suficiente.
4. **Cobrir os 4 formulários restantes**, na ordem: charter → dados-tab → wbs → pop-row.
5. **Playwright para o happy path de login**, único fluxo que atravessa middleware + cookie + refresh e que teste de componente não alcança.
