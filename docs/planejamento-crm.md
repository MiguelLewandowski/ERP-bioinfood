# Planejamento de Implementação — Módulo CRM

> Plano de execução do escopo definido em `docs/modulo_CRM.md`.
> Papel deste documento: quebrar o módulo em fases e tarefas executáveis, com
> specialist, dependências, riscos e critérios de aceite. Atualizar conforme
> as fases forem entregues.
>
> **Status geral:** Fases 1, 2, 3 e 4 CONCLUÍDAS (Fase 4 em 2026-07-07).
> Fase 5 aguarda a planilha real do usuário.

---

## 1. Estado atual (o que JÁ existe)

### 1.1. Banco de dados (schema.prisma — completo para o CRM)

| Grupo | Models | Status |
|---|---|---|
| Dados mestres | `Organization`, `Address`, `PartyRole`, `CustomerProfile`, `SupplierProfile` | ✅ no banco |
| Pessoas | `Contact`, `ContactOrganizationLink` | ✅ no banco |
| Relacionamento | `Interaction`, `Activity` (CRM) | ✅ no banco |
| Funil | `Pipeline`, `PipelineStage` (com `StageType` OPEN/WON/LOST), `Opportunity` | ✅ no banco |
| Taxonomias | `Sector`, `OrganizationSource`, `EngagementStage` | ✅ no banco + seed |
| Identidade | `User.contactId` → `Contact`, `SystemRole.PORTAL` | ✅ no banco |

Migrations relevantes: `20260705144732_unify_crm_organizations` (núcleo) e
`20260705193754_crm_foundation_pipelines_taxonomies` (funil + taxonomias).

Seed atual: taxonomias padrão (5 setores, 5 origens, escada Lab→Piloto→Escala)
e pipeline "Comercial" (default) com 6 etapas tipadas.

### 1.2. Backend (NestJS)

- `modules/organizations`: `GET /organizations`, `GET /organizations/:id`,
  `POST /organizations`, `PATCH /organizations/:id` — Clean Architecture completa.
- **Não existe ainda:** módulos de contacts, interactions, crm-activities,
  pipelines, opportunities, taxonomies, enriquecimento CNPJ.

### 1.3. Frontend (Next.js)

- `/clientes` (lista) e `/clientes/[id]` (edição básica: razão social, fantasia,
  documento, status ACTIVE/ARCHIVED).
- `OrganizationSelect` (dropdown + cadastro rápido) usado em Projetos/Charter.
- **Não existe ainda:** ficha 360, contatos, timeline, kanban, taxonomias na UI.

---

## 2. Decisões registradas (não rediscutir sem motivo novo)

| # | Decisão | Racional |
|---|---|---|
| 1 | `Organization.status` = só `ACTIVE`/`ARCHIVED` (higiene de registro). Estágio comercial mora em `CustomerProfile.stage` (PROSPECT/ACTIVE/INACTIVE/VIP) | Elimina sobreposição de conceitos; cada campo tem um dono semântico |
| 2 | `segment`/`source` viraram FKs para `Sector`/`OrganizationSource` desde já | Texto livre vira dívida de reconciliação; custo zero antes de existirem dados |
| 3 | RBAC: **toda escrita do CRM** (configurar pipelines/etapas/taxonomias **e** operar orgs/contatos/oportunidades/interações/atividades) = `ADMIN`; **ler** = todos internos; `PORTAL` não acessa nada do CRM. *(Decisão do owner em 2026-07-05: escrita restrita a ADMIN, sobrepondo o rascunho original que incluía APROVA/INSERE.)* | O CRM é operado pelo owner (ADMIN, usuário único); trava a base de dados mestres |
| 4 | `EngagementStage` é escada **global** (não por pipeline) | YAGNI: sem caso de uso para escadas distintas; migrar depois é barato |
| 5 | Mover card de etapa **sobrescreve** `Opportunity.probability` com o default da `PipelineStage`; campo continua editável manualmente | É o que o Fluxo C do escopo descreve; regra mais simples |
| 6 | Enriquecimento CNPJ via **BrasilAPI** (`/api/cnpj/v1/{cnpj}`), **best-effort e nunca bloqueante** | Sem chave/auth; falha da API não pode impedir cadastro |
| 7 | Empresa estrangeira: `documentType = FOREIGN` ⇒ sem validação de CNPJ, sem consulta à BrasilAPI, `document` livre ou vazio; dedup cai para nome | Fluxo A do escopo; guardrail explícito para não travar cadastro internacional |
| 8 | Rótulo é dado, semântica é código: `PipelineStage.name` livre + `type` fixo (OPEN/WON/LOST) | Decisão central do §2.4 do escopo |

