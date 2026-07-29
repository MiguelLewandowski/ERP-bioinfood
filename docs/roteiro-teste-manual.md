# Roteiro de teste manual — trabalho acumulado em `develop`

> Gerado em 2026-07-29 durante sessão autônoma. **Nada aqui foi promovido para
> `main`** — está tudo em `develop`, aguardando você testar e decidir.
>
> Este documento é atualizado conforme mais trabalho entra. A seção
> "Estado da sessão" no fim diz até onde foi.

## Como usar

Suba local (`pnpm dev`), entre num projeto com **muitas tarefas, marcos e uma
EAP montada** — os itens de Gantt e EAP só mostram problema com volume.

Marque `[x]` no que passar. O que falhar, anote embaixo do item.

⚠️ **Antes de promover para `main`:** a Onda 5 traz migration
(`20260728180000_add_requires_sop`). É aditiva com default, aplica sozinha no
boot da API, mas leia a "Ordem de promoção" em
[`planejamento-ui-projetos.md`](./planejamento-ui-projetos.md).

---

## 1. Termo de Abertura (TAP) — Onda 2

- [ ] Digitar num campo e **sair dele** (Tab ou clicar fora) → aparece "Salvo às HH:MM"
- [ ] Enquanto digita, sem sair do campo → aparece "Alterações não salvas"
- [ ] **Não existe mais botão "Salvar"** no cabeçalho
- [ ] Digitar num campo e **tentar fechar a aba sem sair do campo** → navegador
      pergunta se quer sair. **Este é o teste mais importante do TAP**: é a rede
      que substituiu o botão removido
- [ ] Abrir um TAP já aprovado → "Aprovado em dd/mm/aaaa" aparece como *badge*
      discreto, não como botão
- [ ] Seção "Identificação": **Tipo e Prioridade lado a lado**, não um por linha
- [ ] Menu lateral: seções preenchidas com bolinha **verde**, vazias com bolinha
      **cinza** (antes a bolinha só existia quando havia conteúdo)
- [ ] Conferir data de início/término do projeto — dia certo, sem deslocamento

## 2. Metodologia — Onda 3

- [ ] Lista "Tarefas sem POP" começa **fechada**, mostrando só a contagem
- [ ] Abrir → tarefas **agrupadas por responsável**, com "Sem responsável" no fim
- [ ] Buscar por título de tarefa → filtra
- [ ] Buscar pelo **nome de uma pessoa** → devolve o balde dela inteiro
- [ ] Busca sem resultado → mensagem, não lista vazia
- [ ] Barra de progresso das POPs: larga e **com o número %** ao lado

## 3. Dashboard do projeto — Onda 4

- [ ] Card "Tarefas": **uma barra empilhada** (verde/âmbar/cinza), não três barras
- [ ] Legenda abaixo com as três contagens
- [ ] "N tarefas em aberto sem responsável" é **clicável** → vai para o backlog
- [ ] No backlog, aparece o **chip "Sem responsável"** e a lista está filtrada
- [ ] Clicar no X do chip → some o filtro e a URL perde `?assignee=none`
- [ ] Card novo **"Carga por responsável"**, separado do card de Tarefas,
      ordenado de **quem está mais atrasado para quem está mais adiantado**
- [ ] Card "Resumo": link **"Gantt"** ao lado de "Abrir TAP"
- [ ] Card "Cronograma": desvio aparece como **número grande colorido**
      (`+12 dias`), não como texto cinza no rodapé

## 4. Metodologia + tarefas — Onda 5 (`requiresSOP`)

> ⚠️ **Esta é a única com banco.** E ela **não muda número nenhum sozinha**:
> toda tarefa existente nasce marcada como "exige POP". A métrica só se move
> depois que alguém classificar.

- [ ] Criar/editar tarefa → existe o checkbox **"Exige POP"**, marcado por padrão
- [ ] Desmarcar numa tarefa administrativa e salvar
- [ ] Na Metodologia, abrir "Tarefas sem POP" → **checkboxes** por linha
- [ ] Selecionar 2-3 → aparece a barra "N tarefas selecionadas"
- [ ] Clicar "Não exige POP" → some da lista e a **Cobertura sobe**
- [ ] O card Cobertura passa a dizer "X de Y · N não aplicável(is)"
- [ ] "Limpar" desmarca sem chamar a API
- [ ] **Entrar como CLIENTE** → os checkboxes **não aparecem**

