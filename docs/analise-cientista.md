# Análise pela ótica do cientista — ERP Bioinfood

**Data:** 2026-07-20 (1ª passagem) · **Escopo:** experiência ponta a ponta das duas personas (🧭 gestor/líder de projeto · 🔬 colaborador de bancada), cruzando com os papéis RBAC. **Método:** leitura das telas (`apps/web/app`) e do modelo (`schema.prisma`) — não renderizado; onde a afirmação depende de ver a tela, está marcado.

> Primeira passagem deste eixo. As passagens de UI/UX (`docs/analise-uiux.md`) e frontend cobrem *como as telas parecem/são feitas*; aqui a pergunta é só uma: **isso ajuda ou atrapalha a rotina real de quem faz P&D por contrato, e substitui o Notion/Excel?**

---

## 1. Resumo

Como **gerenciador de projeto e tarefas**, o ERP já é bom o suficiente para o gestor largar o Notion de acompanhamento: dashboard por projeto com saúde real (progresso, atrasos, riscos severos, marcos), TAP com aprovação rastreável, Gantt com baseline, Kanban que reflete na visão do gestor sem retrabalho. **Como lugar para o trabalho de bancada, ele ainda não existe** — não há onde anexar um arquivo, registrar um resultado/medição ou uma observação de experimento. Ou seja: o gestor adota; o colaborador de bancada usa para *tarefas administrativas* mas **continua no caderno/Excel para o que ele realmente produz**. Essa é a lacuna que decide a adoção real.

---

## 2. O que já encanta (preservar)

- 🔬 **Dashboard "Seu dia de trabalho em um lugar só"** — Minhas tarefas (atrasadas/hoje) + Próximos 7 dias + tarefas do CRM. É exatamente o radar diário que faz o colaborador abrir o sistema de manhã em vez da planilha.
- 🧭 **Dashboard por projeto** (`projects/[id]/dashboard`) — StatCards de Progresso, Tarefas atrasadas, Riscos severos, Marcos + saúde de cronograma. Um clique e o líder sabe se o projeto está bem, com atalho pra cada detalhe. Muito bom.
- 🔬 **Baixo atrito para criar** — "+ Novo" global (Tarefa/Projeto/Empresa/Negócio) na topbar + busca ⌘K. Criar tarefa não exige navegar até o projeto.
- 🔄 **Kanban reflete no gestor sem duplicar** — arrastar o card muda o status e isso aparece no dashboard/atividades (mesma entidade Task). Responde à dor clássica de "atualizei na planilha, agora atualizo no relatório": aqui é uma coisa só. E o kanban reverte se a gravação falha (não perde o movimento silenciosamente).
- 🧭 **TAP com aprovação rastreável** — quem aprovou e quando ficam registrados; liberar acesso ao cliente também é rastreado (quem concedeu). O gestor tem a trilha que precisa para governança de contrato.
- 🧭 **Gantt sério** — baseline (linha de base PMBOK), caminho crítico, dependências. Para projeto por contrato com prazo, é ferramenta de verdade, não enfeite.

---

## 3. Dores por persona e severidade

### 🔴 Bloqueia adoção (como sistema de registro de bancada)

**D1 · 🔬 · Task / módulos de projeto · Não há onde registrar o que o cientista PRODUZ.**
A tarefa modela título, descrição (texto livre, 2000 char), status, prioridade, responsável, datas, checklist, dependências e POPs. **Não há anexo de arquivo, nem campo de resultado/medição/observação de bancada, em lugar nenhum do app** (não existe `<input type="file">` no frontend; o `fileUrl` do POP é campo morto — "upload não implementado"; `LabOrder`/`LabSample` existem só como stub no banco, sem módulo nem tela).
**Na rotina:** o cientista termina um ensaio e não tem onde colocar o gráfico, o `.csv` do equipamento, a foto da placa, o laudo, a observação "cresceu contaminação no poço B3". Ele registra que a *tarefa* foi feita, mas o *dado* continua no caderno/Excel/Notion.
**Mundo real:** o Excel **não morre** — vira a fonte de verdade do resultado e o ERP vira só um checklist administrativo. Para uma empresa de "R&D as a Service", o entregável (dado/protocolo/arquivo do cliente) está fora do sistema que deveria centralizá-lo.
**Sugestão (mínimo que destrava):** anexo de arquivo em tarefa (e/ou no projeto) — um `fileUrl`/upload simples já reaproveitando o campo que o POP iria usar. Não precisa ser ELN completo; precisa ter *onde pôr o arquivo e a observação*. É a mudança de maior impacto na adoção do colaborador.

### 🟠 Atrito alto

**D2 · 🧭 · `projects/[id]` (todas as abas) · O CLIENTE vê rascunho interno.**
`project-nav.tsx` renderiza as 10 abas (TAP, Riscos, Stakeholders, Backlog, Configurações…) **sem gating por papel**, e o backend libera o GET desses sub-recursos a qualquer usuário com `ProjectAccess` (inclusive `CLIENTE`). Um cliente com acesso abre o projeto e vê o TAP possivelmente não aprovado, os **riscos** ("equipe subdimensionada", "fornecedor atrasa"), os stakeholders internos e o backlog cru.
**Na rotina/mundo real:** o gestor tem medo — justificado — de liberar acesso, porque exporia rascunho e riscos internos ao cliente. Resultado: ninguém usa o portal do cliente e o relatório volta a ser slide/PDF manual por fora.
**Sugestão:** ou uma **visão de cliente curada** (só o que foi aprovado/publicado — ex.: TAP aprovado, marcos, progresso), ou no mínimo esconder as abas sensíveis (Riscos, Stakeholders, Configurações, Backlog) quando o papel é `CLIENTE`. *(Confirmar renderizado o que o CLIENTE enxerga hoje.)*

