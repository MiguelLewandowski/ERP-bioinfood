# Brief de Módulo — POP (Procedimento Operacional Padrão)

> Especificação de negócio do módulo, escrita antes da implementação (`/novo-modulo` lê este arquivo).

---

## 1. Propósito

- **Em uma linha:** documento versionado de procedimento operacional padrão, escopado por projeto, que as tasks referenciam quando executam um procedimento.
- **Persona principal:** 🔬 colaborador de bancada (usa a POP ao executar uma task) e 🧭 gestor (mantém as POPs atualizadas).
- **Substitui hoje:** PDFs soltos em pasta compartilhada/Notion, sem histórico de revisão nem rastro de quem usou qual versão em qual atividade.
- **Dor que resolve:** procedimento sem controle de versão gera dúvida sobre qual revisão foi seguida numa atividade já executada — crítico em biotecnologia (rastreabilidade de método).

## 2. Entidade e campos

### `Pop` (identidade do procedimento — título estável através das revisões)

| Campo | Tipo | Obrigatório? | Default | Regra / validação | Unidade |
|---|---|---|---|---|---|
| `projectId` | string (FK Project) | sim | — | — | — |
| `title` | string | sim | — | 1-200 chars | — |
| `description` | string | não | — | até 2000 chars | — |

- **Campos automáticos:** `id` (cuid), `createdAt`, `updatedAt`, `deletedAt`.
- **Soft delete?** sim — POP pode ter sido usada em tasks já concluídas; excluir de verdade apagaria o histórico de rastreabilidade dessas tasks.

### `PopVersion` (revisão imutável de conteúdo — nunca editada após criada)

| Campo | Tipo | Obrigatório? | Default | Regra / validação | Unidade |
|---|---|---|---|---|---|
| `popId` | string (FK Pop) | sim | — | — | — |
| `versionNumber` | int | sim | próximo da sequência | único por `popId`, sequencial a partir de 1 | — |
| `changeNotes` | string | não | — | o que mudou nesta revisão, até 1000 chars | — |
| `fileUrl` | string | não | `null` | **upload de PDF não implementado ainda** — campo existe no schema, sem lógica de gravação/leitura de arquivo nesta fase | — |
| `createdById` | string (FK User) | sim | — | quem autorou esta revisão | — |

- **Campos automáticos:** `id` (cuid), `createdAt`. Sem `updatedAt`/`deletedAt` — versão é imutável, nunca editada nem apagada isoladamente (só via cascade se a `Pop` inteira for removida do banco, o que não acontece com soft delete).
- **Soft delete?** não — imutabilidade é a garantia; histórico preservado por definição.

### `TaskPop` (registro de uso de uma POP numa Task — join real, não string solta)

| Campo | Tipo | Obrigatório? | Default | Regra / validação | Unidade |
|---|---|---|---|---|---|
| `taskId` | string (FK Task) | sim | — | — | — |
| `popVersionId` | string (FK PopVersion) | sim | — | a versão referenciada precisa pertencer ao mesmo `projectId` da task (anti-IDOR) | — |
| `addedById` | string (FK User) | sim | — | quem vinculou a POP a esta task | — |

- **Campos automáticos:** `id` (cuid), `createdAt`.
- **Soft delete?** não — é um link; remover é excluir a linha (a rastreabilidade histórica fica no `AuditLog`, já que o vínculo em si não é um documento).
- **Unicidade:** `@@unique([taskId, popVersionId])` — mesma versão não é linkada duas vezes na mesma task.

## 3. Relações

- **Pertence a `Project`?** sim (`Pop`) → rota `/projects/:projectId/pops`. `PopVersion` é aninhada sob `Pop` (`/projects/:projectId/pops/:popId/versions`). `TaskPop` é aninhada sob `Task`, que já é aninhada sob `Project` (`/projects/:projectId/tasks/:taskId/pops`).
- **Aninhado sob outro pai?** `PopVersion` sob `Pop` (toda ação valida `popId` da URL); `TaskPop` sob `Task` (toda ação valida `taskId` da URL **e** que `popVersionId` pertence ao mesmo projeto da task — mesmo padrão anti-IDOR de `TaskDependency`).
- **Outras relações:** `Pop.projectId → Project` (`onDelete: Cascade`), `PopVersion.popId → Pop` (`onDelete: Cascade`), `PopVersion.createdById → User` (sem cascade — histórico de autoria sobrevive mesmo se o usuário for desativado), `TaskPop.taskId → Task` (`onDelete: Cascade`), `TaskPop.popVersionId → PopVersion` (sem cascade — não é esperado apagar uma versão usada), `TaskPop.addedById → User`.

## 4. RBAC por ação (matriz)

