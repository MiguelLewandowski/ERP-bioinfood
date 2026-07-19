# Análise de UI/UX — ERP Bioinfood

**Data:** 2026-07-19
**Escopo:** fluxos principais fora do CRM — login, Dashboard, Projetos (lista, form "Novo Projeto", ficha: TAP, Kanban, Gantt, Riscos), Atividades (calendário), Usuários, Configurações, topbar "+ Novo" — mais verificação de regressão do CRM.
**Método:** renderização real (Playwright headless, 1440×900, login como ADMIN, screenshots full-page de cada tela e dos diálogos abertos) + confirmação dos achados de cor/mapeamento no código-fonte. Não é leitura de JSX — as telas foram vistas renderizadas.

> Análise anterior (2026-07-18, CRM completo, achados #1–#11 todos implementados): ver seção **Histórico** no fim. **Verificação de regressão nesta rodada: as correções do CRM persistem** (barras de cor por etapa, barra de filtro + "Meus negócios", métricas, badge de urgência no card).

---

## Resumo

Fora do CRM, o app é **estruturalmente bom** (shell escura consistente, breadcrumbs, page-headers, empty states, ⌘K) mas a **linguagem de cor semântica está fraturada**: existem duas escalas de prioridade conflitantes para a mesma entidade Task (verde = "Alta" no kanban de projeto, âmbar = "Alta" em Atividades), o status de projeto tem um mapa central (`StatusBadge`) que a própria tela de Projetos ignora usando azul fora da marca, e o Gantt entrega tema default da biblioteca (azul, botão duplicado). São todos problemas de *consistência*, não de estrutura — corrigíveis sem redesign.

## Pontos fortes a preservar

- **Shell e navegação**: sidebar escura + topbar com busca ⌘K + menu "+ Novo" global (Tarefa/Projeto/Empresa/Negócio) — atalho de criação excelente, bem resolvido.
- **Ficha de projeto**: breadcrumb (`Projetos › Xarope de Xilose › TAP`), header com status + cliente, abas claras. O TAP com navegação lateral de seções (5/8 preenchidas, dot verde por seção completa) é ótimo padrão de formulário longo.
- **Dashboard**: "Seu dia de trabalho em um lugar só" com Minhas tarefas / Próximos 7 dias / Projetos ativos / Tarefas CRM — arquitetura de informação certa para o dia a dia.
- **Heatmap de Riscos**: matriz probabilidade × impacto com contagem por célula e lista por criticidade — comunica rápido e usa a paleta da marca.
- **Atividades**: contadores clicáveis por status (Total/A fazer/Em andamento/Concluídas/Atrasadas) + filtros — bom scan inicial.
- **Empty states e toasts** continuam consistentes nas telas novas verificadas.

---

## Achados por severidade

### 🔴 Crítico

**1. Duas escalas de cor de prioridade conflitantes — e a do kanban de projeto usa VERDE para prioridade máxima.**
`apps/web/lib/activities.ts:132` (`PRIORITY_META`: Baixa=cinza, Média=**verde**, Alta=**âmbar**, Crítica=**vermelho**) vs `apps/web/app/(dashboard)/projects/[id]/kanban/_components/kanban-card.tsx:8` e `backlog/_components/backlog-row.tsx:14` (Baixa=cinza, Média=amarelo, Alta=**verde claro `#86C175`**, Crítica=**verde primário `#147F23`**).
**Princípio violado:** consistência semântica de cor. A tela de Atividades reusa a MESMA entidade Task dos projetos — a mesma tarefa "Alta" aparece âmbar no calendário e verde no kanban. Pior: verde-primário é a cor de CTA/sucesso do app inteiro; "Crítica" em verde lê como "tudo certo". Visto renderizado: badge "Alta" verde no kanban do projeto Xarope de Xilose.
**Impacto:** o usuário não consegue formar um vocabulário visual — urgência fica invisível ou invertida exatamente onde mais importa (kanban/backlog de execução).
**Correção:** um único mapa de prioridade (componente/constante compartilhada, no espírito do `status-badge.tsx` que já existe para status), com escala neutro → âmbar → vermelho. Apagar os `PRIORITY_CONFIG` locais do kanban e do backlog. Nunca verde para prioridade.

### 🟠 Alto

**2. Status de projeto tem mapa central (`StatusBadge`) que a tela de Projetos ignora — com azul fora da marca.**
`components/ui/status-badge.tsx` define PLANNING=neutro, COMPLETED=success, e seu comentário diz "nunca redefinir cores de status localmente". Mas `components/projects/projects-table.tsx:10` e `project-card.tsx:19` redefinem `STATUS_COLORS` locais com `bg-blue-100 text-blue-700` para Planejamento — **a identidade Bioinfood não tem azul** (design-tokens.md: "Não existe token info — a identidade não tem azul"). Resultado visto renderizado: o Dashboard mostra "Planejamento" cinza-neutro e a lista de Projetos mostra "Planejamento" azul — as duas telas a um clique de distância. Classes utilitárias `blue-100`/`green-100` também contornam a regra nº 1 de tokens (não são hex, então o ESLint não acusa).
**Correção:** trocar os spans locais por `<StatusBadge status={...}/>` em `projects-table` e `project-card`; deletar os dois `STATUS_COLORS`.

**3. Gantt entrega o tema default da biblioteca — botão azul duplicado e barras azuis.**
Aba Gantt (`projects/[id]/gantt`): a toolbar do SVAR renderiza um botão azul "+ Nova tarefa" imediatamente abaixo do botão verde "Nova Tarefa" do header da página — **dois CTAs para a mesma ação, empilhados, em cores diferentes, um deles fora da marca**. As barras do gráfico também renderizam no azul default (o `gantt-status.css` pinta por status, mas tarefas sem status mapeado caem no azul da lib).
**Impacto:** a tela parece de outro produto; o usuário não sabe qual botão é "o certo".
**Correção:** ocultar a toolbar interna do SVAR (a página já tem o CTA) e definir cor default das barras via CSS override, como já foi feito para os status.

**4. Datas do Gantt com hora fantasma "21:00".**
Colunas Início/Término mostram `12/07/26 21:00` em todas as linhas — artefato de fuso (UTC−3 sobre datas armazenadas à meia-noite UTC). Em todo o resto do app a mesma tarefa mostra só "13 de jul.".
**Impacto:** ruído em toda linha e risco real de leitura errada de dia (a data exibida é a véspera do dia útil da tarefa); mina a confiança no cronograma.
**Correção:** formatar como data pura (`dd/mm/yy`) na config de colunas do Gantt, tratando a data como date-only (mesma normalização já usada no kanban/atividades).

**5. Login aterrissa em /projects, mas a "casa" declarada do app é o Dashboard.**
Após login o usuário cai em Projetos; o primeiro item do menu — e a tela desenhada como "Seu dia de trabalho em um lugar só" — é o Dashboard.
**Impacto:** o Dashboard (que resume tarefas atrasadas/do dia) perde a função de radar diário; o usuário só o vê se clicar por curiosidade.
**Correção:** redirecionar pós-login para `/dashboard` (exceto CLIENTE, se fizer sentido cair direto em projetos).

### 🟡 Médio

**6. Filtro de status duplicado na lista de Projetos.**
A tela tem chips de status ("Todos | Planejamento | Em andamento | …") E um dropdown "Todos os status" na linha logo abaixo — dois controles para o mesmo filtro, que podem divergir entre si.
**Correção:** manter só os chips (mais rápidos, 1 clique) e remover o dropdown redundante; sobra espaço para os filtros de cliente/responsável.

**7. "Término (est.)" sempre verde, mesmo quando estima atraso.**
`projects-table.tsx:150` pinta `forecastEndDate` com `text-primary` incondicional. Visto renderizado: projeto "Otimização" com término planejado 30/07/2026 e estimado **20/08/2026** (3 semanas de atraso previsto) — em verde vivo, a cor que o app inteiro usa para "positivo".
**Correção:** neutro por padrão; `text-destructive` quando est. > plan. (e opcionalmente `text-success` quando est. < plan.). É exatamente o dado que justifica a coluna existir.

**8. "Configurações" no menu principal é uma página morta ("Em desenvolvimento").**
Item permanente da navegação global que entrega uma tela vazia. Confunde com as Configurações *do projeto* (aba na ficha) e com Funis (config do CRM), que são as configurações reais que existem hoje.
**Correção:** remover o item do menu até a página existir (ou apontá-lo para o que já é configurável).

**9. Rótulo de eixo ambíguo no Heatmap de Riscos.**
"← PROBABILIDADE" aparece na horizontal, embaixo das colunas — mas a probabilidade é o eixo **vertical** (linhas Muito Alto → Muito Baixo); o horizontal é impacto (rotulado corretamente no topo).
**Correção:** girar o rótulo para a vertical, à esquerda das linhas.

### 🔵 Baixo

**10. Calendário de Atividades comunica estado por dois canais que não batem.** A legenda usa bolinhas (A fazer/Em andamento/Concluída/Atrasada), mas nas barras o estado aparece como cor de fundo + texto vermelho para atrasada — o usuário precisa deduzir a correspondência. Confiança reduzida: os dados de teste (tarefas multi-semana "New Task") exageram o efeito; reavaliar com dados reais.
**11. Ações da tabela de Usuários misturam padrões:** lápis/chave como botões-ícone e "Desativar/Ativar" como botão texto na mesma célula. Funciona, mas é o único lugar do app com esse híbrido; padronizar quando a tela for revisitada (ex.: tudo em `dropdown-menu` de ações, padrão do catálogo).
**12. Login sem caminho de "esqueci a senha".** Aceitável em app interno com reset via ADMIN — mas vale um microcopy ("Esqueceu? Fale com o administrador") para não deixar o usuário sem saída.

---

## Inconsistências cross-tela

- **Prioridade de tarefa**: 2 escalas de cor conflitantes (achado #1) — a mesma Task muda de cor entre Atividades e Kanban/Backlog de projeto.
- **Status de projeto**: mapa central `StatusBadge` vs mapas locais azuis em `projects-table`/`project-card` (achado #2) — Dashboard e Projetos mostram o mesmo status com cores diferentes.
- **Hex/cores fora de token** persistem em código de tela: `PRIORITY_META` (lib/activities.ts), `PRIORITY_CONFIG` (kanban-card, backlog-row), `STATUS_COLORS` (projects-table, project-card), `bg-blue-100` etc. Data-viz pura (heatmap de riscos, matriz de stakeholders, WBS, export PDF do charter) é exceção razoável — o problema são badges/status de UI comum.
- **Dois kanbans, duas linguagens**: o kanban do CRM (barra colorida no topo da coluna, contagem + soma) e o de projeto (dot + badge de contagem) têm anatomia visual diferente para o mesmo conceito. Menor — mas se um dia convergirem, usar o do CRM como referência (mais denso e mais recente).

## Top 3 ações (impacto ÷ esforço)

1. **Unificar a escala de prioridade** (#1): criar mapa único (padrão `status-badge`), apagar os 3 mapas locais. ~1h, mata o pior problema semântico do app.
2. **Projetos usar `StatusBadge`** (#2 + #7): troca de span por componente em 2 arquivos + cor condicional do término estimado. ~30min, elimina o azul off-brand e o conflito com o Dashboard.
3. **Gantt: esconder toolbar da lib e formatar datas** (#3 + #4): CSS/config, sem tocar em dados. ~1h, a tela mais "de outro produto" volta pra marca.

---

## Histórico — 2026-07-18 (CRM)

Análise com renderização real do CRM completo (Empresas, Pessoas, Negócios/kanban, Tarefas, config de Funis, ficha de empresa). **11 achados, todos implementados e verificados na mesma data**, entre eles: badge de urgência + concluir tarefa direto no card do kanban, cor da etapa na coluna, barra de filtro + "Meus negócios", empty state da Timeline padronizado, hierarquia de urgência e scroll na lista de tarefas do modal, botão "Definir padrão" padronizado. Dois achados foram reavaliados e deliberadamente não alterados (largura do board; tamanho de alvos de clique). **Regressão verificada em 2026-07-19: tudo persiste.** Detalhes completos no histórico do git deste arquivo (commit da análise de 2026-07-18).
