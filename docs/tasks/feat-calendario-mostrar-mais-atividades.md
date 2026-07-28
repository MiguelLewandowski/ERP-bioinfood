---
tipo: feature
escopo: web   # palpite
complexidade: baixa   # palpite
status: triagem
criada: 2026-07-28
tema: atividades
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Calendário: ver todas as atividades do dia sem precisar clicar (limite de 3)

## Anotação original
> CALENDÁRIO QUANDO TEM MAIS DE 3 ATIVIDADES PARA VER TUDO TEM QUE CLICAR PARA VER TODAS AS ATIVIDADES

## Alvo provável
`apps/web/app/(dashboard)/activities/_components/month-calendar.tsx` (corte por célula do dia) e `day-detail.tsx` (painel aberto ao clicar).

## O que precisa ser investigado
- Onde está o limite de 3 no `month-calendar.tsx` e se hoje há um indicador "+N" ou nada.
- Qual a solução desejada: célula com scroll interno, altura dinâmica da linha, hover/popover com a lista completa, ou uma visão semanal/lista. A anotação descreve o incômodo, não a solução — **perguntar**.
- Restrição real: mês com 6 linhas e células de altura fixa; deixar tudo visível pode quebrar o layout em telas menores.
- Relacionada a [[feat-melhoria-visual-atividades]] — decidir se as duas viram um redesenho único da tela de Atividades.
- Consultar `docs/design/design-tokens.md` antes de mexer em altura/densidade.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-calendario-mostrar-mais-atividades.md`.
