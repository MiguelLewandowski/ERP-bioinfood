---
tipo: feature
escopo: web
complexidade: média
status: bloqueada-por-terceiro
criada: 2026-07-29
tema: cronograma
---

# Agrupar o Gantt por pacote da EAP — INDISPONÍVEL NESTA VERSÃO DA SVAR

## O que era

Agrupar as linhas do Gantt pelo pacote de **nível 1 da EAP** a que cada tarefa
pertence, com um cabeçalho por pacote:

```
▾ 2. Matéria-Prima
     Coletar amostras            ▬▬▬▬
     Caracterizar umidade            ▬▬▬▬▬
▾ 3. Desenvolvimento em Bancada
     Ensaio de extração                  ▬▬▬▬▬▬
```

Era o item "ordenação/agrupamento inconsistente" da Onda 6. A ordenação nunca foi
o problema — faltava dizer onde um entregável termina e o outro começa.

## Por que não funciona

**O módulo que implementa `groupBy` não é distribuído nesta versão.**

`@svar-ui/react-gantt` 2.7.1 declara `groupBy` como prop (com default `null`) e
`@svar-ui/gantt-store` exporta o tipo `IGroupByConfig`. Mas a implementação
procura um módulo registrado:

```js
// @svar-ui/gantt-store/dist/index.js
... .field ? this._modules.get("groupManager") : null
```

Contagem da string `groupManager` nos pacotes instalados:

| Pacote | Ocorrências |
|---|---|
| `@svar-ui/gantt-store` | **1** — só a linha acima, que o busca |
| `@svar-ui/react-gantt` | **0** |

Não há registro em lugar nenhum. Prop tipada, módulo ausente: o `groupBy` é
aceito, ignorado em silêncio, e nada acontece. Quase certamente recurso da
versão paga.

## Como isso enganou por quatro rodadas

O agrupamento nunca rodou — e isso invalidou a investigação de vários sintomas
que pareciam ser dele:

- **"Marcos soltos no rodapé"** e depois **"marcos todos no topo"** não tinham
  nada a ver com `ungrouped: 'bottom'`. Era só a ordem do array: os marcos eram
  concatenados depois (ou antes) das tarefas. A correção certa foi intercalar
  tarefas e marcos **por data**, e essa fica.
- **"Cabeçalho de pacote não aparece"** não era falta de vínculo com a EAP. Foi
  verificado no banco: o projeto "Plataforma de Ingredientes Funcionais" tem
  **45 tarefas, todas com pacote e todas com data**, e 5 pacotes raiz. Os dados
  sempre estiveram certos.

Lição: antes de investigar por que uma config de biblioteca "não pega", conferir
se ela **existe** no build instalado. Uma prop tipada não é promessa de
implementação.

## Decisão

Botão removido, `groupBy={null}`, em 2026-07-29.

Mantidos de propósito, porque são úteis e testados:

- `buildGroupLabels()` em `gantt-mapping.ts` — mapeia tarefa → pacote de nível 1
  usando o `rootOf` de `lib/project-wbs.ts`. Serve para qualquer coisa que precise
  desse vínculo, inclusive a ideia de alertar "N tarefas sem pacote" na EAP.
- O campo `group` em `GanttTask`.

## Se voltar à mesa

Três caminhos, em ordem de custo:

1. **Ordenar por pacote e inserir linhas-título nossas** como tarefas do tipo
   `summary`. ⚠️ Exige o mesmo cuidado do `isRealTask` de
   `use-gantt-persistence.ts`: linha sintética não pode virar escrita. Foi para
   isso que aquela guarda foi escrita.
2. **Avaliar a licença PRO da SVAR**, se `groupManager` vier nela — verificar
   antes de comprar, e conferir também se `criticalPath` depende de módulo
   parecido (ver [[feat-gantt-caminho-critico-descartado]]).
3. **Trocar a biblioteca de Gantt.** Só com bom motivo: a customização atual
   depende de detalhes desta lib e o incidente de fuso mora nela.
