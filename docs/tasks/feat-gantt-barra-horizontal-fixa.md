---
tipo: feature
escopo: web   # palpite
complexidade: baixa   # palpite
status: triagem
criada: 2026-07-28
tema: gantt
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Gantt: manter a barra de rolagem horizontal sempre visível

## Anotação original
> DEIXAR A BARRA HORIZONTAL DO GANTT SEMPRE APARECENDO, POIS ATUALMENTE TEM QUE SE SCROLLAR PARA BAIXO PARA VER ELA

## Alvo provável
`apps/web/app/(dashboard)/projects/[id]/gantt/_components/gantt-client.tsx` + `gantt-status.css`. O Gantt usa `@svar-ui/react-gantt` (ver memória do projeto), então a rolagem é do componente da lib, não do container.

## O que precisa ser investigado
- A barra horizontal é do container externo ou interna ao componente SVAR? Isso decide se é CSS nosso ou configuração/limitação da lib.
- Solução provável: dar altura máxima ao wrapper do Gantt (`max-height` + `overflow`) para que a barra fique presa na base da viewport em vez de no fim do conteúdo.
- Verificar se a lib expõe opção de scrollbar fixa antes de gambiarrar CSS por cima do componente de terceiro.
- Testar com projeto de muitas tarefas (a dor só aparece com lista longa) e em telas menores.
- Irmã de [[feat-gantt-ctrl-z]] — mesma tela, aproveitar o contexto.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-gantt-barra-horizontal-fixa.md`.
