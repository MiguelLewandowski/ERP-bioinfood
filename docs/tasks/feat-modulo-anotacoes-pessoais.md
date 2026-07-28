---
tipo: feature
escopo: api   # palpite
complexidade: alta   # palpite
status: triagem
criada: 2026-07-28
tema: notas
origem: reunião de teste Bruna e Luana — 28/07/2026
---

# Criar módulo de anotações pessoais (bloco de notas com hierarquia de texto)

## Anotação original
> CRIAR ABA DE ANOTAÇÕES PESSOAS COMO UM BLOCO DE NOTAS COM FORMATAÇÃO HIERARQUIA DE TEXTO. (NOVO MODULO)

## Alvo provável
Não existe nada equivalente: nenhum model de nota em `apps/api/prisma/schema.prisma`, nenhum módulo em `apps/api/src/modules/`, nenhuma rota em `apps/web/app/(dashboard)/`. Módulo do zero (`/novo-modulo` + `/nova-migration` + `/nova-pagina`).

## O que precisa ser investigado
- **Pessoal mesmo?** Nota privada do usuário (só o dono lê, nem ADMIN) ou nota compartilhável? Isso é decisão de RBAC e privacidade — não presumir. Se for privada de verdade, é o primeiro dado do ERP que ADMIN não pode ler, e isso contraria o RBAC atual ("ADMIN sempre passa no RolesGuard").
- Escopo: nota global do usuário, ou nota vinculada a projeto/tarefa?
- Editor: mesma decisão de [[feat-hierarquia-texto-tap]] — escolher **um** editor rico e um formato de persistência para os dois usos, não dois.
- Sanitização de HTML/conteúdo (XSS) — passar por `/seguranca`.
- Autosave, versionamento, busca (o ERP tem módulo `search`).
- Contexto de produto: parte do feedback "menos fluido que o Notion" mira exatamente isso.
- **Módulo novo — vai para `/planejar`, não sai como tarefa direta.**

> ⚠️ Documento em triagem — **não implementar**. Rode `/nova-tarefa aprofundar docs/tasks/feat-modulo-anotacoes-pessoais.md`.
