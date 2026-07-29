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

### 7.4 TAP — campo Restrições e seção Riscos

- [ ] Seção "Escopo" do TAP **não tem mais** o campo "Restrições"
      *(a coluna continua no banco — remover coluna é destrutivo e apagaria o
      que já foi escrito. Se você quiser apagar de vez, é uma segunda publicação)*
- [ ] Nova seção **"Riscos"** no menu lateral do TAP
- [ ] Ela **lista** os riscos do projeto, do maior score para o menor
- [ ] Bolinha colorida bate com a faixa usada na aba Riscos
- [ ] Botão "Gerenciar riscos" leva para a aba
- [ ] Projeto sem risco → estado vazio com atalho para mapear o primeiro
- [ ] A bolinha da seção Riscos no menu fica **verde** quando há riscos

### 7.5 Tipo de projeto

- [ ] Campo "Tipo" no TAP virou **lista**: Interno, Parceria, Contrato, Serviço,
      Subvenção
- [ ] ⚠️ **Abrir um TAP que já tinha tipo escrito à mão** (ex.: "P&D Interno") →
      o valor antigo continua aparecendo e selecionado. Salvar **não** pode
      apagá-lo

### 7.6 Corresponsáveis (⚠️ traz migration)

> `20260729120000_co_responsibles`. Aditiva: cria duas tabelas, não altera
> nenhuma linha existente. `assigneeId`/`ownerId` continuam sendo o
> **responsável principal**; a lista nova é quem divide.

- [ ] Formulário de tarefa: campo **"Corresponsáveis"** com checkboxes
- [ ] Quem está como responsável principal **não aparece** na lista de
      corresponsáveis
- [ ] Salvar com 2 corresponsáveis e reabrir → continuam marcados
- [ ] No **kanban**, o card mostra a inicial do principal e **"+2"**
- [ ] Passar o mouse no "+2" → nomes dos corresponsáveis
- [ ] Mesma coisa no formulário de **risco**
- [ ] Na lista de riscos, aparece "Responsável +N"
- [ ] Tarefa/risco **sem** corresponsável continua igual a antes

### 7.7 Rolagem horizontal do Gantt

- [ ] Abrir o Gantt de um projeto com muitas tarefas → a **barra de rolagem
      horizontal fica visível na base da tela**, sem precisar rolar a página
- [ ] A página do Gantt **não** rola verticalmente como um todo; quem rola é a
      grade

### 7.8 "Novo → Tarefa" do cabeçalho

> Ele criava tarefa com três campos, enquanto o Backlog abre o formulário
> completo. Agora só escolhe o projeto e delega ao **mesmo** formulário.

- [ ] "Novo → Tarefa" → diálogo pede **só o projeto**
- [ ] "Continuar" abre o formulário completo (responsável, prioridade,
      story points, checklist, POPs…)
- [ ] Criar a tarefa → toast com atalho "Ver kanban"
- [ ] A tarefa aparece no projeto escolhido, com os campos preenchidos

### 7.9 Calendário de Atividades

- [ ] Semana com **4+ atividades no mesmo dia** → a linha da semana **cresce** e
      mostra todas, sem "+N mais"
- [ ] Semana tranquila continua com a altura de antes (não fica esparsa)
- [ ] Semana com mais de 8 trilhas → volta a aparecer "+N mais" (teto para uma
      semana atípica não empurrar o resto para fora da tela)

### 7.10 Desfazer no Gantt (⚠️ precisa de verificação especial)

> A SVAR tem desfazer nativo, e a persistência do ERP reage aos eventos da
> store — então o desfazer **deveria** atravessar até a API pelo caminho já
> existente. **Não consegui verificar isso sem rodar a aplicação.**

- [ ] Arrastar uma tarefa, apertar **Ctrl+Z** → a barra volta ao lugar
- [ ] **Dar F5 depois do Ctrl+Z** → a barra continua no lugar original.
      **Este é o teste que importa**: se ela voltar para onde foi arrastada, o
      desfazer só mexeu na tela e não chegou ao servidor
- [ ] **Ctrl+Shift+Z** refaz
- [ ] Botão "Desfazer" na barra faz o mesmo que o atalho
- [ ] Ctrl+Z **dentro de um campo de texto** desfaz a digitação, não o Gantt
- [ ] Perfil CLIENTE não vê o botão

