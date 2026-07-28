---
tipo: feature
escopo: web   # palpite
complexidade: média   # palpite
status: triagem
criada: 2026-07-28
tema: atividades
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Melhoria visual da tela de Atividades

## Anotação original
> TRABALHAR EM MELHORIA VISUAL PARA TELA DE ATIVIDADES PARA FICAR O MAIS VISUAL POSSÍVEL

## Alvo provável
`apps/web/app/(dashboard)/activities/_components/` — `activities-client.tsx`, `month-calendar.tsx`, `activity-detail.tsx`, `day-detail.tsx`, `activities-filters.tsx`.

## O que precisa ser investigado
- **A anotação não define um resultado verificável.** "O mais visual possível" precisa virar critérios concretos antes de virar tarefa: cor por tipo de atividade (`enum ActivityType`, `schema.prisma:179`), densidade, ícones, estado vazio, distinção visual de atrasado/hoje/futuro.
- Rodar `/analisar-uiux` sobre a tela para gerar o diagnóstico, e só então recortar tarefas pequenas.
- Ler `docs/design/design-tokens.md` — sem hex cru (a reforma de UX zerou hex no projeto).
- Absorve ou não [[feat-calendario-mostrar-mais-atividades]]? Decidir para não fazer o mesmo componente duas vezes.
- Ver também `docs/analise-uiux.md`, que pode já ter apontado parte disso.
- **Candidata a `/planejar` ou `/analisar-uiux`, não a implementação direta.**

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-melhoria-visual-atividades.md`.