Regras derivadas da decisão 5/8 (comportamento do use-case de mover card):
- Ao entrar em etapa `WON` ou `LOST` ⇒ preencher `closedAt = now()`.
- Ao entrar em `LOST` ⇒ exigir/permitir `lostReason`.
- Ao voltar para etapa `OPEN` ⇒ limpar `closedAt` e `lostReason`.

---

## 3. Arquitetura — visão de fluxo

```
                        ┌────────────────────────────┐
                        │  /clientes (ficha 360)     │
                        │  abas: dados | contatos |  │
                        │  timeline | oportunidades  │
                        └─────┬──────────────────────┘
                              │
        ┌─────────────┬───────┴────────┬──────────────┬─────────────┐
        ▼             ▼                ▼              ▼             ▼
  organizations   contacts      interactions    crm-activities  opportunities
  (existente,     (novo)        (novo)          (novo)          (novo)
   expandir)                                                        │
        │                                                           ▼
        │  enriquecimento CNPJ (BrasilAPI)                    pipelines (novo)
        │  best-effort, só documentType=CNPJ                  stages tipadas
        │                                                     kanban drag-drop
        ▼
   taxonomies (novo: sectors, sources, engagement-stages — admin)
```

Padrão por módulo (obrigatório, já validado em `organizations`):
```
src/modules/<nome>/
├── domain/        entity + repository interface + token DI
├── application/   um use-case por arquivo (regra de negócio aqui)
└── infra/         controller + prisma.repository + mapper + dto/
```

---

## 4. Fases e tarefas

> Legenda specialist: **[BE]** backend · **[FE]** frontend · **[DB]** database
> · **[SEC]** security · **[ETL]** dados.
> Tarefas na mesma letra (A, B, ...) dentro de uma fase podem rodar em paralelo.

### ✅ Fase 1 — Fundação de dados (CONCLUÍDA)

Schema, migrations, seed de taxonomias e pipeline padrão, ajuste de
`OrganizationStatus` no shared/frontend. Ver §1.1.

---

### ✅ Fase 2 — Cadastro completo + ficha 360 (CONCLUÍDA)

**Objetivo:** abrir uma empresa e ver tudo; cadastrar em <15s com CNPJ.

