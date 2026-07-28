---
tipo: feature
escopo: db   # palpite
complexidade: média   # palpite
status: triagem
criada: 2026-07-28
tema: stakeholders
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Stakeholder: tornar o contato opcional e permitir digitar só o nome

## Anotação original
> EM stakeholder mudar a parte de contato para ser opcional, E PODER SÓ ESCREVER O NOME DO CONTATO SEM EXISTIR PREVIAMENTE

## Alvo provável
`ProjectStakeholder.contactId` é **obrigatório** e FK para `Contact` (`apps/api/prisma/schema.prisma:724-741`); a tela usa `projects/[id]/stakeholders/_components/contact-select.tsx`, que só deixa escolher contato já cadastrado.

## O que precisa ser investigado
- Duas saídas possíveis, e a escolha é do desenvolvedor: (a) `contactId` vira opcional + novo campo `name` livre no `ProjectStakeholder`; ou (b) o select cria um `Contact` novo na hora ("digitou, criou"). A (b) evita nome solto sem ficha, mas polui o CRM com contatos rasos.
- A `@@unique([projectId, contactId, type])` (linha 737) precisa de tratamento se `contactId` virar nulo — unique com NULL não protege duplicata.
- Impacto na matriz de stakeholders (`stakeholder-matrix.tsx`) e em quem lê o nome do stakeholder hoje via `contact`.
- Impacto no TAP: `Charter.projectOwnerId` também aponta para `Contact` — mesma dor?
- RBAC: criar contato a partir do projeto é permitido a PADRAO? O CRM hoje é restrito.
- **Mudança de schema — não decidir sozinho** (regra de ouro do `CLAUDE.md`).

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-stakeholder-contato-opcional.md`.
