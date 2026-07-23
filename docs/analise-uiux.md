# Análise de UI/UX — ERP Bioinfood

**Data:** 2026-07-20 (verificação de delta) · **Escopo:** revisão dos 12 achados da passagem renderizada de 2026-07-19 contra o código atual + fluxos principais fora do CRM.

> **⚠️ Método desta passagem — SEM renderização real.** O Docker Desktop está instalado mas com o daemon parado; o Postgres local (5432) está fechado. Subir o stack completo (db + migrations + seed + api + web + automação de browser) não foi viável nesta sessão. Portanto **esta passagem é verificação de código**, não inspeção de pixels. Isso é adequado para o que faço aqui — quase todos os 12 achados anteriores são verificáveis no código (mapas de cor, adoção de `StatusBadge`, config do Gantt, alvo do redirect, filtros, itens de menu). **Não adicionei achados novos de hierarquia/contraste/espaçamento** — esses exigem ver a tela, e a última inspeção renderizada (2026-07-19) segue sendo a fonte para eles. Um item novo marcado *(confirmar renderizado)* precisa de olho na tela para fechar.

---

## Resumo

Boa evolução desde a passagem renderizada. **Os dois piores achados semânticos (o 🔴 das escalas de prioridade e o 🟠 do azul off-brand em Projetos) foram RESOLVIDOS**, junto com a hora-fantasma do Gantt — não há mais 🔴 em aberto. O que **persiste** é um conjunto de atritos de médio porte que a última rodada mapeou e ninguém fechou ainda: o Gantt ainda empilha dois CTAs (a toolbar da lib + o botão da página), o login ainda aterrissa em Projetos em vez do Dashboard, a lista de Projetos tem filtro de status **em dois lugares** no modo tabela, o "Término (est.)" continua verde mesmo prevendo atraso, e "Configurações" segue como página morta no menu. Tudo consistência/AI — corrigível sem redesign.

---

## Corrigido desde 2026-07-19 (verificado no código)

- ✅ **#1 (🔴 era crítico) — Escala de prioridade unificada.** `components/ui/priority-badge.tsx`: `LOW→neutral, MEDIUM→success, HIGH→accent(âmbar), CRITICAL→destructive`. Sem verde para prioridade máxima; mapas `PRIORITY_CONFIG` locais do kanban/backlog apagados (0 ocorrências). A mesma Task não muda mais de cor entre Atividades e Kanban/Backlog.
- ✅ **#2 (🟠) — Projetos usa `StatusBadge`.** `projects-table.tsx:132` e `project-card.tsx` renderizam `<StatusBadge>`; os `STATUS_COLORS` azuis locais sumiram. Dashboard e Projetos mostram o mesmo status com a mesma cor (azul off-brand eliminado).
- ✅ **#4 (🟠) — Datas do Gantt sem hora-fantasma.** `gantt-mapping.ts:42-48` (`fmtCol`) só anexa hora quando `getHours()/getMinutes() ≠ 0`; tarefa date-only mostra só `dd/mm/aa`.

---

## Achados que PERSISTEM

### 🟠 Alto

**#3 — Gantt ainda empilha dois CTAs / tema da biblioteca.**
`gantt-client.tsx:233` ainda monta o `<Toolbar api={api} />` do SVAR, e o header da página tem o próprio botão "Nova Tarefa" (`:109-115`). Continuam dois controles para a mesma ação. O tema `Willow` + `gantt-status.css` provavelmente já corrige as barras azuis do achado original, mas o **CTA duplicado persiste no código**. *(Confirmar renderizado: se a Toolbar do SVAR ainda exibe botão de adicionar.)*
**Correção:** ocultar a `<Toolbar>` interna (a página já tem o CTA) ou remover o botão do header e deixar só a toolbar — um dos dois, não os dois.

**#5 — Login aterrissa em `/projects`, não no Dashboard.**
`components/auth/login-form.tsx:38`: `router.push(... : '/projects')`. O Dashboard ("Seu dia de trabalho em um lugar só") continua sendo visto só por clique.
**Correção:** redirecionar pós-login para `/dashboard` (CLIENTE pode continuar caindo em projetos).

### 🟡 Médio

**#6 — Filtro de status duplicado na lista de Projetos (pior no modo tabela).**
`projects-client.tsx` renderiza **chips** de status (Todos | Planejamento | …); no modo tabela, `projects-table.tsx:73-78` renderiza **também** um `<select>` "Todos os status". Os dois filtram em cascata (os chips alimentam `filtered`, que a tabela re-filtra pelo próprio `status`) e há **dois contadores "X de Y"** (`projects-client.tsx:139` + `projects-table.tsx:147`). A tabela ganhou filtros úteis novos (busca, cliente, responsável) — bom —, mas o status ficou em dois lugares.
**Correção:** manter o status só nos chips (1 clique) e tirar o `<select>` de status da tabela; deixar na tabela só busca/cliente/responsável. Um contador só.