**D3 · 🧭 · `/dashboard` + `/projects` · Falta a saúde do PORTFÓLIO numa tela.**
A saúde *por projeto* é ótima, mas para ver **o todo** o gestor abre projeto por projeto. O `/dashboard` lista projetos ativos só com o badge de status; a tabela de Projetos mostra status + término (plan./est.), mas **não** rola risco crítico nem tarefas atrasadas por projeto.
**Na rotina:** "quais dos meus 8 projetos estão em risco esta semana?" não tem resposta em uma tela — e é a pergunta nº 1 do líder na segunda de manhã.
**Sugestão:** colunas de "riscos severos" e "atrasadas" na tabela de Projetos, ou um bloco de rollup no `/dashboard` para ADMIN/APROVA. Os cálculos já existem em `lib/project-metrics.ts` (reuso direto).

### 🟡 Incômodo

**D4 · 🔬 · Task · A descrição é o único espaço livre e é sobrescrita — sem histórico/andamento.**
Para registrar "o que andei nesta tarefa hoje", o cientista só tem o textarea de descrição, que ele reescreve por cima. Não há notas/comentários datados por tarefa.
**Na rotina:** o acompanhamento de um experimento de várias semanas perde o fio; o "diário" da tarefa não existe.
**Sugestão:** um campo de notas append-only (comentário datado) por tarefa — barato e alto valor para o registro diário. Casa bem com D1 (anexo + nota = "o que fiz e o que saiu").

**D5 · 🔬 · POPs · O procedimento está catalogado, mas o documento não abre.**
O módulo POP versiona procedimentos e liga à tarefa (`TaskPop`), o que é ótimo para rastrear "qual versão do SOP foi usada". Mas `fileUrl` não tem upload — o cientista vê o **título** do POP na tarefa e não consegue **abrir o procedimento**.
**Sugestão:** habilitar o upload do PDF do POP fecha o loop (é o mesmo mecanismo de anexo de D1).

### 🔵 Polimento

**D6 · 🔬 · Login cai em `/projects`, não no `/dashboard`.** O "meu dia" é a primeira coisa que o colaborador quer ver; hoje ele aterrissa na lista de projetos. *(Também apontado em `docs/analise-uiux.md` #5.)*

**D7 · 🧭/CLIENTE · Menu do cliente tem itens que não são dele.** `CLIENTE` vê no menu "Configurações" (página morta) e "Atividades" (calendário interno). Se o portal do cliente for pra valer, esses itens confundem.

---

## 4. O que ainda vive fora do ERP

**Deveria entrar (ordem de dor):**
1. **Anexos/arquivos** (resultados, gráficos, `.csv` de equipamento, laudos, PDFs do cliente) — hoje 100% fora. É o D1.
2. **Resultado/observação de bancada** como dado, não só como texto na descrição — nota datada por tarefa (D4).
3. **Documento do POP** (upload do PDF do procedimento) — o esqueleto já existe (D5).
4. **Planilha de amostras** — `LabOrder`/`LabSample` já estão modelados no banco; falta módulo/tela. Puxar isso pra dentro tira uma planilha inteira do Excel.

**Fica fora de propósito (por ora — dev solo, YAGNI):**
- ELN completo / dados brutos de instrumento / integração com equipamento — grande demais para agora; o par "anexo + nota" cobre 80% da dor com 5% do custo.
- E-mail com o cliente: parcialmente coberto pelo CRM (Interactions registra e-mail/ligação/reunião); anexos do e-mail caem no mesmo D1.

---

## 5. Top 3 mudanças que mais aumentariam a adoção

1. **🔬 Dar um lar ao trabalho de bancada (D1 + D5):** anexo de arquivo em tarefa/projeto, reusando o campo que o POP já previa. Sem isso, o caderno/Excel não morre — é *a* decisão de adoção do colaborador.
2. **🧭 Visão de cliente curada antes de liberar CLIENTE (D2):** esconder abas sensíveis (Riscos/Stakeholders/Configurações/Backlog) ou expor só o aprovado. Destrava o portal do cliente sem medo de vazar rascunho.
3. **🧭 Saúde de portfólio numa tela (D3):** colunas de risco/atraso na tabela de Projetos (métricas já calculadas em `lib/project-metrics.ts`). Responde "o que está em risco?" sem abrir 8 projetos.

---

## 6. Cruzamento RBAC × persona (estado atual)

| Papel | Persona | Experiência hoje |
|---|---|---|
| ADMIN/APROVA | 🧭 gestor | Bem servido: cria/aprova projeto e TAP, concede acesso, vê saúde por projeto, governança rastreável. Falta rollup de portfólio (D3). |
| INSERE | 🔬 colaborador | Edita tarefas/kanban com baixo atrito; mas não tem onde pôr o resultado do trabalho (D1/D4). Bom como PM, incompleto como registro de bancada. |
| CONSULTA | 🔬/🧭 | Lê tudo dos projetos internos — ok para acompanhar. |
| CLIENTE | externo | Vê os projetos liberados, mas **com as abas internas** (D2). Experiência hoje passa "ferramenta interna", não "portal profissional". |
