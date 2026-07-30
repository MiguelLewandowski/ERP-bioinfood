---
tipo: feature
escopo: web   # palpite
complexidade: alta   # palpite
status: triagem
criada: 2026-07-28
tema: gantt
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Gantt: tentar adicionar desfazer (Ctrl+Z)

## Anotação original
> TENTAR ADICIONAR CTRL + Z NO GANTT

## Alvo provável
`apps/web/app/(dashboard)/projects/[id]/gantt/_components/gantt-client.tsx` e `use-gantt-persistence.ts` (onde as alterações de data/dependência são gravadas).

## O que precisa ser investigado
- O "TENTAR" da anotação é literal: **checar primeiro se `@svar-ui/react-gantt` tem undo nativo**. Se não tiver, implementar histórico por fora é caro e arriscado.
- Escopo do desfazer: só mover/redimensionar barra? Também criar/excluir tarefa e dependência? Quantos passos de histórico?
- O Gantt persiste no servidor a cada alteração (`use-gantt-persistence.ts`) — desfazer precisa emitir a operação **inversa** na API, não só reverter o estado local. Concorrência: outro usuário pode ter mexido no meio.
- A memória do projeto registra o Gantt como **readonly** em algum momento — confirmar se hoje ele já é editável, senão a tarefa não faz sentido ainda.
- Alternativa mais barata que resolve a mesma dor: toast "Desfazer" logo após cada alteração (undo de uma ação, com janela de tempo). Avaliar antes de construir histórico completo.
- Irmã de [[feat-gantt-barra-horizontal-fixa]].

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-gantt-ctrl-z.md`.

---

> ❌ **Descartada em 2026-07-29.**
>
> O `undo` nativo da `@svar-ui/react-gantt` 2.7.1 foi ligado (config `undo`,
> ações `undo`/`redo`, atalho Ctrl+Z e botão na barra). **Não funcionou** no
> teste manual — a store não reverteu a alteração.
>
> Investigar por que exigiria entrar no comportamento interno da lib, e o dono do
> produto decidiu que **o Gantt não precisa de desfazer**: a alteração já é
> visível na hora e reversível arrastando de volta. Removido por completo em
> `e0b3b39` — nem o atalho nem o botão ficaram.
>
> Se um dia voltar a fazer sentido, a alternativa mais barata registrada na
> investigação original continua valendo: toast "Desfazer" com janela de tempo
> após cada alteração, em vez de histórico completo.
