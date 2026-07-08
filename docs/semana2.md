# 🧬 Bioinfood ERP — Semana 2: De sistema de projetos a ERP de verdade

Na Semana 1, o sistema aprendeu a organizar **projetos**. Na Semana 2, ele aprendeu a organizar o resto do negócio: **quem são os clientes, quem contatar, onde cada negociação está no funil de vendas** — tudo isso substituindo a mistura de Excel, Notion e memória que a Bioinfood usava antes. E, dentro dos projetos, ganhou peças que faltavam para virar uma ferramenta de gestão de verdade, não só uma lista de tarefas bonita.

---

## 🤝 O CRM — a parte que faltava para "vender" também virar sistema

Até a Semana 1, o ERP sabia tocar um projeto já fechado. Não sabia nada sobre **como aquele projeto chegou até ali** — quem é o cliente, quem conversou com quem, em que fase da negociação as coisas estavam. Essa é a parte que a Semana 2 resolveu.

### 🏢 Clientes e Contatos
Cada empresa (cliente, parceiro, agência de fomento, fornecedor) agora tem uma **ficha única** — não mais um campo de texto solto dentro do projeto. Uma mesma empresa pode acumular vários papéis (ex.: um laboratório parceiro que também vende reagentes) sem precisar de cadastro duplicado.

- **Cadastro em segundos com CNPJ**: cola o CNPJ, o sistema busca automaticamente razão social, endereço, situação na Receita e setor. Se a busca falhar ou for empresa estrangeira, preenche à mão sem travar.
- **Detecção de duplicado**: tentar cadastrar o mesmo CNPJ duas vezes é bloqueado, com aviso de qual cadastro já existe.
- **Ficha 360°**: abrir uma empresa mostra numa tela só os dados, os contatos vinculados (com quem é o decisor, quem é do financeiro), o histórico de conversas e as oportunidades de negócio em aberto.
- **Contatos** (pessoas) são separados das empresas — uma pessoa pode trocar de emprego ou atender mais de um cliente sem bagunçar o cadastro. Cada contato guarda e-mail, telefones, WhatsApp, aniversário, redes sociais.
- **Arquivar em vez de apagar**: um cliente que a Bioinfood parou de atender pode ser arquivado (some da lista principal, mas todo o histórico continua acessível) — nada se perde de verdade.

### 📞 Timeline de interações — "onde a conversa parou"
Depois de uma ligação, reunião ou troca de e-mail, dá pra registrar isso na ficha do cliente em segundos — e, no mesmo passo, já criar um lembrete de retorno com prazo ("enviar proposta até sexta"). Da próxima vez que alguém abrir aquele cliente, vê imediatamente o histórico completo, não precisa perguntar "o que ficou combinado?".

### 🎯 Funil de vendas (Kanban de oportunidades)
Um quadro visual de arrastar-e-soltar, igual ao de tarefas, mas para **negócios em andamento**. Cada card é uma oportunidade comercial (valor, cliente, responsável, previsão de fechamento) numa coluna do funil ("Qualificação", "Proposta", "Negociação"...). Arrastar o card pra frente já recalcula a probabilidade de fechamento automaticamente; arrastar pra uma coluna de "Ganho" ou "Perdido" fecha o negócio e conta nos números.

- **Funis configuráveis**: a Bioinfood tem mais de uma linha de negócio (R&D as a Service, Subvenção Econômica, Licenciamento, Prospecção) — cada uma pode ter seu próprio funil, com colunas próprias, sem precisar mexer em código.
- **Números automáticos**: total em aberto, valor ponderado pela chance de fechar, e taxa de conversão — sempre atualizados, sem planilha.

### ⏰ Painel de pendências
Uma tela que responde "o que eu preciso fazer hoje?": lembretes atrasados, lembretes de hoje, e uma lista de **clientes esfriando** (sem nenhuma conversa registrada há mais de 30 dias) — pra ninguém ser esquecido só porque a agenda encheu.

### 📋 A planilha real foi lida e mapeada
A Bioinfood tinha uma planilha real de oportunidades comerciais, cheia de inconsistências (CNPJ em formatos diferentes, campos preenchidos na coluna errada, nomes incompletos). Essa planilha foi **lida célula por célula e documentada** — o que cada coluna significa, onde estão os erros, como cada dado deve virar um cadastro no sistema novo — preparando o terreno para importar os dados reais sem depender de reler a planilha toda vez.

---

## 📁 Gestão de Projetos — de "funciona" para "funciona bem"