Entregue: módulos `taxonomies` e `contacts`; `organizations` expandido (enrich
CNPJ via BrasilAPI best-effort, dedup por documento normalizado, papéis,
endereços, perfil de cliente); ficha 360 em abas (Dados/Contatos + placeholders
de Timeline/Oportunidades); dialog de criação com enriquecimento por CNPJ; UI de
taxonomias em `/clientes/config` (ADMIN). 17 testes novos (35 no total, verdes).

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| 2.A1 | Módulo `taxonomies`: CRUD de `Sector`, `OrganizationSource`, `EngagementStage` (list público interno; create/update/reorder/toggle `isActive` = ADMIN). Um controller com 3 recursos ou 3 controllers finos — decidir na implementação, manter simples | BE | — |
| 2.A2 | Módulo `contacts`: CRUD de `Contact` + endpoints de vínculo (`POST/PATCH/DELETE /contacts/:id/links` para `ContactOrganizationLink` com cargo/decisor/financeiro/técnico/principal) | BE | — |
| 2.B1 | Expandir `organizations`: incluir `sectorId`/`sourceId`/`registrationStatus`/`cnae`/`website`/`notes`/inscrições no detail + update; incluir `roles` (PartyRole) no detail; endpoint `POST /organizations/:id/roles` e `DELETE` (ADMIN/APROVA) | BE | 2.A1 |
| 2.B2 | Dedup na origem: no create, normalizar documento para dígitos e rejeitar duplicata (`409` com id do existente) quando `documentType != FOREIGN` | BE | — |
| 2.B3 | Enriquecimento CNPJ: use-case `enrich-organization` chamando BrasilAPI com timeout curto (~5s); endpoint `GET /organizations/enrich/:cnpj` que devolve os campos preenchíveis (razão social, fantasia, situação → `registrationStatus`, CNAE, endereço, UF/cidade). **Nunca** persiste sozinho — só devolve sugestão para o form. Se `FOREIGN` ou API falhar: `200` com `enriched: false` | BE | — |
| 2.B4 | Endereços: endpoints `POST/PATCH/DELETE /organizations/:id/addresses` (tipados: PRIMARY/BILLING/SHIPPING/COLLECTION) | BE | — |
| 2.C1 | `CustomerProfile`: upsert no detail da organização (`PATCH /organizations/:id/customer-profile` — stage, paymentTerms, creditLimit, salesRepId) | BE | 2.B1 |
| 2.D1 | Ficha 360 `/clientes/[id]`: refatorar para layout em abas — **Dados** (form atual + setor/origem/papéis/endereços/perfil comercial), **Contatos**, **Timeline** (placeholder até Fase 4), **Oportunidades** (placeholder até Fase 3) | FE | 2.B1 |
| 2.D2 | Form de cadastro com CNPJ: campo documento com máscara; ao completar 14 dígitos e `documentType=CNPJ`, chama enrich e pré-preenche (editável); botão "empresa estrangeira" troca para `FOREIGN` e libera tudo manual | FE | 2.B3 |
| 2.D3 | Tela de contatos: lista global `/contatos` (opcional nesta fase) + aba Contatos da ficha com vínculo (cargo, decisor/financeiro/técnico, principal) | FE | 2.A2 |
| 2.D4 | UI de taxonomias em `/settings` (ou `/clientes/config`): listas editáveis de setores/origens/escada, reordenação, toggle ativo — só visível para ADMIN | FE | 2.A1 |
| 2.E1 | Testes: dedup por documento (com e sem FOREIGN), RBAC dos endpoints novos, enrich com API mockada (sucesso/timeout/404) | SEC | 2.B1–2.B3 |

**Paralelismo:** 2.A1 ∥ 2.A2 ∥ 2.B2 ∥ 2.B3 ∥ 2.B4. Frontend (2.D*) começa
quando o respectivo backend estiver pronto.

**Critérios de aceite:**
- Colar um CNPJ válido preenche razão social/endereço/CNAE em <5s (ou libera manual sem erro).
- Cadastro duplicado por CNPJ é bloqueado com mensagem apontando o existente.
- Empresa estrangeira salva sem documento e sem chamada à BrasilAPI.
- Ficha 360 mostra dados, papéis, contatos vinculados (com marcadores) e taxonomias.
- CONSULTA lê tudo; INSERE edita; só ADMIN vê a UI de taxonomias.

---

### ✅ Fase 3 — Funil kanban configurável (CONCLUÍDA)

**Objetivo:** arrastar oportunidades entre colunas; funis e colunas configuráveis.

