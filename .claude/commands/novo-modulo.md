Você é o especialista de Backend + Database + Security deste projeto.

Crie um módulo NestJS **completo, fiel ao negócio e pronto para rodar** com Clean Architecture em `apps/api/src/modules/$ARGUMENTS/`.

---

## Passo 0 — Ler o brief de negócio (obrigatório)

A estrutura é convenção; o **comportamento** vem do brief. Antes de qualquer código:

1. Procure o brief em `docs/regras-negocio/$ARGUMENTS.md`.
   - **Se existir:** ele é a fonte da verdade — campos, RBAC por ação, invariantes, ações custom, saída e exemplo concreto saem de lá.
   - **Se não existir:** copie `docs/regras-negocio/_template.md`, pergunte ao usuário os pontos que faltam (especialmente **matriz de RBAC por ação**, **invariantes/cálculos/máquina de estado** e **um exemplo concreto**) e preencha o brief **antes** de implementar. Não chute regra de negócio.
2. Leia o schema atual em `apps/api/prisma/schema.prisma` e `CLAUDE.md` (RBAC, convenções).

---

## Estrutura obrigatória (Clean Architecture)

```
src/modules/$ARGUMENTS/
├── domain/
│   ├── $ARGUMENTS.entity.ts       → entidade pura (sem ORM/Nest/Prisma)
│   └── $ARGUMENTS.repository.ts   → interface do repositório + token de DI
├── application/
│   └── use-cases/                 → um arquivo por caso de uso (regra de negócio aqui)
└── infra/
    ├── $ARGUMENTS.controller.ts   → apenas roteamento, sem lógica
    ├── $ARGUMENTS.prisma.repository.ts
    ├── $ARGUMENTS.mapper.ts       → mapper de saída (NUNCA devolver a linha crua do Prisma)
    ├── $ARGUMENTS.module.ts       → providers + binding da interface ao repositório Prisma
    └── dto/                       → DTOs de entrada (class-validator) e de saída
```

## Regras de Backend

- Repositório acessado **por interface + token de DI** — nunca `PrismaService` direto no use-case.
- Regra de negócio mora no use-case (cálculos, máquina de estado, invariantes do §5 do brief). Controller **só roteia**.
- Input validado com class-validator nos DTOs (espelhando as validações do brief).
- Saída via **mapper** (`toXDto`) — exponha só o que o §7 do brief permite; nunca dado de outro projeto, campo interno ou segredo.
- Variáveis, funções, arquivos e comentários em inglês. Indentação 2 espaços, funções ≤ 20 linhas.

## Regras de Database (Prisma)

- Todo model: `id` (cuid), `createdAt`, `updatedAt`; `deletedAt?` se o brief pedir soft delete.
- `@index` nos campos de filtro/busca; `@@unique` para as regras de unicidade do brief.
- Toda query de lista com `{ take: N }` — nunca sem limite.
- Relações e `onDelete` conforme §3 do brief.
- **A alteração de schema é feita pela skill `/nova-migration`** (editar schema → `prisma validate` → `migrate dev --name <desc>` → revisar SQL → `generate`). **Nunca apague migrations.**

## Checklist de Security — em cada endpoint

- [ ] Rota autenticada (JwtAuthGuard global) — endpoint público só com `@Public()` justificado.
- [ ] `@Roles()` conforme a **matriz do §4 do brief** (ADMIN sempre passa).
- [ ] Recurso aninhado **valida posse do pai** (anti-IDOR): sub-recurso pertence ao `:projectId`/pai da rota — escope pelo `projectId`, não só pelo `id`.
- [ ] CLIENTE só acessa projeto em `ProjectAccess` (o `ProjectAccessGuard` cobre rotas `:projectId`).
- [ ] Input sanitizado; nada sensível em log; sem secrets hardcoded.

**RBAC — roles:** ADMIN | APROVA | INSERE | CONSULTA | CLIENTE.

## Passo final — Integrar e validar (não deixar pela metade)

1. **Registrar o módulo** em `apps/api/src/app.module.ts` (imports).
2. **Gerar a migration** via `/nova-migration` se houve mudança de schema.
3. **Testes** (régua do `/testes`): cobrir os invariantes de risco do §5 (RBAC, cálculos, máquina de estado, anti-IDOR).
4. **Verificar verde:** typecheck/build/testes passando.
5. Relatar o que ficou pronto e o que (se algo) precisa de decisão humana.

---

**Regra de ouro:** se uma decisão impactar arquitetura, banco ou segurança de forma ambígua, pare, documente a dúvida e pergunte antes de implementar. Se algo do brief estiver faltando, peça — não invente regra de negócio.

**Módulo a criar:** $ARGUMENTS
