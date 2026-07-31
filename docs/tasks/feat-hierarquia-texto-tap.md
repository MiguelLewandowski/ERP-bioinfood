---
tipo: feature
escopo: web   # palpite
complexidade: alta   # palpite
status: feito
criada: 2026-07-28
tema: projeto-tap
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Adicionar ordenação e hierarquia de texto nas caixas do TAP

## Anotação original
> Adicionar ordenação e hierarquia de texto nas caixas do TAP

## Alvo provável
Os campos narrativos do `Charter` (`problem`, `justification`, `assumptions`, `scope`, `deliverables`, `governance`, `dependencies` — `apps/api/prisma/schema.prisma:743-790`) são `String?` renderizados em textarea em `charter/_components/charter-client.tsx`.

## O que precisa ser investigado
- "Hierarquia de texto" = editor rico (negrito, títulos, listas aninhadas) ou só bullets/numeração simples? Muda completamente o tamanho da tarefa.
- "Ordenação" = reordenar itens **dentro** de uma caixa, ou reordenar as **caixas/seções** do TAP? A anotação é ambígua.
- Se for editor rico: formato de persistência (Markdown vs HTML vs JSON), sanitização contra XSS (`/seguranca`), e impacto na impressão do TAP.
- Depende da mesma decisão de editor da tarefa [[feat-modulo-anotacoes-pessoais]] — devem usar o mesmo componente.
- Provável candidata a `/planejar` em vez de tarefa direta.

---

## ✅ Resolvido em 2026-07-30

**Editor escolhido: Tiptap v3** (MIT, ProseMirror, React 19 nativo, *headless*),
persistindo **HTML sanitizado no servidor**. Decisão do Miguel depois de comparar com
BlockNote: o pedido cobre oito campos de formulário **e** uma página de notas, e só o
Tiptap serve os dois com um componente. O BlockNote ganharia se fosse só o bloco de
notas — a experiência dele é melhor —, mas ele não encolhe bem para dentro de um campo
de três linhas.

Custo aceito conscientemente: sem menu `/` nem arrastar blocos. As anotações ficam mais
perto de um Google Docs enxuto do que do Notion, e era isso que o Miguel preferia.

- Componente único: `apps/web/components/ui/rich-text-editor.tsx` (prop `compact` alterna
  barra mínima / completa) + `rich-text-content.tsx` para leitura.
- Sanitização: `apps/api/src/common/sanitize/rich-text.ts`, allowlist estrita, chamada na
  camada de aplicação (`UpsertCharterUseCase` e o use case das notas).
- 12 campos narrativos do TAP viraram ricos. `MaxLength` do DTO subiu de 4000 para 20000
  — markup consome o mesmo orçamento de caracteres, e manter 4000 faria um TAP que já
  cabia passar a ser rejeitado só por ganhar formatação.
- Export em PDF (`lib/charter-report.ts`) injeta o HTML dos campos ricos sem escapar, com
  CSS de impressão para `h2/h3/ul/ol/li`. Campo sem tag nenhuma continua escapado.
- Sem migration: as colunas são `String?` e texto puro é HTML válido.

**Ambiguidade da anotação, resolvida pela metade e de propósito.** "Ordenação" podia ser
reordenar itens *dentro* da caixa ou reordenar as *seções* do TAP. O editor resolve o
primeiro sentido (listas ordenadas e aninhadas, Tab/Shift+Tab). **Reordenar as seções do
TAP não foi feito** — é outra tarefa, não um detalhe desta.

> ⚠️ Ao mexer no editor: a marca que ele gera precisa existir na allowlist do servidor.
> Marca que o editor produz e o sanitizador não conhece **some no primeiro salvamento**,
> sem erro nenhum na tela.