Entregue: módulos `pipelines` (CRUD + etapas com invariantes: isDefault único,
≥1 etapa OPEN, não deletar etapa com oportunidades) e `opportunities` (CRUD +
`move` com máquina de estado WON/LOST/reabrir e anti-IDOR de etapa/funil);
relatório `GET /pipelines/:id/summary` (em aberto, ponderado, conversão).
Frontend `/crm`: kanban drag-and-drop (`@dnd-kit`), cards, modal de oportunidade,
diálogo de motivo de perda, header de métricas e seletor de funil; config em
`/crm/config` (ADMIN). 10 testes novos (45 no total, verdes).

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| 3.A1 | Módulo `pipelines`: CRUD de `Pipeline` (ADMIN) + `PipelineStage` (create/rename/color/probability/reorder/toggle; ADMIN). Invariantes: não deletar etapa com oportunidades (só `isActive=false`); todo pipeline precisa de ≥1 etapa OPEN; `isDefault` único (setar um remove o anterior) | BE | — |
| 3.A2 | Módulo `opportunities`: CRUD + `PATCH /opportunities/:id/move` (stageId destino). Regras: probability ← default da etapa; WON/LOST ⇒ `closedAt`; LOST ⇒ `lostReason`; reabrir ⇒ limpa ambos. Validar que a etapa destino pertence ao pipeline da oportunidade (anti-IDOR de funil) | BE | 3.A1 |
| 3.B1 | Relatórios básicos: `GET /pipelines/:id/summary` (por etapa: contagem + soma de amount), conversão (WON ÷ fechados), valor ponderado (Σ amount × probability). Query direta com `take` — sem tabela nova | BE | 3.A2 |
| 3.C1 | Kanban `/crm` (ou `/funil`): colunas = etapas do pipeline selecionado; cards com título/org/valor/responsável; drag-and-drop com `@dnd-kit` (**já é dependência do projeto** — reusar o padrão do kanban de tarefas em `projects/[id]/kanban`) | FE | 3.A2 |
| 3.C2 | Modal de oportunidade: criar/editar (org, contato principal, valor, moeda, escada de engajamento, responsável, previsão de fechamento); ao soltar em LOST, pedir motivo | FE | 3.C1 |
| 3.C3 | Configuração de funil (ADMIN): criar pipeline, adicionar/renomear/reordenar colunas com type e cor — reusar padrões de drag da 3.C1 | FE | 3.A1 |
| 3.C4 | Header do kanban com números do 3.B1 (total em aberto, ponderado, conversão) + aba Oportunidades da ficha 360 | FE | 3.B1 |
| 3.D1 | Testes: máquina de estado do move (OPEN→WON→reaberto), unicidade do isDefault, etapa de outro pipeline rejeitada, RBAC (INSERE move, CONSULTA não) | SEC | 3.A2 |

**Paralelismo:** 3.A1 → 3.A2 é sequencial; 3.C3 pode começar junto com 3.C1.

**Critérios de aceite:**
- Fluxo C do escopo funciona literalmente (arrastar ajusta probabilidade; WON marca `closedAt` e conta na conversão).
- Fluxo D funciona sem deploy (novo pipeline com colunas nomeadas pelo usuário).
- Kanban abre já com o pipeline "Comercial" semeado.

---

### ✅ Fase 4 — Interações + atividades (CONCLUÍDA)

**Objetivo:** timeline viva e follow-ups com prazo.

Entregue: migration `20260707112046_crm_interaction_soft_delete` (Interaction
ganhou `updatedAt`/`deletedAt` — lacuna do schema identificada e corrigida
nesta fase, decisão do owner); módulos `interactions` (timeline por
organização, update/soft-delete restrito a autor-ou-ADMIN) e `crm-activities`
(rota `/crm/activities`, `completedAt` automático nas transições de status,
encadeamento via `interactionId`, filtros `due=today|overdue|week`); endpoint
`GET /organizations/stale?days=N` (SQL bruto, `MAX(interactionAt)` por
organização). Frontend: aba Timeline na ficha 360 (feed + registrar
interação com atalho para criar follow-up junto) e aba Pendências em `/crm`
(atrasadas/hoje + organizações esfriando). 15 testes novos (60 no total,
verdes).

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| 4.A1 | Módulo `interactions`: create/list por organização (filtro por contato/tipo/período, paginação por cursor ou take+skip), update/soft-delete do próprio autor ou ADMIN | BE | — |
| 4.A2 | Módulo `crm-activities`: CRUD de `Activity` (CRM) com status PENDING→IN_PROGRESS→DONE/CANCELLED, `completedAt` automático; criação encadeada a partir de interação (`interactionId`). **Atenção de rota:** já existe `GET /activities` (tarefas de projeto) — usar prefixo `/crm/activities` para não colidir | BE | — |
| 4.B1 | Lista "pendências": `GET /crm/activities?due=today|overdue|week&responsibleId=` | BE | 4.A2 |
| 4.B2 | Esfriamento: `GET /organizations/stale?days=N` — organizações sem interação há N dias (query por `max(interactionAt)`; índice `[orgId, interactionAt]` já existe) | BE | 4.A1 |
| 4.C1 | Timeline na ficha 360: feed cronológico com tipo/direção/resumo, expandir para `fullContent`; form rápido "registrar interação" com atalho "criar follow-up junto" (Fluxo B em uma tela) | FE | 4.A1, 4.A2 |
| 4.C2 | Painel de pendências (home do CRM ou aba em `/crm`): atividades de hoje/atrasadas + card de "clientes esfriando" | FE | 4.B1, 4.B2 |
| 4.D1 | Testes: encadeamento interação→atividade, transições de status, query de esfriamento, RBAC | SEC | 4.A1–4.B2 |