### 📜 Termo de Abertura (TAP) redesenhado
O formulário do TAP tinha um problema sério: os dados do projeto (nome, cliente, datas) apareciam **duas vezes em dois lugares diferentes** — uma vez dentro do próprio TAP, outra na aba de Configurações — e podiam ficar dessincronizados. Isso foi resolvido: o TAP agora só *mostra* um resumo desses dados, com um botão pra editar no lugar certo. Além disso:

- **Salva sozinho**: antes, esquecer de clicar em "Salvar" ao sair da aba perdia o que foi digitado. Agora, sair de um campo já salva automaticamente.
- **Sabe quem editou por último**: o topo da tela mostra "editado por [nome] em [data/hora]" — antes não havia nenhum rastro de quem mexeu no quê.
- **Mostra o progresso**: um contador ("5/8 seções preenchidas") e uma bolinha verde ao lado de cada seção já preenchida — antes não dava pra saber o que faltava sem abrir todas as 8 seções uma por uma.
- **Aprovar pede confirmação** e mostra a data da aprovação, em vez de acontecer com um clique sem aviso.

### 👥 Partes Interessadas (Stakeholders) — modelo PMBOK
Faltava uma peça clássica de gestão de projetos: o **registro de partes interessadas**, com a grade "Poder × Interesse" que classifica cada pessoa envolvida em 4 grupos — quem precisa de atenção total, quem só precisa ser mantido satisfeito, quem só precisa ser informado, e quem só precisa ser monitorado. Isso já existia "programado" no banco de dados desde a Semana 1, mas nunca tinha ganhado tela nem funcionalidade — agora tem.

### 📅 Gantt em português e mais confiável
O gráfico de Gantt (linha do tempo visual do projeto) usava uma biblioteca pronta que só vinha em inglês — todos os botões, menus e formulários foram traduzidos para português.

Além disso, dois problemas de confiabilidade foram corrigidos:
- **Reordenar tarefas arrastando agora salva de verdade.** Antes, arrastar uma tarefa para cima ou para baixo no Gantt mudava a posição só na tela — ao recarregar a página, voltava pro lugar de antes. Agora a nova ordem é gravada no banco de dados.
- **Editar tarefa ficou igual em todas as telas.** O Gantt tinha seu próprio formulário de edição (da biblioteca pronta), diferente do Kanban e do Backlog — faltavam campos como prioridade, responsável e checklist. Agora as três telas abrem exatamente o mesmo formulário.

### 📊 Tabelas de Clientes e Projetos com busca e filtro
As listas de clientes e de projetos eram tabelas simples sem filtro nenhum — achar algo específico exigia rolar a tela toda. Agora têm busca por nome/documento/e-mail, filtros por status/cliente/responsável, e a badge de status parou de quebrar a linha feio.

---

## 🗄️ Nos bastidores (para quem for curioso)

- **12 tabelas novas no banco de dados** só para o CRM (empresas, contatos, funil, interações, pendências, taxonomias configuráveis) — todas com histórico preservado (nada é apagado de verdade, só arquivado).
- **A fundação de dois módulos futuros já foi deixada pronta no banco de dados** (mas ainda sem tela nem funcionamento): **Laboratório** (ordens e amostras) e **Compras/Estoque** (fornecedores, pedidos, produtos) — para quando chegar a vez de construí-los, sem precisar redesenhar o banco do zero.
- **Confirmações antes de ações que não têm volta** (arquivar cliente, excluir tarefa, aprovar TAP) — antes algumas dessas ações aconteciam com um clique só, sem chance de "acho que cliquei errado".
- **Notificações visuais (toasts)** de sucesso/erro em qualquer ação do sistema — antes, muitas ações falhavam em silêncio.

---

## 📊 Números da semana

| | |
|---|---|
| Módulos de backend novos | **8** (organizações, contatos, funil, oportunidades, interações, pendências CRM, taxonomias, partes interessadas) |
| Tabelas novas no banco de dados | **~18** (12 do CRM + 6 de fundação para módulos futuros) |
| Telas novas no frontend | **~10** (clientes, ficha 360°, funil, pendências, configurações de CRM, partes interessadas…) |
| Testes automatizados novos | **21** (todos passando) |
| Bugs de confiabilidade corrigidos | **4** (reordenar no Gantt, TAP duplicado, editor do Gantt divergente, chamada de API com verbo errado) |

---

## 🚀 O que vem a seguir

Importar de fato a planilha real de oportunidades (o mapeamento já está pronto, falta rodar a importação com validação humana dos casos duvidosos). Depois: dashboard com métricas reais do negócio inteiro, acesso de clientes externos ao próprio projeto (o mecanismo já existe no sistema, mas ainda não tem tela para o administrador liberar esse acesso), e os módulos de Laboratório e Compras/Estoque, cuja fundação no banco de dados já está pronta.
