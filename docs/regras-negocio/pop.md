# Brief de Módulo — POP (Procedimento Operacional Padrão)

> Especificação de negócio do módulo, escrita antes da implementação (`/novo-modulo` lê este arquivo).
> **Revisão 2:** POP deixou de ser escopada por projeto — é uma entidade **global** do ERP (catálogo único, reutilizável por qualquer projeto). Só o vínculo de uso (`TaskPop`) é que amarra uma POP a uma task específica, de um projeto específico.

---

## 1. Propósito

- **Em uma linha:** catálogo global e versionado de procedimentos operacionais padrão, que qualquer task de qualquer projeto pode referenciar quando executa um procedimento.
- **Persona principal:** 🔬 colaborador de bancada (usa a POP ao executar uma task) e 🧭 gestor (mantém o catálogo de POPs atualizado).
- **Substitui hoje:** PDFs soltos em pasta compartilhada/Notion, sem histórico de revisão nem rastro de quem usou qual versão em qual atividade.
- **Dor que resolve:** procedimento sem controle de versão gera dúvida sobre qual revisão foi seguida numa atividade já executada — crítico em biotecnologia (rastreabilidade de método). Ser global evita recriar a mesma POP em cada projeto que a usa.

## 2. Entidade e campos

### `Pop` (identidade do procedimento — título estável através das revisões, **global**, sem projeto)

| Campo | Tipo | Obrigatório? | Default | Regra / validação | Unidade |
|---|---|---|---|---|---|
| `title` | string | sim | — | 1-200 chars | — |
| `description` | string | não | — | até 2000 chars | — |

- **Campos automáticos:** `id` (cuid), `createdAt`, `updatedAt`, `deletedAt`.
- **Soft delete?** sim — POP pode ter sido usada em tasks já concluídas, de qualquer projeto; excluir de verdade apagaria o histórico de rastreabilidade dessas tasks.

### `PopVersion` (revisão imutável de conteúdo — nunca editada após criada)

| Campo | Tipo | Obrigatório? | Default | Regra / validação | Unidade |
|---|---|---|---|---|---|
| `popId` | string (FK Pop) | sim | — | — | — |
| `versionNumber` | int | sim | próximo da sequência | único por `popId`, sequencial a partir de 1 | — |
| `changeNotes` | string | não | — | o que mudou nesta revisão, até 1000 chars | — |
| `fileUrl` | string | não | `null` | **upload de PDF não implementado ainda** — campo existe no schema, sem lógica de gravação/leitura de arquivo nesta fase | — |
| `createdById` | string (FK User) | sim | — | quem autorou esta revisão | — |

- **Campos automáticos:** `id` (cuid), `createdAt`. Sem `updatedAt`/`deletedAt` — versão é imutável, nunca editada nem apagada isoladamente.
- **Soft delete?** não — imutabilidade é a garantia; histórico preservado por definição.

### `TaskPop` (registro de uso de uma POP numa Task — join real, não string solta)

| Campo | Tipo | Obrigatório? | Default | Regra / validação | Unidade |
|---|---|---|---|---|---|
| `taskId` | string (FK Task) | sim | — | — | — |
| `popVersionId` | string (FK PopVersion) | sim | — | a versão referenciada precisa existir e não estar de uma POP soft-deletada — sem restrição de projeto, POP é global | — |
| `addedById` | string (FK User) | sim | — | quem vinculou a POP a esta task | — |

- **Campos automáticos:** `id` (cuid), `createdAt`.
- **Soft delete?** não — é um link; remover é excluir a linha (a rastreabilidade histórica fica no `AuditLog`).
- **Unicidade:** `@@unique([taskId, popVersionId])` — mesma versão não é linkada duas vezes na mesma task.

## 3. Relações

- **Pertence a `Project`?** **não** — `Pop` é global, rota `/pops` (sem `:projectId`). `PopVersion` é aninhada sob `Pop` (`/pops/:popId/versions`). `TaskPop` é aninhada sob `Task`, que é aninhada sob `Project` (`/projects/:projectId/tasks/:taskId/pops`) — o vínculo de uso é que é project-scoped (via task), não a POP em si.
- **Aninhado sob outro pai?** `PopVersion` sob `Pop` (toda ação valida `popId` da URL); `TaskPop` sob `Task` (toda ação valida `taskId` da URL — sem checar projeto da POP, porque POP não tem projeto).
- **Outras relações:** `PopVersion.popId → Pop` (`onDelete: Cascade`), `PopVersion.createdById → User` (sem cascade), `TaskPop.taskId → Task` (`onDelete: Cascade`), `TaskPop.popVersionId → PopVersion` (sem cascade), `TaskPop.addedById → User`.

## 4. RBAC por ação (matriz)

