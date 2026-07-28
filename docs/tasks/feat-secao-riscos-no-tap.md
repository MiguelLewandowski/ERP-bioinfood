---
tipo: feature
escopo: web   # palpite
complexidade: baixa   # palpite
status: triagem
criada: 2026-07-28
tema: projeto-tap
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Criar seção de Riscos no TAP, com atalho para a aba Riscos

## Anotação original
> CRIAR PARTE DE RISCOS NO TAP, LINKAR PARA IR PARA A ABA RISCOS QUANDO ENTRAR EM RISCOS NO TAP EM UM BOTAO, E SE NAO FOR ADICIONAR SÓ MOSTRAR OS RISCOS QUE EXISTEM CADASTRADOS NESSA ABA DO TAP

## Alvo provável
`apps/web/app/(dashboard)/projects/[id]/charter/_components/charter-client.tsx` (nova seção) consumindo os riscos já existentes de `apps/web/app/(dashboard)/projects/[id]/risks/` — modelo `Risk` (`apps/api/prisma/schema.prisma:913`).

## O que precisa ser investigado
- O TAP **não ganha** campo de risco próprio: a seção é uma leitura (read-only) dos `Risk` do projeto + botão "Gerenciar riscos" que navega para a aba. Confirmar que é isso mesmo que foi pedido.
- Quais colunas mostrar na seção (título, probabilidade, impacto, score, responsável) e se ordena por `score`.
- O que exibir quando não há risco cadastrado (estado vazio com CTA para a aba).
- A seção entra na impressão/exportação do TAP?
- Existe endpoint que devolva os riscos junto do charter, ou é uma segunda chamada.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-secao-riscos-no-tap.md`.
