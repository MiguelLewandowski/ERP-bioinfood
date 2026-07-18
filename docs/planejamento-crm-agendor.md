# Planejamento — CRM com paridade de UI/UX com o Agendor

> **Objetivo:** deixar o módulo CRM com aparência, linguagem e fluxos o mais próximos
> possível do **Agendor**, porque a equipe comercial vai migrar de lá para este sistema.
> A curva de aprendizado deve ser próxima de zero: mesmos conceitos (funil, negócio,
> empresa, pessoa, atividade), mesmos elementos visuais (ranking ★, farol de atividade,
> página do negócio), mesmos fluxos (perder com motivo, congelar, importar).
>
> **Relação com `docs/planejamento-crm.md`:** aquele doc registra as Fases 1–4
> (concluídas) e a Fase 5 (ETL da planilha). Este doc é a **continuação** — as fases
> daqui começam em **A** para não colidir com a numeração antiga. As decisões
> registradas lá (§2) **continuam valendo** — em especial a nº 3 (toda escrita do CRM
> = ADMIN) e a nº 8 (rótulo é dado, semântica é código).
>
> **Status:** planejamento — nada implementado. **Data:** 2026-07-17.

---

## 1. O que já existe (base para comparar com o Agendor)

| Área | Estado atual |
|---|---|
| Funil | `/crm` com kanban drag-and-drop (dnd-kit), múltiplos funis, etapas configuráveis (nome/cor/ordem/probabilidade/tipo OPEN-WON-LOST), métricas no topo (em aberto, ponderado, conversão, ganhos/perdidos) |
| Card do negócio | Título, empresa (link), valor, probabilidade %, responsável — **plano demais vs. Agendor** |
| Negócio | Só **dialog** de criação/edição — não existe página do negócio |
| Perda | Modal com motivo em **texto livre** (`lostReason: String`) |
| Empresas | `/clientes` (lista) + ficha 360 com abas Dados/Contatos/Timeline/Oportunidades; CNPJ autofill via BrasilAPI; taxonomias (setor/origem) em `/clientes/config` |
| Pessoas | Só dentro da ficha da empresa (aba Contatos) — sem tela global |
| Atividades CRM | `crm-activities` + aba Pendências (atrasadas/hoje/clientes esfriando) |
| Interações | Timeline por organização (tipo, direção, resumo, conteúdo) |
| Produtos | Não existe — `amount` do negócio é valor livre |
| Relatórios | Só as 4 métricas do topo do funil |
| Importação | Script ETL da planilha (Fase 5 antiga, aguarda execução) — sem UI |

---

## 2. Gap analysis — o que o Agendor tem e o ERP não

Levantado das telas/fluxos do Agendor (funil, tela do negócio, empresas, pessoas,
atividades, produtos, motivos de perda, relatórios, importação).

| # | Feature do Agendor | Status no ERP | Prioridade |
|---|---|---|---|
| G1 | **Card rico no funil**: ranking ★1–5 (editável no hover), farol de atividade (🔴 sem tarefa · 🟡 atrasada · 🟢 em dia), avatar do responsável, tempo na etapa | Card básico | **Alta** |
| G2 | **Página do negócio**: timeline de notas/atividades à esquerda (Nota, E-mail, Ligação, Proposta, Reunião, Visita), dados + contato + valor à direita, header com funil/etapa/status e ações Ganhar/Perder/Congelar | Só dialog | **Alta** |
| G3 | **Motivos de perda configuráveis** (dropdown no modal + comentário + data; alimenta relatório) | Texto livre | **Alta** |
| G4 | **Congelar negócio** (sai do funil sem perder; contagem separada no topo) | Não existe | Média |
| G5 | **Filtros e ordenação no funil** (responsável, status, ranking, período; "Ordenar" por coluna) | Não existe | **Alta** |
| G6 | **Visão em lista** de negócios (colunas configuráveis, edição inline de ranking/etapa, linha de totais) | Não existe | Média |
| G7 | **Tela global de Pessoas** com busca e vínculo à empresa | Parcial (só na ficha) | Média |
| G8 | **Produtos e serviços** (nome, categoria, preço, código) + itens no negócio → valor calculado | Não existe | Média |
| G9 | **Painel de vendas**: ganhos, valor vendido, ticket médio, ciclo médio, conversão, motivos de perda, receita por origem, ranking de vendedores, clientes negligenciados | Parcial (summary do funil) | Média |
| G10 | **Importação com UI** (upload → mapear colunas → prévia → desfazer) | Só script ETL | Baixa* |
| G11 | Campos obrigatórios por etapa | Não existe | Futuro (YAGNI) |
| G12 | Campos personalizados | Não existe | Futuro (YAGNI) |
| G13 | Telefone virtual, e-mail integrado, WhatsApp, mapa de clientes, sumário semanal por e-mail, app mobile | Não existe | Fora de escopo |

