---
tipo: bug
escopo: web   # palpite
complexidade: média   # palpite
status: triagem
criada: 2026-07-28
tema: tarefas
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Não deixa mudar tarefa de TODO para DONE ao salvar (kanban e edição)

## Anotação original
> BUG
> AO SALVAR EDIÇÃO NAO DEIXA MUDAR DE TODO PARA DONE. ARRUMAR ISSO NO KANBAN E NA EDIÇÃO DA TAREFA

## Alvo provável
Regra de transição de status entre `enum TaskStatus` (`apps/api/prisma/schema.prisma:43`) e os pontos de escrita: `projects/[id]/kanban/_components/kanban-client.tsx` e `projects/[id]/_components/tasks/task-form-dialog.tsx`.

## O que precisa ser investigado
- **Reproduzir primeiro**: falha silenciosa, erro visível, ou o status volta sozinho depois de salvar?
- Existe validação de máquina de estados no use case de update de task (proibindo pular estados intermediários, ex.: TODO → DOING → DONE)? Se existir, a regra é intencional e a pergunta vira "a regra deve cair?" — não presumir que é bug de código.
- Suspeita forte: `Task.actualStart`/`actualEnd` são preenchidos "na mudança de status" (comentário em `schema.prisma:857`) — se `actualEnd` exige `actualStart` e a tarefa nunca passou por DOING, o salvamento pode estar quebrando aí.
- Se o kanban e a edição falham pelo mesmo motivo, é um bug só; se forem causas diferentes, **dividir em dois docs**.
- Cobrir com teste de caso de uso na API (transição TODO → DONE direta).

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/bug-nao-salva-status-todo-para-done.md`.
