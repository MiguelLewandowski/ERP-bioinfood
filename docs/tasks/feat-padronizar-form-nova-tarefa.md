---
tipo: feature
escopo: web   # palpite
complexidade: baixa   # palpite
status: triagem
criada: 2026-07-28
tema: tarefas
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Padronizar o formulário de nova tarefa do "Novo" global com o do Backlog

## Anotação original
> PADRONIZAR FORMULARIO DE CRIAR TAREFA NA TELA GLOBAL EM NOVO NO CABEÇA~LHO DO LAYOUT DE TAREFA PARA SER IGUAL O QUE ABRE EM BACKLOG

## Alvo provável
`apps/web/components/layout/quick-add.tsx` (botão "Novo" do cabeçalho) versus `apps/web/app/(dashboard)/projects/[id]/_components/tasks/task-form-dialog.tsx` (usado pelo backlog).

## O que precisa ser investigado
- Confirmar que o "Novo" do cabeçalho é o `quick-add.tsx` e que o backlog usa o `task-form-dialog.tsx`.
- Diferenças exatas entre os dois formulários (campos, validação zod, defaults, comportamento pós-criação).
- O `quick-add` global precisa de um campo **projeto** que o do backlog não tem (lá o projeto vem da rota) — a padronização não pode remover isso.
- Caminho preferido: o global passar a **reusar** o `task-form-dialog` com o projeto como prop opcional, em vez de duplicar campos. Confirmar viabilidade.
- Há também o `crm/_components/task-dialog.tsx` — é outro form de tarefa (CRM, ligado a oportunidade)? Confirmar se entra no escopo ou não.
- Existem testes em `quick-add.test.tsx` e `task-form-dialog.test.tsx` que precisam continuar verdes.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-padronizar-form-nova-tarefa.md`.
