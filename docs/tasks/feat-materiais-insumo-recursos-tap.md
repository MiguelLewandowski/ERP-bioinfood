---
tipo: feature
escopo: api   # palpite
complexidade: média   # palpite
status: triagem
criada: 2026-07-28
tema: estoque
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Adicionar materiais de insumo em Recursos e Orçamento

## Anotação original
> RECURSOS E ORÇAMENTOS ADICIONAR MATERIAS DE INSUMO

## Alvo provável
Seção 6 do TAP — `Charter.infrastructure` / `Charter.budget` / `CharterTeamMember` (`apps/api/prisma/schema.prisma:775-780` e `803`), renderizada em `charter/_components/charter-client.tsx`.

## O que precisa ser investigado
- Insumo é lista de texto livre no TAP, ou vem do catálogo do módulo de estoque (`Product`)? Se vier do catálogo, esta tarefa **depende** de [[feat-checklist-equipamentos-projeto]].
- Cada insumo tem quantidade, unidade e custo estimado? Se tiver custo, ele soma no `Charter.budget` (que hoje é um `Decimal` único) ou é paralelo?
- Segue o padrão de `CharterTeamMember` (tabela filha com join real) — provável modelo `CharterMaterial`.
- Impacto na impressão/exportação do TAP.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-materiais-insumo-recursos-tap.md`.
