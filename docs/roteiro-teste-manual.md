# Roteiro de teste manual — trabalho acumulado em `develop`

> Gerado em 2026-07-29 durante sessão autônoma. **Nada aqui foi promovido para
> `main`** — está tudo em `develop`, aguardando você testar e decidir.
>
> Este documento é atualizado conforme mais trabalho entra. A seção
> "Estado da sessão" no fim diz até onde foi.

## Como usar

### ⚠️ Passo 0 — aplicar as migrations no banco local

**Faça isto ANTES de subir o app.** Duas migrations entraram nesta rodada e o
`pnpm dev` **não** as aplica sozinho (só o `startCommand` do Railway faz isso):

```bash
cd apps/api && pnpm exec prisma migrate deploy
```

Sem isso, o client Prisma pede colunas que o banco não tem e **qualquer tela que
liste tarefa ou risco devolve 500** — dashboard, TAP, kanban, backlog, Gantt.
Foi exatamente o erro visto em 2026-07-29 ao abrir o TAP:

```
Erro interno do servidor — lib/api.ts (110:11) @ request
```

Se o `pnpm dev` já estava rodando, **reinicie a API** depois de aplicar: o
processo pode ter carregado um client Prisma antigo.

Conferir que está tudo aplicado:

```bash
cd apps/api && pnpm exec prisma migrate status   # → "Database schema is up to date!"
```

