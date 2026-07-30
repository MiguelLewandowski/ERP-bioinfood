---
tipo: feature
escopo: api   # palpite
complexidade: alta   # palpite
status: feito
criada: 2026-07-28
tema: estoque
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Checklist de equipamentos no projeto + CRUD de equipamentos (módulo de estoque)

## Anotação original
> ADICIONAR CHECKLIST DE EQUIPAMENTOS EM PROJETO(tem que criar um crud de equipamentos em um novo modulo de controle de estoque)

## Alvo provável
Já existe **stub de estoque** no schema — `Product`, `PurchaseOrder`, `PurchaseOrderItem`, `StockMovement` e `enum StockMovementType` (`apps/api/prisma/schema.prisma:190` e `1064-1117`) — mas **não há módulo NestJS** correspondente em `apps/api/src/modules/` nem tela em `apps/web`.

## O que precisa ser investigado
- Equipamento é o mesmo `Product` do stub (com um campo de categoria) ou uma entidade separada? Equipamento é durável e alocável; insumo é consumível — a modelagem muda.
- O stub de `Product`/`StockMovement` deve ser aproveitado, reescrito ou ignorado? Decisão de arquitetura.
- "Checklist de equipamentos em projeto" = lista de equipamentos **necessários** ao projeto (planejamento) ou **reservados/alocados** (agenda de uso)? Se houver reserva, entra conflito de agenda.
- Onde a checklist aparece: aba nova do projeto, seção do TAP (Recursos), ou ambos.
- RBAC: quem cadastra equipamento (ADMIN? PADRAO?) e se CLIENTE enxerga.
- Tarefa irmã: [[feat-materiais-insumo-recursos-tap]] — provavelmente o mesmo módulo, planejar juntas.
- **Esta é grande demais para uma tarefa** — deve virar `/planejar`.

---

## ✅ Resolvido em 2026-07-30

Decisões do Miguel, que fecharam as perguntas em aberto:

| Pergunta | Decisão |
|---|---|
| Aproveitar o stub `Product`? | **Não.** Fica intocado |
| Entidade | `StockItem` + `StockCategory` (categoria é **dado**, cadastrável) |
| Categorias | Só **Equipamento** no seed; o resto se cadastra em `/estoque/config` |
| Onde a checklist vive | **Seção Recursos do TAP** — planejamento, sem reserva nem agenda |
| RBAC | Escrita `@Roles(PADRAO)`; categoria só ADMIN; CLIENTE não vê o módulo |

**Por que o stub ficou intocado:** `Product`/`PurchaseOrder`/`StockMovement` são compras e
movimentação — outro problema, sem módulo, sem tela e sem uma linha de dado. Reaproveitar
`Product` (consumível, com saldo) para equipamento durável distorceria os dois conceitos;
apagar seria migration destrutiva sem ganho.

**Por que sem reserva:** "checklist de equipamentos" virou *planejamento* (`checked` =
providenciado), não *alocação*. Sem janela de uso não há conflito de agenda entre
projetos — é o que manteve o módulo básico, como pedido.

Entregue: módulo `stock` na API (Clean Architecture, espelhando `pops`), migration
aditiva `20260730120000_stock_module`, telas `/estoque` e `/estoque/config`, e
`CharterEquipment` ligando o cadastro ao TAP.

Absorveu [[feat-materiais-insumo-recursos-tap]] — as duas eram a mesma coisa.