\* G10 é baixa **porque** a migração inicial já está coberta pelo script ETL da
planilha (Fase 5 do doc antigo). A UI de importação só se justifica se importar
virar rotina — ver pergunta em aberto nº 3.

---

## 3. Arquitetura (Architect)

### 3.1 Layout alvo do funil `/crm` (espelho do Agendor)

```
┌──────────────────────────────────────────────────────────────────────────┐
│ CRM   [Funil ▾]  [Filtros]  [Kanban|Lista]           [⚙ Funis] [+ Novo] │
│ ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌───────────────┐                  │
│ │Em aberto│ │Ponderado│ │Conversão │ │Congelados (n) │                  │
│ └─────────┘ └─────────┘ └──────────┘ └───────────────┘                  │
├───────────────┬───────────────┬───────────────┬─────────────────────────┤
│ Contato       │ Proposta      │ Negociação    │ ...                     │
│ 4 · R$ 120k   │ 2 · R$ 80k    │ 3 · R$ 310k   │  ← contagem + soma      │
│ [ordenar ▾]   │               │               │                         │
│ ┌───────────┐ │               │               │                         │
│ │★★★☆☆   🟢 │ │  farol: 🟢 tarefa em dia · 🟡 atrasada · 🔴 sem tarefa  │
│ │Projeto X  │ │                                                         │
│ │🏢 Acme    │ │                                                         │
│ │R$ 50.000  │ │                                                         │
│ │👤 ML · 12d│ │  ← responsável + dias na etapa                          │
│ └───────────┘ │                                                         │
└───────────────┴─────────────────────────────────────────────────────────┘
```

### 3.2 Layout alvo da página do negócio `/crm/negocios/[id]`

```
┌──────────────────────────────────────────────────────────────────────────┐
│ ‹ Funil   Projeto X — Acme Ltda      [Funil ▾][Etapa ▾]   ● Em andamento│
│           ★★★☆☆                      [Ganhar] [Perder] [⋯ congelar/excl]│
├────────────────────────────────────┬─────────────────────────────────────┤
│ HISTÓRICO                          │ Valor do negócio                    │
│ [Nota][E-mail][Ligação][Reunião]   │   R$ 50.000 · itens [editar]        │
│ [Proposta][Visita][+ Tarefa]       │ Dados do negócio                    │
│ ┌────────────────────────────────┐ │   responsável · criado em ·         │
│ │ escrever nota…        [Salvar] │ │   previsão de fechamento            │
│ └────────────────────────────────┘ │ Dados do contato                    │
│ ── timeline (recente primeiro) ──  │   pessoa principal · tel · whatsapp │
│ 🗒 Nota — ontem — Miguel           │ Empresa → /clientes/[id]            │
│ 📞 Ligação — 12/07 — follow-up     │ Tarefas pendentes (n)               │
│ ✅ Tarefa concluída — 10/07        │                                     │
└────────────────────────────────────┴─────────────────────────────────────┘
```

### 3.3 Mudanças de schema (resumo — cada fase gera migration própria via `/nova-migration`)

```prisma
model Opportunity {
  // NOVOS
  ranking        Int?           // 1..5 (validar 1..5 na aplicação)
  frozenAt       DateTime?      // null = ativo no funil
  stageEnteredAt DateTime @default(now()) // resetado a cada move → "dias na etapa"
  lostReasonId   String?        // FK; campo texto vira lostComment
  lostComment    String?
  items          OpportunityItem[]
}

model LossReason        { id, name @unique, isActive, order }   // padrão Sector
model ProductCategory   { id, name @unique, isActive, order }
model Product           { id, name, code?, price? Decimal, categoryId?, isActive }
model OpportunityItem   { id, opportunityId, productId, quantity, unitPrice /*snapshot*/, discount? }
```

Além disso (Fase B): `Interaction.opportunityId?` e `Activity.opportunityId?` —
hoje interações/atividades ligam só a org/contato; a página do negócio precisa
da timeline **do negócio**.

### 3.4 Decisões de arquitetura propostas

1. **Farol e "dias na etapa" calculados no backend, em uma query.** A listagem
   `GET /opportunities?pipelineId=` passa a devolver `daysInStage`,
   `activityStatus: 'NONE' | 'OVERDUE' | 'ON_TIME'` e `nextActivity` — agregado no
   repositório Prisma (sem N+1 no front).
2. **`amount` manual OU calculado por itens, nunca ambíguo:** se o negócio tem
   `items`, `amount` = soma (recalculada no backend a cada mudança de item) e o
   campo fica read-only na UI; sem itens, `amount` é livre. Regra de domínio com teste.