## 5. Gantt — Onda 6

- [ ] Abre já **mostrando hoje** (não em 2025 no começo do projeto)
- [ ] Controle **Dia / Semana / Mês / Trimestre**; começa em **Mês**
- [ ] Botão **"Hoje"** rola de volta para a data atual
- [ ] Botão **"Agrupar por pacote"** → linhas ganham cabeçalho por pacote da EAP
      ("1. Gestão do Projeto", "2. Matéria-Prima"…)
- [ ] Botão **"Caminho crítico"** → barras críticas ganham borda vermelha;
      desligado, some
- [ ] Coluna **"Duração"** com o cabeçalho inteiro (antes saía "Dura…")
- [ ] Coluna **"%"** nova
- [ ] Rolar a grade para o lado → **nome da tarefa fica fixo** na primeira coluna
- [ ] Legenda de cores abaixo da barra de ferramentas
- [ ] **Entrar como CLIENTE** → controles de visualização aparecem, mas os de
      edição (Nova Tarefa, linha de base) não

### 5.1 Gantt — escrita (⚠️ o mais crítico do lote)

Com o **agrupamento ligado**:

- [ ] Arrastar uma tarefa para outra posição → salva e continua certo após F5
- [ ] Tentar arrastar o **cabeçalho de um pacote** → nada é gravado
- [ ] Duplo-clique num cabeçalho de pacote → **não abre** formulário
- [ ] Arrastar uma tarefa para dentro de outro pacote → não vira subtarefa de
      coisa nenhuma (o pai continua nulo)
- [ ] Renomear um **marco** → só o nome muda; a data **não anda**
- [ ] Arrastar um marco → só a data muda
- [ ] Renomear uma **tarefa** → as datas **não andam** (era o defeito encontrado
      ao fechar a tarefa dos marcos)

## 6. Transversal — Onda 7

- [ ] Trocar de aba do projeto → o esqueleto de carregamento **tem a forma da
      página** que vai chegar, não um retângulo cinza
- [ ] Passar o mouse no nome do projeto truncado (breadcrumb e título) → tooltip
      com o nome inteiro
- [ ] Backlog em janela estreita → os 4 números **quebram em 2 colunas**

## 7. Tarefas de `docs/tasks/` fechadas

### 7.1 Reordenar grava só o delta

- [ ] Arrastar **uma** tarefa uma posição no Gantt → no DevTools, o
      `PATCH /tasks/reorder` leva **2 itens**, não o projeto inteiro
- [ ] O mesmo no **Backlog**
- [ ] Arrastar e devolver ao lugar original → **nenhuma requisição**
- [ ] Reordenar no Gantt e conferir que o **Backlog reflete a mesma ordem**

### 7.2 Seletor de responsável (bug reportado na reunião)

> Causa era outra: os selects vinham de "criador + equipe do TAP + acesso ao
> projeto". Usuário interno enxerga o projeto **sem** ter acesso registrado,
> então quase todo o time ficava de fora.

- [ ] **Backlog**: criar tarefa → o select de responsável lista **todo o time**
- [ ] **Kanban**: idem
- [ ] **Riscos**: select de responsável lista todo o time
- [ ] **EAP**: dono do pacote lista todo o time
- [ ] Usuário **desativado** não aparece
- [ ] **Entrar como CLIENTE** → o select mostra só quem tem acesso ao projeto

### 7.3 Concluir tarefa que nunca foi iniciada

> Não era bug de código: a regra proibia TODO → DONE de propósito. A regra caiu.

- [ ] **Kanban**: arrastar de "A fazer" direto para "Concluído" → salva
- [ ] **Formulário**: abrir tarefa em TODO, mudar para DONE, salvar → salva
- [ ] Conferir que a tarefa ganhou data real de início **e** de fim
- [ ] Reabrir tarefa concluída direto para "A fazer" → salva

---

## Estado da sessão

| Frente | Estado |
|---|---|
| Ondas 1-7 de UI | ✅ em `develop` |
| `docs/tasks` detalhadas (3) | ✅ em `develop` |
| `docs/tasks` triagem (17) | 🔄 em andamento — ver abaixo |

### Triagem — progresso

- [x] `bug-admin-nao-aparece-nos-selects`
- [x] `bug-nao-salva-status-todo-para-done`
- [ ] as outras 15

*(esta seção é atualizada conforme a sessão avança)*