| Ação | Papéis permitidos | CLIENTE pode? |
|---|---|---|
| listar POPs / ver uma / ver histórico de versões | qualquer papel autenticado | só via `ProjectAccess` (leitura) |
| criar POP (gera v1) | INSERE, APROVA | não |
| editar título/descrição da POP | INSERE, APROVA | não |
| criar nova versão | INSERE, APROVA | não |
| excluir POP (soft delete) | APROVA | não |
| vincular/desvincular POP a uma task | INSERE, APROVA | não |

ADMIN sempre passa, independente do decorator (`RolesGuard` já garante isso globalmente).

## 5. Regras de negócio / invariantes

- **Sempre existe pelo menos uma versão:** criar uma `Pop` sempre cria `PopVersion` v1 na mesma transação — não existe POP sem conteúdo.
- **Imutabilidade de versão:** depois de criada, `PopVersion` nunca é editada (sem endpoint de `PATCH`/`PUT` para versão). Corrigir algo = criar versão nova.
- **`versionNumber` sequencial:** calculado como `max(versionNumber) + 1` dentro da `Pop`, nunca reaproveitado mesmo se uma versão "errada" existir (não há delete de versão isolada).
- **Anti-IDOR:** `TaskPop.popVersionId` só é aceito se a `PopVersion` pertence a uma `Pop` do mesmo `projectId` da task da URL — mesma validação que `TaskDependency` já faz para predecessoras.
- **Task registra a versão exata:** `TaskPop` referencia `popVersionId`, nunca `popId` — se a POP ganhar versões novas depois, o vínculo histórico da task não muda.

## 6. Ações além do CRUD

- **Criar nova versão** (`POST /projects/:projectId/pops/:popId/versions`) — recebe `changeNotes?`/`fileUrl?`, calcula o próximo `versionNumber`, grava `createdById` = usuário autenticado.
- **Vincular POP à task** (`POST /projects/:projectId/tasks/:taskId/pops`) — recebe `popVersionId`, valida mesmo projeto, grava `addedById`.
- **Desvincular** (`DELETE /projects/:projectId/tasks/:taskId/pops/:linkId`) — escopado por projeto via join (mesmo padrão de `removeDependency`).

## 7. Saída (output DTO)

- **Pop, listagem:** `id, projectId, title, description, latestVersion: {id, versionNumber, createdAt, createdBy}, createdAt`.
- **Pop, detalhe:** o acima + `versions: [{id, versionNumber, changeNotes, fileUrl, createdBy:{id,name}, createdAt}]` (todas as versões, mais recente primeiro).
- **Task, campo `pops`:** `[{id, popVersion: {id, versionNumber, pop: {id, title}}, addedBy: {id,name}, createdAt}]`.
- **NUNCA pode aparecer:** POP de outro projeto, `deletedAt` de outra entidade solto, hash de senha (óbvio, mas nenhum campo de `User` além de `id`/`name` deve vazar).
- **Mapper de saída:** sim — `pop.mapper.ts`, seguindo o padrão de `risk.mapper.ts`.

## 8. Erros esperados

- **Não encontrado (404):** `Pop`/`PopVersion` inexistente ou soft-deletado.
- **Sem permissão (403):** `Pop` de outro projeto (troca de `popId` na URL); `CLIENTE` sem `ProjectAccess`; `popVersionId` de outro projeto ao vincular numa task.
- **Conflito (409):** — (sem unicidade de negócio além do `@@unique` técnico, que não deveria ser atingível pela UI).
- **Validação (400):** `title` vazio/>200 chars, `versionNumber` calculado automaticamente (não vem do client, não é validável por input).

## 9. Exemplo concreto

```json
// POST /projects/clx.../pops
{ "title": "Limpeza e sanitização de bancada", "description": "Procedimento padrão de biossegurança nível 1" }

// resposta: Pop criada + v1
{
  "id": "clxpop001...",
  "projectId": "clxproj...",
  "title": "Limpeza e sanitização de bancada",
  "description": "Procedimento padrão de biossegurança nível 1",
  "latestVersion": { "id": "clxver001...", "versionNumber": 1, "createdAt": "2026-07-19T12:00:00Z", "createdBy": { "id": "clxuser...", "name": "Miguel" } }
}

// POST /projects/clx.../tasks/clxtask.../pops
{ "popVersionId": "clxver001..." }
```

## 10. Fora de escopo (YAGNI)

- Upload/armazenamento real de PDF — só o campo `fileUrl` existe; a lógica de upload fica para quando for pedida.
- Aprovação formal de POP (fluxo tipo `Charter.approve`) — não foi pedido; se vier depois, é um campo `approvedById`/`approvedAt` em `PopVersion`.
- Categorização/taxonomia de POPs (por tipo de procedimento) — sem caso de uso concreto ainda.
- Diff visual entre versões — fora de escopo, o `changeNotes` textual já cobre o registro de mudança por enquanto.