3. **Congelado sai de todas as agregações** do summary; ganha contador próprio.
4. **Motivo de perda:** manter `lostReason` legado no banco até migrar os dados,
   mas UI nova só grava `lostReasonId` + `lostComment`.
5. **Página do negócio é rota própria** (`/crm/negocios/[id]`), como no Agendor.
   O dialog atual vira "edição rápida" secundária (ou é aposentado na Fase B).

---

## 4. Fases e tarefas (Project Manager)

> Specialists: **[DB]** migration · **[BE]** NestJS · **[FE]** Next.js · **[SEC]** RBAC/validação · **[QA]** testes.
> Escrita do CRM continua **ADMIN-only** (decisão registrada — não rediscutir sem motivo novo).
> Antes de qualquer componente novo: ler `docs/design/design-tokens.md`.

### Fase A — Funil com cara de Agendor (complexidade: **média**)

Maior ganho de familiaridade por esforço; é a tela que a equipe vê o dia todo.

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| A1 | Migration: `ranking`, `frozenAt`, `stageEnteredAt`, `LossReason` + `lostReasonId`/`lostComment` em `Opportunity` (backfill: `stageEnteredAt = updatedAt`) | DB | — |
| A2 | BE: move atualiza `stageEnteredAt`; CRUD de `LossReason` no módulo de taxonomias; `ranking`/congelar-descongelar no update; filtro `frozen` na listagem | BE | A1 |
| A3 | BE: listagem enriquecida — `daysInStage`, `activityStatus`, `nextActivity` (uma query agregada) | BE | A1 |
| A4 | FE: card novo — estrelas clicáveis no hover, farol colorido, dias na etapa, avatar do responsável | FE | A3 |
| A5 | FE: modal de perda estilo Agendor — dropdown de motivo + data + comentário opcional | FE | A2 |
| A6 | FE: barra de filtros do funil (responsável, ranking, valor, período) + "ordenar" por coluna (alfabético, ranking, cadastro, atualização) | FE | A3 |
| A7 | FE: contador/lista de Congelados + ação congelar/descongelar no card e no dialog | FE | A2 |
| A8 | FE: aba "Motivos de perda" na config de taxonomias | FE | A2 |
| A9 | QA: testes — move reseta `stageEnteredAt`; congelado fora do summary; LossReason CRUD; RBAC | QA | A2–A3 |

Paralelo: A4–A8 entre si, após A2/A3.

### Fase B — Página do negócio (complexidade: **média-alta**)

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| B1 | Migration: `opportunityId?` em `Interaction` e `Activity` (+ índices) | DB | — |
| B2 | BE: `GET /opportunities/:id` completo (org, contato principal, responsável, timeline, tarefas pendentes) + endpoints de interação/atividade aceitando `opportunityId` | BE | B1 |
| B3 | BE: conferir paridade de `InteractionType` com o Agendor (NOTA, EMAIL, LIGACAO, PROPOSTA, REUNIAO, VISITA, WHATSAPP) — migration só se faltar valor | DB/BE | — |
| B4 | FE: página `/crm/negocios/[id]` — header (título, empresa, etapa navegável, status, ranking, Ganhar/Perder/Congelar/Excluir) | FE | B2 |
| B5 | FE: coluna esquerda — composer por tipo de atividade + timeline cronológica com ícones | FE | B2, B3 |
| B6 | FE: coluna direita — valor, dados do negócio, dados do contato (tel/whatsapp clicáveis), link para a ficha da empresa, tarefas pendentes | FE | B2 |
| B7 | FE: clique no card do kanban navega para a página (arrastar continua movendo) | FE | B4 |
| B8 | QA: Playwright do fluxo abrir negócio → registrar nota → ganhar/perder | QA | B4–B6 |

### Fase C — Listas: negócios em lista + Pessoas global (complexidade: **média**)

Duas trilhas independentes — podem intercalar.

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| C1 | BE: `/opportunities` com paginação, ordenação e filtros server-side (visão lista) | BE | Fase A |
| C2 | FE: toggle Kanban ⇄ Lista no `/crm` — tabela com colunas, edição inline de ranking e etapa, linha de totais (soma/média) | FE | C1 |
| C3 | BE: listagem global de contatos (busca por nome/e-mail/empresa) — hoje o módulo é acoplado à organização | BE | — |
| C4 | FE: página `/contatos` — lista, busca, criar/editar, coluna empresa com link | FE | C3 |
| C5 | QA: filtros/paginação + RBAC das rotas novas | QA | C1, C3 |