### Depois disso

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
- [ ] A lista "POPs utilizadas" mostra só o nome, a versão e "N tarefas" —
      **sem barra de progresso** (removida a seu pedido: a tela responde "quais
      procedimentos este projeto segue", não "quanto está pronto")

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

> **Refeito em 2026-07-29 depois do seu retorno.** O que mudou:
> - **Uma barra só**, no lugar de duas linhas + legenda. "Agrupar por pacote" e
>   "Caminho crítico" estavam na barra de cima e passavam batido; agora estão na
>   mesma linha, com **fundo colorido quando ligados**.
> - **Altura explícita** na caixa do Gantt. A tentativa anterior (`h-full`)
>   dependia da cadeia de ancestrais e podia virar `auto` — aí o widget crescia
>   com o conteúdo, a rolagem vertical desaparecia e a horizontal fugia para o
>   fim da página. Agora a SVAR recebe uma caixa fechada e mostra **as duas
>   barras de rolagem, sempre**.
> - **Marco virou roxo** (`#7c4dbe`). Ele era âmbar `#dd8005`, quase o mesmo tom
>   de "em andamento" (`#f0b265`) — daí não se achar marco nenhum no cronograma.
> - **Ctrl+Z removido**, junto com o botão "Desfazer".
>
> **O que é "cabeçalho de pacote":** com "Agrupar por pacote" ligado, as linhas
> deixam de ser uma lista corrida e passam a ficar sob uma linha-título por
> pacote de **nível 1 da EAP** — "1. Gestão do Projeto", "2. Matéria-Prima" etc.
> É o que responde "onde termina um entregável e começa o outro". Se o projeto
> não tem EAP montada, todas as tarefas caem em "Sem pacote da EAP" e o
> agrupamento não muda nada visível — pode ser o que você viu.

- [ ] Abre já **mostrando hoje** (não em 2025 no começo do projeto)
- [ ] Controle **Dia / Semana / Mês / Trimestre**; começa em **Mês**
- [ ] Botão **"Hoje"** rola de volta para a data atual
- [ ] Botão **"Agrupar por pacote"** → linhas ganham cabeçalho por pacote da EAP
      ("1. Gestão do Projeto", "2. Matéria-Prima"…)
- [ ] Botão **"Caminho crítico"** → barras críticas ganham borda vermelha;
      desligado, some
- [ ] Coluna **"Duração"** com o cabeçalho inteiro (antes saía "Dura…")
- [ ] Coluna **"%"** nova
- [ ] ~~Nome da tarefa fixo na primeira coluna~~ — **removido**, dependia de um
      seletor CSS não confirmado que travava a rolagem. Pendente de DevTools.
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

### 5.3 Terceira rodada do Gantt (2026-07-29, segundo feedback)

O que mudou:

- **Ordem das linhas passou a ser por início da tarefa** (depois término, depois
  título). Antes era `Task.order`, o campo de prioridade do Backlog — que num
  cronograma não diz nada. Com agrupamento ligado, a ordem vale dentro de cada
  pacote. Marcos também ficaram em ordem de data.
- **Duas barras verticais: corrigido.** O `calc(100vh - 13rem)` era um palpite da
  altura do cabeçalho e errou para mais; sobrava conteúdo, o container de fora
  ganhava rolagem própria e a horizontal do Gantt só aparecia depois de rolar
  aquela. Agora é `flex` com `h-full`, sem número mágico.
- **"Hoje" — achado um defeito real:** o callback que entregava a instância da
  SVAR era uma arrow inline, então o efeito de auto-scroll re-disparava a cada
  render e re-scrollava o gráfico sem parar. Estabilizado, e o auto-scroll agora
  roda uma vez por montagem.
- **Caminho crítico** ganhou explicação no `title` e um **aviso quando o projeto
  não tem dependências** — que é a causa mais provável do "cliquei e não fez
  nada".

Testar:

- [ ] **Uma** barra de rolagem vertical na tela, não duas
- [ ] A horizontal do Gantt aparece **sem** precisar rolar nada antes
- [ ] As linhas estão em ordem de **data de início**, de cima para baixo
- [ ] Botão "Hoje" leva o gráfico para a data atual
- [ ] "Caminho crítico" ligado num projeto **sem dependências** → aparece a faixa
      âmbar explicando que não há o que destacar
- [ ] Criar uma dependência (arrastar da ponta de uma barra para outra) e ligar o
      caminho crítico → a sequência aparece destacada

> **O que é caminho crítico:** a sequência de atividades **encadeadas por
> dependência** que determina a data de término do projeto. Atrasar qualquer uma
> delas atrasa o projeto inteiro; atrasar uma tarefa fora dela, não. Por isso ele
> só existe onde há dependências — num projeto de tarefas soltas não há sequência
> a calcular.

### 5.2 Reteste do Gantt (2026-07-29, depois do feedback)

- [ ] **Barra única** no topo: Dia/Semana/Mês/Trimestre · Hoje · Agrupar por
      pacote · Caminho crítico · Nova Tarefa · Linha de base · legenda
- [ ] "Agrupar por pacote" começa **ligado**, com fundo verde
- [ ] Clicar desliga (fundo volta a branco) e as linhas viram lista corrida
- [ ] "Caminho crítico" ligado → fundo vermelho + barras críticas destacadas
- [ ] **Rolagem vertical funciona** dentro da grade do Gantt
- [ ] **Rolagem horizontal fica visível** sem rolar a página
- [ ] A página em si **não** rola — quem rola é a grade
- [ ] Em tela baixa (janela ~600px de altura) a grade não colapsa
- [ ] **Marco aparece em roxo** e se distingue de "em andamento" (âmbar)
- [ ] A legenda tem o losango roxo "Marco"
- [ ] **Ctrl+Z não faz nada** no Gantt (removido) e não há botão "Desfazer"

> ⚠️ Se "Agrupar por pacote" continuar sem efeito visível, confira se o projeto
> **tem EAP montada** (aba EAP). Sem pacotes de nível 1, tudo cai em "Sem pacote
> da EAP" e não há o que agrupar.

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

**Fechadas em 2026-07-30**, depois de você decidir as questões que estavam em
aberto (editor rico, origem dos insumos, escopo do estoque, privacidade das
anotações):

- [x] `feat-hierarquia-texto-tap` — **Tiptap v3**, HTML sanitizado no servidor
- [x] `feat-materiais-insumo-recursos-tap` — virou a mesma coisa que a de baixo
- [x] `feat-checklist-equipamentos-projeto` — módulo `stock` + checklist no TAP
- [x] `feat-modulo-anotacoes-pessoais` — privadas, **nem ADMIN lê**
- [x] `feat-melhoria-visual-atividades` — `/analisar-uiux` com renderização real;
      achou **dois 🔴 de correção** antes de qualquer questão estética

> Ver as seções **9 a 12** abaixo para o roteiro de teste dessas cinco.

### Migrations acumuladas em `develop`

| Migration | O que faz | Destrutiva? |
|---|---|---|
| `20260728180000_add_requires_sop` | `Task.requiresSOP` com default `true` | não — aditiva |
| `20260729120000_co_responsibles` | tabelas `TaskCoAssignee` e `RiskCoOwner` | não — aditiva |
| `20260730120000_stock_module` | `StockCategory`, `StockItem`, `CharterEquipment` | não — aditiva |
| `20260730130000_personal_notes` | tabela `Note` | não — aditiva |

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

---

# Rodada de 2026-07-30 — as cinco tarefas que estavam paradas

> ⚠️ **Antes de tudo:** duas migrations novas. `cd apps/api && pnpm exec prisma migrate deploy`,
> e rode `pnpm db:seed` (ou crie a categoria à mão) para ter a categoria **Equipamento**.
> Sem ela, o formulário de novo item não tem o que selecionar.

## 9. Editor de texto rico no TAP

> Os 12 campos narrativos viraram editor rico. Tipo, Prioridade e Orçamento **não** —
> continuam como estavam.

- [ ] Abrir um TAP → nos campos narrativos há uma **barra** acima da caixa
      (título, subtítulo, negrito, itálico, listas, checklist)
- [ ] Aplicar **negrito** e um **título** → a formatação aparece
- [ ] Criar uma **lista numerada** e apertar **Tab** dentro de um item → ele
      **indenta** (vira subitem). Shift+Tab desindenta
- [ ] **⚠️ O teste que mais importa:** digitar num campo rico e **sair dele** →
      "Salvo às HH:MM". O autosave é o mesmo de antes e não podia quebrar
- [ ] Digitar e **não** sair do campo → "Alterações não salvas"
- [ ] Digitar e **tentar fechar a aba sem sair do campo** → o navegador pergunta
      se quer sair
- [ ] **F5** → a formatação continua lá (negrito, título, lista aninhada)
- [ ] Abrir um TAP **escrito antes desta mudança** → o texto puro continua
      legível e vira parágrafo. Nada se perdeu
- [ ] **Exportar o TAP em PDF** → títulos e listas saem **formatados**. Se
      aparecer `<ul>` ou `<strong>` escrito na página, é bug
- [ ] Colar um texto grande e formatado de fora (Word/Notion) → salva sem erro
      *(o limite subiu de 4.000 para 20.000 caracteres porque markup ocupa espaço)*

## 10. Estoque (`/estoque`)

- [ ] O menu lateral tem **Estoque** (ícone de caixa)
- [ ] "Novo item" → cadastrar 2–3 equipamentos reais da Bioinfood
      (nome, categoria, patrimônio, quantidade, local)
- [ ] A lista aparece **agrupada por categoria**
- [ ] Buscar por **nome**, por **patrimônio** e por **local** → filtra nos três
- [ ] Filtrar por situação (Disponível / Em manutenção / Aposentado)
- [ ] Editar um item pelo lápis → salva e a lista reflete
- [ ] Excluir um item **que não está em nenhum projeto** → sai da lista

### 10.1 Categorias (`/estoque/config`, só ADMIN)

- [ ] Botão "Categorias" aparece no cabeçalho **só para ADMIN**
- [ ] Existe a categoria **Equipamento**, e só ela
- [ ] Criar "Insumo" e "Vidraria" → aparecem na lista
- [ ] A categoria nova passa a ser selecionável no formulário de item
- [ ] **Tentar excluir uma categoria em uso** → bloqueia, com a contagem de itens
- [ ] Desativar uma categoria → ela some das opções de item novo, mas os itens
      que já a usam continuam intactos
- [ ] **Entrar como PADRAO** → vê `/estoque`, mas o botão "Categorias" **não aparece**
- [ ] **Entrar como CLIENTE** → **não** vê "Estoque" no menu

## 11. Checklist de equipamentos no TAP

- [ ] TAP → seção **"Recursos e Orçamento"** → há "Equipamentos e materiais"
- [ ] "Adicionar" → abre o cadastro do estoque, com busca
- [ ] Adicionar 2–3 itens → aparecem **agrupados por categoria**
- [ ] Marcar o checkbox de um → vira "providenciado" (riscado), e o contador
      "N de M providenciados" acompanha
- [ ] **F5** → continuam marcados
- [ ] Item que está **Em manutenção** mostra o aviso âmbar na linha
- [ ] Tirar um item da lista pelo X → some
- [ ] **A bolinha da seção Recursos no menu lateral fica verde** com a checklist
      montada, mesmo sem preencher orçamento nem equipe
- [ ] Adicionar o **mesmo item duas vezes** → não duplica
- [ ] **Exportar o PDF** → a seção Recursos lista os itens com ☑ / ☐
- [ ] Adicionar equipamento num projeto **que ainda não tem TAP salvo** → funciona
      (o TAP é criado na hora)
- [ ] **Tentar excluir, em `/estoque`, um item que está na checklist** → bloqueia,
      sugerindo marcar como "Aposentado"
- [ ] **Entrar como CLIENTE** → vê a lista, mas **sem** "Adicionar", sem X e com
      os checkboxes desabilitados

## 12. Anotações pessoais (`/anotacoes`)

> ⚠️ **Esta é a única tela do ERP que o ADMIN não enxerga por cima.** O teste de
> privacidade abaixo é o que importa.

- [ ] O menu tem **Anotações**, para **todos** os perfis
- [ ] "Nova anotação" → cria e já abre para escrever
- [ ] Escrever título e conteúdo com formatação (título, lista, checklist)
- [ ] Parar de digitar ~1s → aparece "Salvando…" e depois "Salvo"
- [ ] **F5** → título e formatação continuam
- [ ] Fixar uma anotação (alfinete) → sobe para o topo da lista
- [ ] Buscar por um trecho do texto → filtra
- [ ] Excluir → pede confirmação com o **nome real** da anotação
- [ ] Digitar e **fechar a aba na hora** → o navegador avisa
- [ ] Trocar de anotação **no meio da digitação** → o que foi digitado na
      primeira **não se perde nem vaza para a segunda**

### 12.1 ⚠️ Privacidade — o teste que importa

- [ ] Criar uma anotação com o usuário **PADRAO** (ex.: `lider@bioinfood.com`)
- [ ] **Sair e entrar como ADMIN** → em `/anotacoes` o ADMIN vê **só as dele**.
      A anotação do outro **não aparece em lugar nenhum**
- [ ] Como ADMIN, tentar abrir a URL direta da anotação alheia
      (`/anotacoes` não expõe id; se você pegar o id pelo DevTools do outro
      usuário, `GET /notes/<id>` deve devolver **404**, não 403)
- [ ] **Entrar como CLIENTE** → tem as próprias anotações, e só as dele

## 13. Atividades — correções e melhoria visual

> A análise de UI/UX foi feita **com o app renderizado**. Ela achou dois defeitos
> de correção antes de qualquer questão estética. Diagnóstico completo:
> `docs/analise-uiux-atividades.md`.

### 13.1 ⚠️ Datas (era o pior dos dois)

- [ ] Abrir uma atividade **sem horário marcado** → o detalhe mostra
      **só a data**, sem "21:00" nenhum
- [ ] A data mostrada **bate com o prazo real** da tarefa (confira no backlog do
      projeto). Antes aparecia **um dia antes**
- [ ] Uma atividade **com hora de verdade** (ex.: reunião às 14h) → continua
      mostrando a hora, e a hora certa
- [ ] No calendário, a barra começa e termina **no dia certo**

### 13.2 ⚠️ Visão Semana (estava escondendo trabalho)

- [ ] Trocar para **Semana**, numa semana com tarefas longas em andamento
- [ ] **O número do "Total" bate com o que a lista mostra.** Antes dizia "6 Total"
      e listava 1
- [ ] Cada dia separa **"N vence"** (peso normal) de **"N em andamento"** (recolhido)
- [ ] Clicar em "N em andamento neste dia" → expande as que só estão correndo
- [ ] Uma tarefa que **começou semanas atrás e vence nesta semana** aparece —
      era exatamente o que sumia

### 13.3 Melhoria visual

- [ ] No calendário, atividades **Alta/Crítica/atrasadas** têm **ponto colorido**
      antes do título e o título em **negrito**; as demais, não
- [ ] Os chips do resumo (Total, A fazer, Em andamento, Concluída, Atrasadas)
      têm **quadradinho colorido** — a legenda separada que existia ao lado sumiu
- [ ] **Clicar num chip filtra** o calendário; clicar de novo desfaz
- [ ] Chip "Atrasadas" → só as atrasadas
- [ ] Período sem nada → estado vazio com ícone e explicação
- [ ] Com filtro que não casa nada → estado vazio **diferente**, com
      "Limpar filtros"

> **Sabidamente em aberto (A3):** a grade do mês ainda lê como um Gantt — quase
> toda barra atravessa a semana inteira, e a mesma tarefa se repete em cada linha
> de semana. Corrigir muda o modelo da tela (marcador de prazo × período
> contínuo) e é decisão sua. Está registrado no relatório.
