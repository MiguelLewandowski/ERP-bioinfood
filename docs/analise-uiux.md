# Análise de UI/UX — ERP Bioinfood

**Data:** 2026-07-18 (última atualização: 2026-07-18 — top 3 ações implementadas)
**Escopo:** CRM completo (`/crm` — abas Empresas, Pessoas, Negócios, Tarefas; `/crm/config`; ficha de empresa `/crm/empresas/[id]`)
**Método:** renderização real via Playwright (login, navegação, abertura de diálogos, screenshots full-page em 1440×900). Não é leitura de código — é a tela de verdade.
**Gatilho:** usuário sinalizou que a aba Negócios (funil/kanban) está fraca e pouco interativa "comparada ao Agendor". Essa aba recebeu peso extra nesta rodada.

> ✅ **Status:** as 3 ações prioritárias (achados #1, #2 e #3) foram implementadas e verificadas na mesma sessão — ver "Resolvido" em cada achado e a seção de Top 3 ações no final. Achados #4–#11 seguem em aberto.

---

## Resumo

O CRM é **funcionalmente completo e consistente** (mesmo design system em todas as telas, sem hex cru, formulários bem estruturados) — mas o **kanban de Negócios é a tela mais fraca do módulo**, e o usuário está certo: comparado a um CRM de referência como o Agendor, ele hoje é uma lista de cards em colunas, não uma ferramenta de trabalho. As demais telas (Empresas, Pessoas, ficha, config) estão em bom nível para um MVP interno.

## Pontos fortes a preservar

- **Design system realmente seguido**: zero hex solto nas telas revisadas, tokens semânticos (`success`, `accent`, `destructive`) aplicados de forma consistente.
- **Empty states com propósito**: "Nenhum cliente cadastrado" e similares sempre vêm com CTA, não é só texto morto.
- **Badges de contato bem resolvidos**: "Principal" (estrela âmbar) e "Decisor" (pill verde) na aba Contatos comunicam hierarquia rápido, sem poluir.
- **Breadcrumb automático** (`CRM › Empresas › Ambev Research`) — dá localização espacial de graça, sem trabalho extra do usuário.
- **Toasts de confirmação** consistentes em toda ação de escrita testada (criar, salvar, congelar).

---

## Achados por severidade

### 🔴 Crítico

**1. Kanban não comunica prioridade nem risco — só posição.** `crm-card.tsx` / aba Negócios.
Um card mostra título, empresa, valor e probabilidade. **Não mostra**: se há tarefa atrasada vinculada àquele negócio (mesmo já existindo `Activity.opportunityId` no backend), quem é o responsável (avatar/nome só aparece *se* houver responsável — não há placeholder "sem responsável" clicável), nem há indicação de "há quanto tempo está parado nesta etapa". Resultado: o gestor precisa abrir card por card para saber o que precisa de atenção — exatamente o oposto do que um kanban deveria resolver.
**Impacto:** a ferramenta vira uma lista bonita, não um painel de decisão. É a causa raiz de "parece fraco comparado ao Agendor" — o Agendor usa o card para *sinalizar urgência* (badge vermelho de atividade atrasada), aqui o card só *arquiva* dado.
**Correção:** no `CrmCard`, buscar (ou receber já agregado do backend) `overdueTasksCount`/`nextTaskDueDate` por oportunidade e renderizar um badge vermelho/âmbar quando houver pendência vencida ou vencendo hoje — mesmo padrão visual já usado na aba Tarefas (`AlertTriangle` vermelho / `Clock` âmbar). Reaproveitar, não inventar novo.
**✅ Resolvido (2026-07-18):** `crm/page.tsx` busca as tarefas `overdue`+`today` (best-effort) e monta um mapa `opportunityId → tarefa mais urgente`, propagado via `CrmTabs → CrmClient → CrmCard`. O card agora mostra um badge (vermelho `AlertTriangle` se atrasada, âmbar `Clock` se hoje) com o título da tarefa, reaproveitando exatamente as cores já usadas na aba Tarefas. Verificado com screenshot real.

**2. Nenhuma ação sem abrir o modal inteiro.** Aba Negócios.
Mover de etapa exige clicar e arrastar (funciona, mas é a única interação). Qualquer outra coisa — mudar valor, ver quem é responsável, marcar tarefa como feita, ligar para o contato — exige abrir "Editar Oportunidade", rolar até "Tarefas", e fechar de novo. Não há **nenhuma ação de um clique** no card em si.
**Impacto:** alto custo de interação para tarefas triviais (ex.: marcar a única tarefa atrasada como feita exige 3 cliques: abrir card → achar a tarefa na lista → clicar no círculo).
**Correção:** no mínimo, permitir concluir a tarefa mais urgente diretamente no card (ícone de check no canto, visível só quando há pendência) sem abrir o modal — mesma UX que a aba Tarefas já tem para o card de "Atrasadas".
**✅ Resolvido (2026-07-18):** o badge de urgência do card tem um botão de check (`CheckCircle2`) que chama `crmActivitiesApi.update(taskId, {status:'DONE'})` direto, com `stopPropagation` para não abrir o modal de edição, atualização otimista (badge some na hora) e rollback+toast de erro se a chamada falhar. Verificado: clique conclui a tarefa, toast "Tarefa concluída" aparece, modal **não** abre (confirmado via teste automatizado).

### 🟠 Alto

**3. Coluna de etapa não usa a cor da etapa.** `crm-column.tsx`.
Cada etapa tem uma `color` configurável em `/crm/config` (visível como bolinha de 6px ao lado do nome) — mas a coluna inteira do kanban é neutra (fundo cinza claro igual para todas). A cor cadastrada vira decoração cosmética de 6px, não uma pista visual de "onde estou no funil". Um gestor escaneando o board não distingue "Qualificação" de "Negociação" sem ler o texto.
**Impacto:** a arquitetura de dados já suporta isso (cor por etapa existe e é editável) — é puro desperdício de um dado que já existe e não é usado.
**Correção:** aplicar a `stage.color` como barra superior da coluna (4-6px) ou fundo sutil do header da coluna, não só no dot.
**✅ Resolvido (2026-07-18):** `crm-column.tsx` agora renderiza uma barra de 6px no topo da coluna com `stage.color` (fallback para `muted-foreground` se a etapa não tiver cor definida). O dot ao lado do nome foi removido (redundante com a barra). Verificado: board com barras laranja/verde/vermelha por etapa, batendo com a config de Funis.

**4. Board não ocupa o espaço disponível.** Aba Negócios, viewport 1440px.
As 5 colunas do funil padrão ocupam ~1150px de 1440px disponíveis, com larguras fixas em `minmax(220px, 1fr)` e o board "flutua" à esquerda sem preencher a tela. Em telas maiores (comum em posto de gestão), sobra muito espaço morto à direita e embaixo.
**Correção:** colunas com `min-width` maior e crescimento proporcional ao viewport, ou aumentar a densidade de informação por card para justificar a largura.

**5. Nenhum filtro/segmentação no board.** Aba Negócios.
O único controle é o seletor de funil (dropdown). Não dá para filtrar por responsável, por valor, por "só os meus negócios", nem buscar um negócio específico sem escanear as colunas visualmente. Em qualquer volume real (>20-30 negócios), isso vira inviável.
**Correção:** barra de filtro compacta acima do board (responsável, busca por nome/empresa) — não precisa ser sofisticada, mas precisa existir antes do volume crescer.

**6. Empty state da Timeline foge do padrão do design system.** `timeline-tab.tsx`.
"Nenhuma interação registrada ainda." é uma caixa tracejada com texto solto, sem ícone — enquanto o catálogo do projeto já tem um componente `empty-state` (ícone + título + descrição + CTA) usado em Empresas e Pessoas. Duas soluções visuais diferentes para o mesmo conceito ("lista vazia") na mesma ficha.
**Correção:** trocar pela `EmptyState` já catalogada, com ícone `MessageSquare` e o botão "Registrar interação" como `action`.

### 🟡 Médio

**7. Lista de Tarefas dentro do modal de negócio não tem hierarquia por urgência.** `opportunity-tasks-section.tsx`.
As 5 tarefas de teste aparecem todas com o mesmo peso visual (badge cinza "Nota", texto preto). A que vence hoje ("Ligacao com prazo hoje") não se distingue visualmente das sem prazo — só dá pra saber lendo a data pequena à direita.
**Correção:** reaproveitar as cores de urgência da aba Tarefas (vermelho/âmbar) na data, e ordenar por prazo (vencidas primeiro) em vez de mais-recente-criada-primeiro.

**8. Modal de negócio cresce sem limite com muitas tarefas.** Mesmo componente.
A seção de Tarefas está dentro do `DialogContent` sem scroll próprio — com muitas tarefas, o modal inteiro (incluindo o formulário acima) rola junto, empurrando os botões Salvar/Cancelar para fora da viewport em telas menores.
**Correção:** região de tarefas com altura máxima e scroll interno próprio, separada do formulário.

**9. Botão "Definir padrão" da config de Funis é texto puro, sem hierarquia de botão.** `funis-client.tsx`.
Ao lado de ações reais (excluir = ícone vermelho), "Definir padrão" é um link de texto verde solto — funciona, mas não segue o mesmo padrão visual (`button`/`Badge`) usado nas outras ações da mesma linha.

### 🔵 Baixo

**10. Métricas do funil (Em aberto/Ponderado/Conversão/Ganhos-Perdidos) são visualmente idênticas independente do valor.** Sem cor mesmo quando conversão é 0% ou ganhos/perdidos desequilibrados — um pouco de codificação por cor (ex.: conversão baixa em âmbar) ajudaria o scan rápido, mas não é essencial num MVP.
**11. Ícones de "congelar" (❄) e badges de tipo de tarefa são pequenos (11-13px) e próximos de outros elementos clicáveis — dentro do aceitável, mas no limite inferior de conforto de clique.

---

## Inconsistências cross-tela

- **Empty state**: componente `EmptyState` catalogado é usado em Empresas/Pessoas, mas não na Timeline (achado #6) nem nas colunas vazias do kanban (que só mostram a palavra "Vazio" sem nenhum tratamento visual).
- **Indicador de urgência**: a aba Tarefas tem um vocabulário visual claro (vermelho=atrasado, âmbar=hoje) que **não se propaga** para o card do kanban nem para a lista de tarefas dentro do modal de negócio — o mesmo dado, tratado três vezes, com dois níveis de acabamento diferentes.
- **Ação "definir padrão/principal"**: em Contatos é uma estrela+badge; em Funis é um link de texto. Mesmo conceito ("isto é o item principal/padrão"), duas soluções visuais.

---

## Top 3 ações (maior impacto ÷ esforço) — ✅ implementadas em 2026-07-18

1. ~~**Badge de urgência no card do kanban** (achado #1)~~ — feito.
2. ~~**Cor da etapa aplicada à coluna** (achado #3)~~ — feito.
3. ~~**Concluir tarefa direto do card** (achado #2)~~ — feito.

Esses três, juntos, cobriram a queixa central: o kanban passa a **sinalizar** o que precisa de atenção (não só arquivar posição) e a **agir** sem modal. Build verde (`tsc` + `eslint`) e verificado com renderização real (screenshots + fluxo de conclusão de tarefa testado ponta a ponta, sem erros de console).

**Próxima rodada (achados #4–#11, ainda em aberto, por impacto):**
1. Filtro/segmentação no board (#5) — necessário antes do volume de negócios crescer.
2. Board não ocupa o espaço disponível (#4) — colunas mais largas / mais densidade por card.
3. Empty state da Timeline fora do padrão (#6) — trocar pela `EmptyState` catalogada.
4. Hierarquia de urgência na lista de Tarefas do modal (#7) e scroll interno da seção (#8).
5. Polimento: botão "Definir padrão" dos Funis (#9), cor nas métricas do funil (#10), tamanho de alvos de clique (#11).