### Fase D — Produtos e serviços (complexidade: **média**)

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| D1 | Migration: `Product`, `ProductCategory`, `OpportunityItem` | DB | — |
| D2 | BE: módulo `products` (Clean Architecture; desativar em vez de excluir — histórico preservado) | BE | D1 |
| D3 | BE: itens do negócio com recálculo de `amount` (decisão 3.4.2) | BE | D2 |
| D4 | FE: página `/crm/produtos` — catálogo + categorias (padrão da tela de taxonomias) | FE | D2 |
| D5 | FE: seção "Valor do negócio" na página do negócio com editor de itens (produto, qtd, preço, desconto) | FE | D3, Fase B |
| D6 | QA: regra amount manual × calculado | QA | D3 |

### Fase E — Painel de vendas (complexidade: **média**)

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| E1 | BE: endpoint de métricas por período/funil/responsável — ganhos, valor vendido, ticket médio, ciclo médio (`createdAt→closedAt`), conversão, perdas por motivo, receita por origem, ranking de vendedores | BE | Fases A, C |
| E2 | FE: aba/página "Painel" no CRM — cards de KPI + gráficos (usar skill dataviz + design-tokens) | FE | E1 |
| E3 | FE: filtros do painel (período, funil, responsável) | FE | E2 |

> Depende de dados reais para fazer sentido → executar **depois** do ETL (Fase 5 do doc antigo).

### Fase F — Futuro explícito (NÃO fazer agora — YAGNI)

Campos obrigatórios por etapa · campos personalizados · UI de importação com desfazer ·
automações (tarefa automática ao mover etapa) · sumário semanal por e-mail ·
integrações (WhatsApp, e-mail, telefonia) · mapa de clientes. Registrado para não
virar escopo fantasma.

---

## 5. Ordem recomendada e paralelismo

```
Fase A (funil rico) ──► Fase B (página do negócio) ──► Fase D (produtos)
        │                                                   
        └──► Fase C (listas/pessoas) — trilha paralela à B  
                                                            
ETL (Fase 5 do doc antigo) ──► Fase E (painel, com dados reais)
```

- **ETL da planilha** (doc antigo) é independente das fases daqui e pode rodar a
  qualquer momento — quanto antes, melhor: valida o modelo com carga real.
- **Corte da migração:** com A + B entregues e ETL rodado, a equipe já opera o
  dia a dia sem o Agendor; C–E aumentam conforto, não bloqueiam o corte.
- Dev solo: "paralelo" = pode intercalar sem bloqueio, não simultâneo.

## 6. Riscos

| Risco | Mitigação |
|---|---|
| Card rico deixar o funil lento (N+1 de atividades) | Agregação em query única no repositório (A3); medir com seed grande |
| Congelado vazar nas métricas | Excluir `frozenAt != null` de todas as agregações + teste (A9) |
| `amount` manual × calculado inconsistente | Regra de domínio única (D3) + UI deixa explícito o modo |
| Dois conceitos de "Atividades" (projeto × CRM) confundirem na página do negócio | Manter nomenclatura já decidida no doc antigo ("Pendências"/follow-ups no CRM) |
| Usuários compararem cada detalhe com o Agendor | Validar cada fase com um usuário da equipe comercial antes de seguir para a próxima |
| Motivos de perda legados em texto livre | Migração dos valores distintos existentes para `LossReason` no script da A1/ETL |
| Escopo crescer (G11–G13) | Fase F é o registro explícito de "não agora" |

## 7. Perguntas em aberto (responder antes da fase correspondente)

1. **(Fase A)** Quais features do Agendor a equipe usa de fato hoje (plano contratado,
   telas mais acessadas)? Evita construir paridade com o que ninguém usava.
2. **(Fase D)** As vendas da Bioinfood têm produtos/serviços tabelados ou cada
   proposta é única? Se única, `OpportunityItem` pode virar "descrição + valor"
   sem catálogo — ou a Fase D inteira é adiada.
3. **(Fase F)** Importar dados será rotina (justifica UI de importação com desfazer)
   ou evento único de migração (script ETL basta)?
4. **(Fase E)** Quem consome o painel — só o owner (ADMIN) ou a diretoria (CONSULTA)?
   Define a matriz de leitura do endpoint de métricas.
5. **(Fase B)** Aposentar o dialog de edição quando a página do negócio existir,
   ou manter os dois? (Sugestão: manter dialog só para criação rápida.)

## 8. Resumo executivo

| Fase | Entrega | Complexidade | Valor p/ quem vem do Agendor |
|---|---|---|---|
| A | Funil idêntico ao Agendor: ranking ★, farol, dias na etapa, motivos de perda, filtros, congelar | Média | ★★★★★ |
| B | Página do negócio com timeline e composer de atividades | Média-alta | ★★★★★ |
| C | Visão lista + tela global de Pessoas | Média | ★★★★ |
| D | Produtos e serviços com valor calculado | Média | ★★★ |
| E | Painel de vendas (ticket médio, ciclo, motivos de perda, por vendedor) | Média | ★★★ |
| F | Futuro explícito (registro de não-escopo) | — | — |
