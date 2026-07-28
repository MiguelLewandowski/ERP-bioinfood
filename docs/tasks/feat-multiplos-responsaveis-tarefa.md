---
tipo: feature
escopo: db   # palpite
complexidade: alta   # palpite
status: triagem
criada: 2026-07-28
tema: tarefas
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Permitir mais de um responsável por tarefa

## Anotação original
> RESPONSAVEL DE TAREFAS PODE TER MAIS DE UMA PESSOA

## Alvo provável
`Task.assigneeId` é FK única para `User` (`apps/api/prisma/schema.prisma:843` e `865`), com índice em `assigneeId` (877). Vira relação N:N — provável modelo `TaskAssignee`, no padrão de `CharterTeamMember` (803).

## O que precisa ser investigado
- Migration N:N preservando os `assigneeId` atuais (backfill obrigatório, sem perder dado).
- **Todo o consumo de `assignee` singular** muda: kanban (`kanban-card.tsx`), backlog (`backlog-row.tsx`), Gantt (`gantt-mapping.ts`), tela de Atividades, filtros "minhas tarefas", dashboard.
- Há "responsável principal" ou todos são iguais? Isso decide se `assigneeId` some ou vira `ownerId` + lista.
- Como o avatar/nome aparece na UI quando são 3+ pessoas (empilhado, "+2").
- Contrato da API muda (campo `assigneeId` → `assigneeIds`) — quebra clientes existentes; conferir `packages/shared`.
- Irmã de [[feat-multiplos-responsaveis-risco]] — mesma decisão de modelagem, fazer juntas.
- **Grande demais para uma tarefa** — provável `/planejar`.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-multiplos-responsaveis-tarefa.md`.
