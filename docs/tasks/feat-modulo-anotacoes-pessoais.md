---
tipo: feature
escopo: api   # palpite
complexidade: alta   # palpite
status: feito
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

---

## ✅ Resolvido em 2026-07-30

**A pergunta de privacidade foi decidida pelo Miguel: pessoal MESMO.** Só o dono lê —
**nem ADMIN**. É a primeira e única exceção desse tipo no ERP, e foi tomada com
consciência de que contraria a leitura ingênua do "ADMIN sempre passa no RolesGuard".

### Como a exceção foi construída (importa entender antes de mexer)

O `RolesGuard` **não mudou**. Ele continua deixando ADMIN passar por design; abrir
exceção lá afetaria todos os outros módulos. A garantia veio de **não existir caminho**:

- `ownerId` **nunca** é parâmetro de entrada — vem sempre do JWT via `@CurrentUser()`;
- a interface do repositório (`notes.repository.interface.ts`) obriga `ownerId` como
  primeiro argumento em **todo** método. Não existe `findById(id)` sem dono, então não há
  como esquecer de filtrar sem o compilador reclamar;
- não há listagem global, nem DTO com `ownerId`, nem export do repositório para outros
  módulos;
- a escrita usa `updateMany` com o `ownerId` **dentro do próprio UPDATE**, em vez de
  buscar-e-depois-escrever, que abriria janela entre as duas chamadas;
- nota alheia devolve **404, nunca 403** — um 403 confirmaria que a nota existe.

Isso não contradiz o RBAC: o guard governa **papel**, e aqui a trava é de **posse**, que
é filtro de dado. São camadas diferentes.

### O furo que quase passou

O `AuditInterceptor` grava o corpo da resposta em `AuditLog.after` — tabela que o ADMIN
lê. Sem tratar, cada `PATCH` arquivaria o texto da nota lá, e a privacidade teria uma
porta dos fundos. `notes` entrou em `CONTENT_REDACTED_ENTITIES`: a trilha registra que
alguém criou ou apagou uma anotação, **não o que estava escrito**.

### Escopo entregue

Nota **global do usuário** (sem vínculo com projeto/tarefa), com título, conteúdo rico,
fixar no topo e busca local. Autosave com debounce de 1,2s; a aba avisa antes de fechar
com alteração pendente. Editor: o mesmo `RichTextEditor` de
[[feat-hierarquia-texto-tap]] (Tiptap), em modo completo.

Menu **sem restrição de papel** — todo usuário logado, inclusive CLIENTE, tem as próprias
anotações.

Fora do escopo, e de propósito: versionamento, compartilhamento e indexação no módulo
`search` (indexar conteúdo privado num índice global pediria cuidado próprio).

> ⚠️ **Qualquer endpoint futuro que aceite um `ownerId` vindo de fora quebra a garantia
> inteira.** Testes que documentam a regra: `manage-notes.use-case.spec.ts`, inclusive
> "should hide the note from ADMIN when the note belongs to someone else".
