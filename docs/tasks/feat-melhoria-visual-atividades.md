---
tipo: feature
escopo: web   # palpite
complexidade: média   # palpite
status: feito
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

---

## ✅ Resolvido em 2026-07-30

`/analisar-uiux` rodou **com renderização real** (app no ar, inspeção de tela, dados
conferidos contra a API). Diagnóstico completo:
[`docs/analise-uiux-atividades.md`](../analise-uiux-atividades.md).

**A análise achou dois defeitos de correção antes de qualquer questão estética** — e
nenhum trabalho visual os compensaria:

1. 🔴 **A visão Semana escondia o trabalho da semana.** O cabeçalho dizia "6 Total" e a
   lista mostrava **uma**. Quatro prazos que venciam naquela semana estavam invisíveis.
2. 🔴 **Todas as datas apareciam um dia antes, com hora inventada** ("01 de ago, 21:00"
   para uma atividade de 02/08). O incidente de `timezone-cronograma.md`, vivo na tela.

Os dois foram corrigidos e **verificados na tela renderizada**.

Melhoria visual entregue (a parte que a anotação pedia):

- **Prioridade virou visível** — era uma borda esquerda de 2px, indistinguível na
  densidade real. Alta, Crítica e atrasada ganham ponto sólido e título em negrito.
- **Os chips do resumo absorveram a legenda** que dizia a mesma coisa ao lado, e ficaram
  clicáveis: legenda e filtro no mesmo elemento.
- **Estado vazio** usa `EmptyState`, distinguindo "período livre" de "filtro escondeu
  tudo".
- **11 hex crus saíram** de `lib/activities.ts`. Não era higiene: `CRITICAL` era
  `#D64550`, que não é o token `destructive` — a mesma tarefa tinha um vermelho aqui e
  outro no Kanban.

### ⏸️ Em aberto — decisão de produto, não de execução

**A grade mensal lê como Gantt, não como calendário.** Quase toda barra atravessa a
semana inteira e a mesma tarefa se repete em cada linha de semana, então a pergunta que
um calendário existe para responder — "o que acontece na terça?" — não tem resposta.

Corrigir isso muda o *modelo mental* da tela: distinguir **marcador de prazo** (a data
acionável) de **período contínuo**. É achado A3 do relatório, e ficou de fora do Top 3
de propósito — vale conversar antes de mexer.