**Critérios de aceite:**
- Fluxo B do escopo em uma única tela (interação + follow-up com prazo).
- Abrir a ficha mostra onde a conversa parou (timeline ordenada, expandível).
- Lista de pendências mostra atrasadas primeiro; esfriamento configurável por dias.

---

### Fase 5 — ETL das planilhas (importação dos dados reais)

> Pode rodar depois da Fase 2 (não precisa esperar 3 e 4), mas oportunidades
> só importam completas com a Fase 3 no banco — o schema já está pronto, então
> o script pode gravar `Opportunity` mesmo antes da UI existir.

| # | Tarefa | Spec. | Depende de |
|---|---|---|---|
| 5.A1 | ✅ Planilha real obtida (`docs/Registro de Oportunidade de Negócios.xlsx`) e mapeada célula a célula em `docs/planilha-registro-oportunidades.md` (5 abas, colunas, dados reais, achados de qualidade, de-para inicial) — ler esse documento antes de escrever o script, evita reabrir a planilha | ETL | — |
| 5.A2 | Script `apps/api/prisma/import-crm.ts` (ts-node, mesmo padrão do seed) com **modo dry-run default**: parseia, normaliza, lista o que criaria/mesclaria e os conflitos; só grava com `--commit` | ETL | Fase 2 |
| 5.A3 | Normalizações do §6 do escopo: CNPJ→dígitos (repor zeros à esquerda: padStart(14)); estrangeiro→FOREIGN; remover `<br />` e HTML; "se houver"→vazio; dedup por documento e por nome normalizado | ETL | 5.A2 |
| 5.A4 | De-para: Empresas→`Organization`+`Address`+`PartyRole`+`CustomerProfile`; Pessoas→`Contact`+`ContactOrganizationLink`; Oportunidades→`Opportunity` no pipeline correspondente (criar pipelines das 4 linhas de negócio se ainda não existirem); semear taxonomias com valores distintos encontrados | ETL | 5.A3 |
| 5.A5 | Relatório de importação: criados/mesclados/pulados + lista de conciliações manuais pendentes (pessoas só com primeiro nome, orgs citadas e ausentes tipo FAPESP) | ETL | 5.A4 |

**Critérios de aceite:** dry-run legível antes de qualquer gravação; import
idempotente (rodar 2× não duplica); relatório final com pendências humanas.

---

### Fase 6 — IA e captura automática (futuro, fora deste plano)

Gatilho para planejar: volume real de interações acumulado (§5 do escopo).
Os ganchos já existem (`summary`, `fullContent`, `probability`, timeline indexada).
Não detalhar agora (YAGNI).

---

## 5. Matriz RBAC consolidada

| Recurso | CONSULTA | INSERE | APROVA | ADMIN | PORTAL |
|---|---|---|---|---|---|
| Organizações/contatos/endereços — ler | ✅ | ✅ | ✅ | ✅ | ❌ |
| Organizações/contatos — criar/editar | ❌ | ❌ | ❌ | ✅ | ❌ |
| Interações/atividades CRM — criar/editar | ❌ | ❌ | ❌ | ✅ | ❌ |
| Oportunidades — criar/editar/mover | ❌ | ❌ | ❌ | ✅ | ❌ |
| Pipelines/etapas — configurar | ❌ | ❌ | ❌ | ✅ | ❌ |
| Taxonomias — configurar | ❌ | ❌ | ❌ | ✅ | ❌ |
| Relatórios do funil — ler | ✅ | ✅ | ✅ | ✅ | ❌ |

Nota: toda **escrita** do CRM é `ADMIN` (decisão do owner, 2026-07-05).
Leitura permanece aberta a todos os papéis internos. ADMIN sempre passa no
RolesGuard (regra global do projeto).

---

## 6. Inventário de arquivos por fase (estimativa)