| Ação | Papéis permitidos | CLIENTE pode? |
|---|---|---|
| listar POPs / ver uma / ver histórico de versões | ADMIN, APROVA, INSERE, CONSULTA | **não** — catálogo interno, sem `ProjectAccess` pra filtrar algo que não tem projeto |
| criar POP (gera v1) | INSERE, APROVA | não |
| editar título/descrição da POP | INSERE, APROVA | não |
| criar nova versão | INSERE, APROVA | não |
| excluir POP (soft delete) | APROVA | não |
| vincular/desvincular POP a uma task | INSERE, APROVA | não |

ADMIN sempre passa, independente do decorator (`RolesGuard` já garante isso globalmente). CLIENTE nunca vê POP — é operação interna, não faz parte do portal do cliente.

## 5. Regras de negócio / invariantes

- **Sempre existe pelo menos uma versão:** criar uma `Pop` sempre cria `PopVersion` v1 na mesma transação — não existe POP sem conteúdo.
- **Imutabilidade de versão:** depois de criada, `PopVersion` nunca é editada (sem endpoint de `PATCH`/`PUT` para versão). Corrigir algo = criar versão nova.
- **`versionNumber` sequencial:** calculado como `max(versionNumber) + 1` dentro da `Pop`, nunca reaproveitado.
- **POP é global:** qualquer task, de qualquer projeto, pode vincular qualquer `PopVersion` — não há checagem de projeto (diferente de `TaskDependency`, que exige mesma task/projeto).
- **Task registra a versão exata:** `TaskPop` referencia `popVersionId`, nunca `popId` — se a POP ganhar versões novas depois, o vínculo histórico da task não muda.

## 6. Ações além do CRUD

- **Criar nova versão** (`POST /pops/:popId/versions`) — recebe `changeNotes?`/`fileUrl?`, calcula o próximo `versionNumber`, grava `createdById` = usuário autenticado.
- **Vincular POP à task** (`POST /projects/:projectId/tasks/:taskId/pops`) — recebe `popVersionId`, valida que a task pertence ao projeto da URL e que a versão existe (não soft-deletada), grava `addedById`.
- **Desvincular** (`DELETE /projects/:projectId/tasks/:taskId/pops/:linkId`) — escopado pela task (mesmo padrão de `removeDependency`).

## 7. Saída (output DTO)

- **Pop, listagem:** `id, title, description, latestVersion: {id, versionNumber, createdAt, createdBy}, createdAt`.
- **Pop, detalhe:** o acima + `versions: [{id, versionNumber, changeNotes, fileUrl, createdBy:{id,name}, createdAt}]` (todas as versões, mais recente primeiro).
- **Task, campo `pops`:** `[{id, popVersion: {id, versionNumber, pop: {id, title}}, addedBy: {id,name}, createdAt}]`.
- **NUNCA pode aparecer:** POP soft-deletada em listagem ativa, hash de senha (nenhum campo de `User` além de `id`/`name` deve vazar).
- **Mapper de saída:** sim — `pop.mapper.ts`, seguindo o padrão de `risk.mapper.ts`.

## 8. Erros esperados

- **Não encontrado (404):** `Pop`/`PopVersion` inexistente ou soft-deletada; task inexistente ao vincular.
- **Sem permissão (403):** CLIENTE tentando qualquer rota de `/pops`; qualquer papel sem `INSERE`/`APROVA`/`ADMIN` tentando escrever.
- **Conflito (409):** — (sem unicidade de negócio além do `@@unique` técnico).
- **Validação (400):** `title` vazio/>200 chars.

## 9. Exemplo concreto

```json
// POST /pops
{ "title": "Limpeza e sanitização de bancada", "description": "Procedimento padrão de biossegurança nível 1" }

// resposta: Pop criada + v1 (sem projectId — é global)
{
  "id": "clxpop001...",
  "title": "Limpeza e sanitização de bancada",
  "description": "Procedimento padrão de biossegurança nível 1",
  "latestVersion": { "id": "clxver001...", "versionNumber": 1, "createdAt": "2026-07-19T12:00:00Z", "createdBy": { "id": "clxuser...", "name": "Miguel" } }
}

// POST /projects/clxproj.../tasks/clxtask.../pops — usar a POP acima nessa task
{ "popVersionId": "clxver001..." }
```

## 10. Fora de escopo (YAGNI)

- Upload/armazenamento real de PDF — só o campo `fileUrl` existe; a lógica de upload fica para quando for pedida.
- Aprovação formal de POP (fluxo tipo `Charter.approve`) — não foi pedido; se vier depois, é um campo `approvedById`/`approvedAt` em `PopVersion`.
- Categorização/taxonomia de POPs (por tipo de procedimento) — sem caso de uso concreto ainda.
- Diff visual entre versões — fora de escopo, o `changeNotes` textual já cobre o registro de mudança por enquanto.
- Portal do cliente ver POPs — é operação interna, CLIENTE nunca tem acesso.
