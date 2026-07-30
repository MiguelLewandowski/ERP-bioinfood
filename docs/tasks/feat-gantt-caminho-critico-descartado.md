---
tipo: feature
escopo: web
complexidade: alta
status: descartada
criada: 2026-07-29
concluida: 2026-07-29
tema: cronograma
---

# Caminho crítico no Gantt — DESCARTADO

## O que era

Destacar no Gantt a sequência de atividades encadeadas por dependência que
determina a data de término do projeto. Atrasar uma delas atrasa o projeto
inteiro; atrasar uma tarefa fora dela, não.

Foi implementado como toggle na Onda 6, aproveitando que a
`@svar-ui/react-gantt` já traz o cálculo (`criticalPath={{ type: 'flexible' }}`).

## Por que saiu

**Nunca destacou nada na tela.** Testado em projeto com muitas dependências
cadastradas, o toggle não produzia diferença visível.

Três hipóteses foram investigadas e descartadas:

1. *"Falta dependência entre tarefas."* Não era — o projeto de teste tinha várias.
2. *"O seletor CSS está errado."* Estava (`.wx-critical-task` inferido, quando a
   classe real é `.wx-critical`), mas corrigir não resolveu.
3. *"As cores de status com `!important` pintam por cima."* Também errado, e por um
   motivo que só apareceu ao ler o bundle da lib: **as cores de status nunca se
   aplicaram**. O `css` que passamos por tarefa não chega ao elemento da barra —
   a classe dela é montada como `` `wx-bar wx-${tipo}` `` mais modificadores, e
   nada mais (`index.es.js:2129`). Não havia nada pintando por cima porque não
   havia nada pintando.

Sobrou a possibilidade de a lib não estar marcando `.wx-critical` nas barras, o
que exigiria rastrear a função `C(r)` do bundle minificado. **Custo alto,
benefício incerto**: as tarefas da Bioinfood são mais paralelas que sequenciais,
e o dono do produto decidiu que a tela não precisa disso.

## Decisão

Removido em 2026-07-29: o botão, o estado, a faixa de aviso e a prop
(`criticalPath={null}`). Mesma decisão do
[[feat-gantt-ctrl-z]] — recurso que não funciona é pior que recurso ausente.

## O que ficou no lugar

O status de cada tarefa virou **coluna da grade** (`gantt-mapping.ts`), que é
território nosso e funciona. As barras comunicam **progresso** pelo
`--wx-gantt-task-fill-color`, que distingue 30% de 90% — informação melhor que
categoria.

## Se voltar à mesa

O caminho não é CSS. É:

1. Confirmar no DevTools se uma barra que deveria ser crítica recebe
   `.wx-critical` no `class`. **Sem isso, não é problema de estilo.**
2. Se não receber, ver se `criticalPath` precisa de algo mais na config — a lib
   tem `slack`, `schedule` e `projectStart`/`projectEnd`, que podem participar do
   cálculo.
3. O tema já está preparado: `--wx-gantt-task-critical-color` e as demais
   variáveis de crítico estão documentadas em `gantt-status.css`.
