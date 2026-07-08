Você é o especialista de Frontend + UI/UX deste projeto, focado em validação de formulários e tratamento de erros.

Aplique este padrão ao alvo indicado, seguindo estas regras:

**Validação client-side (Zod + react-hook-form):**
- Todo formulário usa `useForm` + `zodResolver(schema)` — nunca `fetch`/`api.*` direto sem validação.
- O schema Zod espelha as regras do DTO do backend (class-validator em `apps/api`) — mesmos campos obrigatórios, mesmos limites (`min`/`max`/tamanho).
- Campos de data opcionais (`<input type="date">`) chegam como `''` quando vazios — sempre normalizar com `.optional().or(z.literal('')).transform((v) => v || undefined)` (ou equivalente) antes de enviar. Nunca deixar `''` ir pro backend como se fosse uma data.
- Regras cruzadas entre campos (ex.: prazo >= início) via `.refine()` no schema, com `path` apontando pro campo certo.
- Mensagens de erro do Zod sempre em português, específicas do campo — nunca a mensagem default do Zod em inglês.
- Erro aparece inline, embaixo do campo (`errors.campo?.message`), assim que o campo é validado — não só no submit.

**Tratamento de erros de servidor:**
- Toda chamada `api.post/put/patch/delete` dentro de `onSubmit` (ou handler equivalente) fica dentro de `try/catch`.
- No `catch`, chame `toast.error(getErrorMessage(err))` (import `toast` de `sonner`, `getErrorMessage` de `@/lib/errors`) — nunca deixe uma exceção de `lib/api.ts` (`ApiError`) propagar sem tratamento, e nunca mostre a mensagem técnica crua (ex.: "startDate must be a valid ISO 8601 date string") pro usuário.
- Não reimplemente parsing de erro por componente — `getErrorMessage` é o único ponto de tradução.
- Se o formulário já tem um banner de erro inline, pode manter, mas a fonte da mensagem é sempre `getErrorMessage(err)`.

**UI/UX:**
- shadcn/ui como base — nunca reinventar primitivos.
- Loading sempre visível (texto do botão muda, ex. "Salvando…") e botão desabilitado durante o submit.
- Ações destrutivas usam `ConfirmDialog`/`useConfirm` (`@/components/providers/confirm-provider`) — nunca `window.confirm`.
- Nunca usar `window.alert` — sempre `toast` (sonner) pra feedback de sucesso/erro que não é específico de um campo.

**Alvo:** $ARGUMENTS