**#7 — "Término (est.)" sempre verde, mesmo prevendo atraso.**
`projects-table.tsx:137`: `text-primary` incondicional em `forecastEndDate`. Atraso previsto (est. > plan.) aparece na cor que o app usa para "positivo".
**Correção:** neutro por padrão; `text-destructive` quando est. > plan. É o dado que justifica a coluna existir.

**#8 — "Configurações" no menu global é página morta.**
`nav-items.ts:22` inclui `/settings` para **todos os papéis**; `settings/page.tsx` renderiza só "Em desenvolvimento". Confunde com Configurações *do projeto* e com Funis (config real do CRM).
**Correção:** remover o item do menu até a página existir, ou apontá-lo para o que já é configurável.

**#9 — Rótulo de eixo do Heatmap de Riscos mal orientado + legenda que pode não bater com as células.**
`risk-heatmap.tsx:74`: "← PROBABILIDADE" aparece **horizontal, no rodapé**, mas a probabilidade é o eixo **vertical** (linhas, `:44`). Os rótulos por linha (à esquerda) estão certos; o *título* do eixo é que está deslocado. **Novo (código):** as células usam hex cru (`cellColor`, `:12-15` — `#D64550`/`#DD8005`/`#FFB000`/`#86C175`) enquanto a **legenda** mistura hex cru com token (`:79-82` — `hsl(var(--accent))`, `hsl(var(--destructive))`). "Crítico" na legenda usa o token `destructive`; a célula usa `#D64550` — podem não ser a mesma cor. *(Confirmar renderizado: se swatch da legenda == cor da célula.)*
**Correção:** girar o título "PROBABILIDADE" para a vertical à esquerda; e alinhar legenda e células à mesma fonte de cor (idealmente tokens dos dois lados).

### 🔵 Baixo

**#10 — Calendário de Atividades: estado por dois canais (bolinhas na legenda × cor de fundo/texto nas barras).** Não reverificado sem render; provável que persista. Reavaliar com dados reais.

**#11 — Ações da tabela de Usuários misturam padrões.** `users-client.tsx`: ícones (editar/reset/acesso) + botão-texto "Desativar/Ativar" na mesma célula (`:143`). **Positivo:** todos os ícones têm `aria-label` (`:113,122,132`) e o toggle usa `ConfirmDialog` com o nome real. Só o híbrido visual permanece — padronizar (ex.: `dropdown-menu`) quando a tela for revisitada.

**#12 — Login sem caminho de "esqueci a senha".** `login-form.tsx` não tem microcopy de saída. Aceitável (reset via ADMIN), mas um "Esqueceu? Fale com o administrador" evita o beco sem saída. *(Nota: o input de login usa `focus:ring-green-600` em vez do token `ring` — foco levemente fora da marca.)*

---

## Inconsistências cross-tela

- **Cor por token além dos badges (persiste):** badges/status estão resolvidos, mas hex cru segue em data-viz e dados de UI (`risk-heatmap.tsx`, `kanban-client.tsx:29` `#46AD48`, `funis-client.tsx`, `charter-client.tsx`), incluindo `#D64550`/`#C0392B` **fora da paleta**. Do ponto de vista de UX, o risco é legenda×célula não baterem (#9). *(Detalhe estrutural completo em `docs/analise-frontend.md` A3.)*
- **Dois kanbans, duas linguagens** (CRM: barra colorida no topo + soma; projeto: dot + badge de contagem). Menor; se convergirem, usar o do CRM como referência.

## Top 3 ações (impacto ÷ esforço)

1. **#5 — Redirect pós-login para `/dashboard`** (1 linha em `login-form.tsx`). Devolve ao Dashboard a função de radar diário. Mínimo esforço, alto impacto percebido.
2. **#6 + #7 — Limpar a lista de Projetos**: tirar o `<select>` de status da tabela (fica só nos chips) e condicionar a cor do "Término (est.)" a atraso. ~30 min, resolve confusão de filtro + um dado que hoje engana.
3. **#3 — Gantt: um CTA só** (ocultar a toolbar da lib ou o botão do header). Tira o aspecto "de outro produto" da tela.

---

## Histórico

- **2026-07-19 (renderizado, Playwright, login ADMIN):** 12 achados. Desta lista, **#1/#2/#4 corrigidos** (verificado hoje no código); **#3/#5/#6/#7/#8/#9/#11/#12 persistem**; #10 não reverificado. Regressão do CRM (passagem 2026-07-18) reconfirmada como persistente naquela rodada.
- **2026-07-18 (renderizado, CRM completo):** 11 achados, todos implementados e verificados na mesma data (badge de urgência no card, cor da etapa na coluna, barra de filtro + "Meus negócios", empty state da Timeline, etc.). Detalhes no histórico git deste arquivo.
