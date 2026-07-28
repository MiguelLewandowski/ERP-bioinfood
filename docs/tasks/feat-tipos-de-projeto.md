---
tipo: feature
escopo: db   # palpite
complexidade: média   # palpite
status: triagem
criada: 2026-07-28
tema: projeto-tap
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Adicionar tipos de projeto (INTERNO, PARCERIA, CONTRATO, SERVIÇO, SUBVENÇÃO)

## Anotação original
> ADICIONAR TIPOS PROJETO
>
> INTERNO
> PARCERIA
> CONTRATO
> SERVIÇO
> SUBVENÇÃO

## Alvo provável
`Charter.projectType` já existe como `String?` livre (`apps/api/prisma/schema.prisma:747`) — o campo pode virar enum; falta decidir se o tipo pertence ao `Charter` ou ao `Project`.

## O que precisa ser investigado
- O tipo pertence ao **Project** (aparece na listagem/filtro de projetos) ou continua só no **Charter**? A anotação diz "TIPOS PROJETO", o schema tem o campo no Charter.
- `Charter.projectType` é `String?` livre: virar `enum ProjectType` exige migration de dados dos valores já gravados.
- Onde o campo é editado e exibido hoje no front (`charter/_components/charter-client.tsx`).
- Precisa filtrar/agrupar projetos por tipo na listagem?
- Os 5 valores são fechados ou é uma taxonomia editável (o ERP já tem padrão de taxonomia no CRM)?

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-tipos-de-projeto.md`.
