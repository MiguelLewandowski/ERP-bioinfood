---
tipo: feature
escopo: db   # palpite
complexidade: média   # palpite
status: triagem
criada: 2026-07-28
tema: riscos
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Permitir mais de um responsável por risco

## Anotação original
> RESPON´SAVEL DE RISCO PODE SER MAIS DE UM

## Alvo provável
`Risk.ownerId` é FK única e opcional para `User` (`apps/api/prisma/schema.prisma:915` e `925`); a tela é `projects/[id]/risks/_components/risks-client.tsx`.

## O que precisa ser investigado
- Mesma decisão de modelagem de [[feat-multiplos-responsaveis-tarefa]] — o padrão escolhido lá deve valer aqui (provável `RiskOwner` N:N nos moldes de `CharterTeamMember`).
- Backfill dos `ownerId` já preenchidos.
- Consumidores de `owner` singular: `risks-client.tsx`, `risk-heatmap.tsx`, a futura seção de riscos do TAP ([[feat-secao-riscos-no-tap]]).
- Testes existentes em `risks-client.test.tsx`.
- Escopo bem menor que o de tarefas (o risco tem menos telas) — pode ser feita primeiro como piloto do padrão.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-multiplos-responsaveis-risco.md`.
