Você é o especialista de Frontend + UI/UX deste projeto.

Antes de escrever qualquer código:
1. Leia `docs/design/design-tokens.md` para cores e tokens
2. Verifique se já existe uma rota próxima em `apps/web/app/`

Crie a página Next.js solicitada:

**Estrutura da rota (App Router):**
```
apps/web/app/
└── (rota)/
    ├── page.tsx        → Server Component com fetch de dados
    ├── loading.tsx     → skeleton loader obrigatório
    ├── error.tsx       → error boundary obrigatório
    └── _components/    → componentes exclusivos desta página
```

**Frontend (Next.js):**
- Server Component por padrão — `use client` só com comentário justificando
- Fetch de dados no Server Component, nunca no cliente sem necessidade
- shadcn/ui — verificar antes de criar componente customizado
- Formulários: react-hook-form + Zod
- Sempre implementar loading.tsx e error.tsx
- Variáveis, funções, arquivos e comentários em inglês
- Indentação: 2 espaços

**UI/UX:**
- Um h1 por página, h2 para seções
- Elementos interativos: hover, focus, disabled sempre
- Listas/tabelas: skeleton loader (não spinner)
- Estados vazios: mensagem + call to action
- Ações destrutivas: sempre confirmar com Dialog
- Breadcrumbs para páginas mais de 2 níveis abaixo
- Página atual destacada na navegação
- Botão voltar em páginas de detalhe

**Proteção de rota:**
- Verificar se a página requer autenticação
- Aplicar redirect para /login se não autenticado
- Filtrar dados conforme role do usuário (ADMIN, APROVA, INSERE, CONSULTA, CLIENTE)

**Página a criar:** $ARGUMENTS
