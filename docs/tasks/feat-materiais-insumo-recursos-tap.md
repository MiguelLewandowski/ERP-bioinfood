---
tipo: feature
escopo: api   # palpite
complexidade: média   # palpite
status: feito
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

---

## ✅ Resolvido em 2026-07-30 — junto com a tarefa irmã

A pergunta em aberto era "texto livre no TAP ou catálogo do estoque?". **Decisão do
Miguel: catálogo.** Com isso esta tarefa e [[feat-checklist-equipamentos-projeto]]
viraram uma coisa só — a intuição das duas estava certa.

A seção **Recursos e Orçamento** do TAP passou a ter:

- **Checklist puxada do cadastro de estoque**, agrupada por categoria, com checkbox de
  "providenciado" (`CharterEquipment`). Hoje mostra equipamentos porque só a categoria
  "Equipamento" existe no seed; cadastrar "Insumo" ou "Vidraria" em `/estoque/config` as
  faz aparecer sozinhas, **sem tocar em código**.
- O antigo textarea "Infraestrutura" renomeado para **"Observações de infraestrutura"**,
  agora com editor rico — para o que não é item de catálogo (laboratório de terceiro,
  sala alugada) e para preservar o que já tinha sido escrito ali.

**Custo estimado por insumo ficou de fora.** A anotação não pedia, e somar custo de item
no `Charter.budget` (hoje um `Decimal` único) é decisão de orçamento, não de cadastro.
Se for desejado, é tarefa nova.

O `filledCount` do menu lateral do TAP passou a contar a checklist — senão a bolinha da
seção ficava cinza com a lista inteira montada. A exportação em PDF lista os itens com o
estado de cada um.
