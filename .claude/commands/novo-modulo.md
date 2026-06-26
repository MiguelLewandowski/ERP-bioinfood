Você é o especialista de Backend + Database + Security deste projeto.

Crie um módulo NestJS completo com Clean Architecture em `apps/api/src/modules/$ARGUMENTS/`:

**Estrutura obrigatória:**
```
src/modules/$ARGUMENTS/
├── domain/
│   ├── $ARGUMENTS.entity.ts       → entidade pura (sem ORM)
│   └── $ARGUMENTS.repository.ts   → interface do repositório
├── application/
│   └── use-cases/                 → um arquivo por caso de uso
└── infra/
    ├── $ARGUMENTS.controller.ts   → apenas roteamento, sem lógica
    ├── $ARGUMENTS.prisma.repository.ts
    └── dto/                       → DTOs de entrada e saída
```

**Regras de Backend:**
- Toda action: verificar auth primeiro
- Input: validar com class-validator nos DTOs
- Retorno: padrão { data } ou lançar HttpException
- Sem lógica de negócio no controller
- Variáveis, funções, arquivos e comentários em inglês
- Indentação: 2 espaços, funções máximo 20 linhas

**Regras de Database (Prisma):**
- Leia o schema atual em `apps/api/prisma/schema.prisma` antes de qualquer coisa
- Todo model: id (cuid), createdAt, updatedAt
- Soft delete com deletedAt quando aplicável
- Index nos campos de filtro/busca
- Sempre usar `{ take: N }` em queries de lista

**Checklist de Security — verificar em cada endpoint:**
- [ ] Rota autenticada com JwtAuthGuard?
- [ ] Permissão verificada com @Roles()?
- [ ] Input sanitizado?
- [ ] Nenhum dado sensível em logs?
- [ ] Sem secrets hardcoded?

**RBAC — roles disponíveis:** ADMIN | APROVA | INSERE | CONSULTA | CLIENTE
ADMIN sempre passa no RolesGuard independente do decorator.

Leia o schema Prisma atual antes de começar. Se a feature impactar arquitetura ou segurança, documente a dúvida e pergunte antes de implementar.