### Fase 2
```
apps/api/src/modules/taxonomies/**            (novo — domain/application/infra)
apps/api/src/modules/contacts/**              (novo)
apps/api/src/modules/organizations/**         (expandir: enrich, dedup, roles,
                                               addresses, customer-profile)
apps/api/src/app.module.ts                    (registrar módulos)
packages/shared/src/index.ts                  (ContactDto, TaxonomyDto, DTOs 360)
apps/web/app/(dashboard)/clientes/[id]/**     (refatorar em abas)
apps/web/app/(dashboard)/contatos/**          (novo, opcional)
apps/web/components/clientes/**               (form CNPJ, abas, vínculos)
apps/web/lib/api-hooks.ts                     (contactsApi, taxonomiesApi, enrich)
```

### Fase 3
```
apps/api/src/modules/pipelines/**             (novo)
apps/api/src/modules/opportunities/**         (novo)
apps/web/app/(dashboard)/crm/**               (kanban + config de funil)
apps/web/components/crm/**                    (cards, modal, colunas)
packages/shared/src/index.ts                  (PipelineDto, OpportunityDto...)
```

### Fase 4
```
apps/api/src/modules/interactions/**          (novo)
apps/api/src/modules/crm-activities/**        (novo — rota /crm/activities)
apps/web (ficha 360: aba timeline; painel de pendências)
```

### Fase 5
```
apps/api/prisma/import-crm.ts                 (script ETL com dry-run)
```

---

## 7. Riscos e perguntas em aberto

| Risco | Impacto | Mitigação |
|---|---|---|
| Colisão de rota `/activities` (projeto) × atividades CRM | Bug silencioso de roteamento | Prefixo `/crm/activities` (decidido, tarefa 4.A2) |
| BrasilAPI fora do ar / rate limit | Cadastro travado | Best-effort com timeout: falha ⇒ form manual (decisão 6) |
| CNPJ com zero à esquerda perdido (Excel) | Dedup falha e duplica empresa | `padStart(14, '0')` na normalização do ETL e do form |
| Dois conceitos "Atividades" na UI (tarefas de projeto × follow-ups CRM) | Confusão do usuário | Nomear "Follow-ups" ou "Pendências CRM" na interface; nunca "Atividades" seco fora do contexto de projeto |
| Enum `CustomerStage` ainda tem PROSPECT/ACTIVE/INACTIVE/VIP fixos | Gleidson pode querer renomear | Aceito por ora (conjunto fechado e semântico); se pedir, migrar para taxonomia |
| Reordenação de etapas com oportunidades em produção | Cards "pulam" de coluna visualmente | `order` é só apresentação; `stageId` do card não muda — cobrir com teste |
| Planilha real indisponível no repo | Fase 5 bloqueada | Tarefa 5.A1 explícita; decidir onde o arquivo mora com o usuário |

**Perguntas em aberto (responder antes da fase correspondente):**
1. (Fase 2) Contatos ganham tela própria `/contatos` ou vivem só dentro da ficha da organização? (Sugestão: só na ficha primeiro; tela global se sentir falta.)
2. (Fase 3) Rota do kanban: `/crm`, `/funil` ou `/oportunidades`? (Sugestão: `/crm` como hub com abas Funil/Pendências.)
3. (Fase 5) Onde versionar a planilha de origem (fora do git? pasta ignorada?).
4. (Fase 2) `POST /organizations` passa a incluir INSERE — confirmar com o usuário antes de afrouxar.

---

## 8. Complexidade e ordem de execução

| Fase | Complexidade | Estimativa relativa | Pré-requisito |
|---|---|---|---|
| 1 — Fundação | — | ✅ concluída | — |
| 2 — Cadastro + 360 | **Média** | a maior da lista (5 frentes de BE + 4 de FE) | nenhum |
| 3 — Kanban | **Média-alta** (drag-and-drop + máquina de estado) | ~igual à 2 no FE | nenhuma dependência da 2 no BE, mas a ficha 360 exibe oportunidades — entregar 2 antes |
| 4 — Timeline + follow-ups | **Baixa-média** | menor que 2 e 3 | ficha 360 (Fase 2) |
| 5 — ETL | **Média** (dados sujos) | um script, mas iterativo | Fase 2 no banco; planilha em mãos |

**Ordem recomendada: 2 → 3 → 5 → 4** (o ETL logo após o kanban permite ver os
dados reais no funil e valida o modelo com carga verdadeira antes de construir
a timeline).

**Regra de ouro do roadmap (do escopo): cada fase entrega valor sozinha; não
começar a próxima antes da anterior estar em uso.**
