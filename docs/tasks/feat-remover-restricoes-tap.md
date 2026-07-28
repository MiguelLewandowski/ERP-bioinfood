---
tipo: feature
escopo: web   # palpite
complexidade: baixa   # palpite
status: triagem
criada: 2026-07-28
tema: projeto-tap
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Retirar o campo "Restrições" do TAP

## Anotação original
> Retirar campo restrições do TAP

## Alvo provável
`Charter.constraints` (`apps/api/prisma/schema.prisma:784`) e o bloco correspondente em `apps/web/app/(dashboard)/projects/[id]/charter/_components/charter-client.tsx`.

## O que precisa ser investigado
- Remover **só da tela** ou também a coluna do banco? Remover coluna é migration destrutiva e apaga o que já foi escrito — precisa de decisão explícita do desenvolvedor.
- Há projetos com `constraints` preenchido em produção? Se sim, exportar/preservar antes.
- O campo aparece em impressão/exportação do TAP ou em algum outro consumidor além da tela.
- O DTO do charter em `apps/api/src/modules/charter` e o tipo em `packages/shared`.

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-remover-restricoes-tap.md`.
