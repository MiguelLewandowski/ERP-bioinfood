---
tipo: bug
escopo: api   # palpite
complexidade: baixa   # palpite
status: triagem
criada: 2026-07-28
tema: tarefas
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Nomes de ADMIN não aparecem nos selects de responsável (projeto, tarefa, risco)

## Anotação original
> NOMES DE ADMIN NAO TA PUXANDO NOS SELECTS DE RESPONSAVEL DO PROJETO E DE TAREFAS OU RISCO

## Alvo provável
`apps/api/src/modules/users/infra/users.controller.ts:33` — a listagem de usuários é **paginada com `limit ?? 20`**, e os selects consomem essa rota. Se houver mais de 20 usuários, ou se a ordenação deixar os ADMIN fora da primeira página, eles simplesmente não chegam ao front.

## O que precisa ser investigado
- Confirmar a hipótese da paginação: quantos usuários existem e qual a ordenação padrão em `ListUsersUseCase`.
- Hipótese alternativa: filtro por `role` no use case ou no front excluindo ADMIN de propósito (o comentário na linha 27 diz que a lista alimenta seletores de pessoa — checar se filtra).
- Terceira hipótese: usuários com `deletedAt` ou inativos sendo filtrados junto.
- Mapear **todos** os selects afetados: responsável de projeto, de tarefa (`task-form-dialog.tsx`, `quick-add.tsx`), de risco (`risks-client.tsx`), equipe do TAP.
- Se a causa for paginação, a correção provavelmente é um endpoint/parâmetro dedicado a seletor (lista enxuta e completa) em vez de aumentar o `limit` — decidir.
- É o bug de maior impacto do lote: bloqueia atribuição de trabalho no dia a dia.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/bug-admin-nao-aparece-nos-selects.md`.
