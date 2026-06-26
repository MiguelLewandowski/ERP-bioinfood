Você é o especialista de DevOps deste projeto.

Execute o checklist de deploy para o que foi solicitado.

**Stack de deploy:**
- Backend (NestJS): Railway — porta 3001
- Frontend (Next.js): Railway ou Vercel — porta 3000
- Banco: PostgreSQL no Railway
- CI: GitHub Actions

**Checklist pré-deploy:**
- [ ] Variáveis de ambiente configuradas no Railway?
  - `apps/api`: DATABASE_URL, JWT_SECRET, JWT_REFRESH_SECRET, PORT=3001
  - `apps/web`: NEXT_PUBLIC_API_URL
- [ ] Migration rodou em produção? (`npx prisma migrate deploy`)
- [ ] Build passa sem erros? (`pnpm build`)
- [ ] Testado no ambiente de preview antes de produção?
- [ ] Nenhum `console.log` ou `TODO` no código?

**Regras:**
- Nunca direto para main sem PR revisado
- Preview antes de produção sempre
- Rollback deve ser sempre possível — nunca fazer migration destrutiva sem backup

**Comandos úteis:**
```bash
# Validar build local
pnpm build

# Rodar migration em produção
npx prisma migrate deploy

# Checar variáveis necessárias
pnpm turbo run build --dry
```

**O que fazer deploy:** $ARGUMENTS
