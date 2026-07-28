---
tipo: feature
escopo: web   # palpite
complexidade: alta   # palpite
status: triagem
criada: 2026-07-28
tema: projeto-tap
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Adicionar ordenação e hierarquia de texto nas caixas do TAP

## Anotação original
> Adicionar ordenação e hierarquia de texto nas caixas do TAP

## Alvo provável
Os campos narrativos do `Charter` (`problem`, `justification`, `assumptions`, `scope`, `deliverables`, `governance`, `dependencies` — `apps/api/prisma/schema.prisma:743-790`) são `String?` renderizados em textarea em `charter/_components/charter-client.tsx`.

## O que precisa ser investigado
- "Hierarquia de texto" = editor rico (negrito, títulos, listas aninhadas) ou só bullets/numeração simples? Muda completamente o tamanho da tarefa.
- "Ordenação" = reordenar itens **dentro** de uma caixa, ou reordenar as **caixas/seções** do TAP? A anotação é ambígua.
- Se for editor rico: formato de persistência (Markdown vs HTML vs JSON), sanitização contra XSS (`/seguranca`), e impacto na impressão do TAP.
- Depende da mesma decisão de editor da tarefa [[feat-modulo-anotacoes-pessoais]] — devem usar o mesmo componente.
- Provável candidata a `/planejar` em vez de tarefa direta.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-hierarquia-texto-tap.md`.