---

## Estado da sessão

| Frente | Estado |
|---|---|
| Ondas 1-7 de UI | ✅ em `develop` |
| `docs/tasks` detalhadas (3) | ✅ em `develop` |
| `docs/tasks` triagem (17) | 🔄 em andamento — ver abaixo |

### Triagem — progresso

Feitas:

- [x] `bug-admin-nao-aparece-nos-selects` — causa era outra (ver §7.2)
- [x] `bug-nao-salva-status-todo-para-done` — regra intencional, derrubada
- [x] `feat-remover-restricoes-tap` — só da tela; coluna preservada
- [x] `feat-secao-riscos-no-tap`
- [x] `feat-gantt-barra-horizontal-fixa`
- [x] `feat-tipos-de-projeto` — lista na tela, sem enum no banco
- [x] `feat-multiplos-responsaveis-risco`
- [x] `feat-multiplos-responsaveis-tarefa`

- [x] `feat-padronizar-form-nova-tarefa`
- [x] `feat-calendario-mostrar-mais-atividades`
- [x] `feat-gantt-ctrl-z` — nativo da SVAR; **ver ressalva em §7.10**

Pendentes — **e por que não saíram**:

- [ ] `feat-melhoria-visual-atividades` — a anotação ("o mais visual possível")
      não define resultado verificável. O próprio doc da tarefa diz que é
      candidata a `/analisar-uiux`, não a implementação direta.
- [ ] `feat-hierarquia-texto-tap` — depende de escolher **um** editor rico e um
      formato de persistência (Markdown? HTML? JSON?), com sanitização contra
      XSS. É decisão de arquitetura, e a mesma decisão vale para o módulo de
      anotações — fazer as duas com editores diferentes seria o pior desfecho.
- [ ] `feat-materiais-insumo-recursos-tap` — depende de saber se insumo vem do
      catálogo do módulo de estoque ou é texto livre no TAP. Se vier do
      catálogo, depende da tarefa abaixo.
- [ ] `feat-checklist-equipamentos-projeto` — módulo novo. Existe um **stub** de
      estoque no schema (`Product`, `StockMovement`) sem módulo NestJS nem tela;
      decidir se aproveita, reescreve ou ignora é decisão de arquitetura.
- [ ] `feat-modulo-anotacoes-pessoais` — módulo novo, e esbarra numa questão de
      RBAC que não é minha para resolver: **nota "pessoal" que nem ADMIN pode
      ler contraria o RBAC atual** ("ADMIN sempre passa no RolesGuard"). Isso é
      decisão de privacidade, não de código.

> As quatro últimas caem na **regra de ouro do `CLAUDE.md`**: decisão que
> impacta arquitetura, banco ou segurança para, documenta e pergunta. Deixei
> documentado em vez de escolher por você.

### Migrations acumuladas em `develop`

| Migration | O que faz | Destrutiva? |
|---|---|---|
| `20260728180000_add_requires_sop` | `Task.requiresSOP` com default `true` | não — aditiva |
| `20260729120000_co_responsibles` | tabelas `TaskCoAssignee` e `RiskCoOwner` | não — aditiva |

Nenhuma exige as duas publicações do procedimento de migration destrutiva.
As duas aplicam sozinhas no boot da API (`prisma:deploy` no `startCommand`).

*(esta seção é atualizada conforme a sessão avança)*

---

## 8. Stakeholder — contato criado na hora

> Das duas saídas possíveis, escolhi a que **não muda o schema**:
> `ProjectStakeholder.contactId` continua obrigatório, e o contato passa a ser
> criado na hora. Deixar o `contactId` nulo com um nome solto tiraria a proteção
> da `@@unique([projectId, contactId, type])` contra duplicata.
>
> O preço é um contato "raso" no CRM (só nome) — reversível, é só completar a
> ficha depois.

- [ ] Aba Partes Interessadas → adicionar → botão **"Novo"** ao lado do select
- [ ] Digitar só um nome e clicar "Criar" → o contato é criado e já fica
      selecionado
- [ ] **Enter** cria; **Esc** cancela
- [ ] O contato novo aparece no CRM (Pessoas), com só o nome preenchido
- [ ] Se o perfil não puder criar contato, aparece erro amigável — não quebra
