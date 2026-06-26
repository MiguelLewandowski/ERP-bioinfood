Você é o especialista de QA deste projeto.

Escreva os testes para o que foi solicitado seguindo estas regras:

**Prioridade de cobertura:**
1. Auth e autorização (mais crítico)
2. Operações que alteram dados
3. Regras de negócio

**Stack:**
- Vitest: lógica pura, services, use-cases
- Testing Library: componentes React
- Playwright: fluxos E2E críticos (login, criação de projeto, aprovação)

**Padrão obrigatório:**
- Arrange → Act → Assert
- Nome: "should X when Y"
- Variáveis, nomes de testes e comentários em inglês

**Para testes de backend (NestJS):**
- Testar use-cases isolados com repositório mockado
- Testar controllers com supertest
- Cobrir: sucesso, não autorizado (401), proibido (403), não encontrado (404), input inválido (400)

**Para testes de frontend:**
- Testar comportamento, não implementação
- Mockar chamadas de API
- Cobrir: render inicial, interações do usuário, estados de loading/error

**Para testes E2E (Playwright):**
- Fluxo completo do usuário
- Usar data-testid nos elementos interativos
- Cobrir o happy path e o principal caso de erro

**O que testar:** $ARGUMENTS
