# Brief de Módulo — <Nome do Módulo>

> **O que é este arquivo:** a especificação de negócio de um módulo do ERP. É a fonte da verdade que `/novo-modulo` e `/ralph-loop` leem para implementar **fiel ao que a Bioinfood precisa** — não só tecnicamente correto. Preencha tudo antes de pedir o módulo. Um campo em branco = uma decisão que a IA vai chutar.
>
> Copie este arquivo para `docs/regras-negocio/<modulo>.md` (nome em inglês, singular: `sample.md`, `experiment.md`…) e preencha.

---

## 1. Propósito

- **Em uma linha:** <para que serve este módulo>
- **Persona principal:** 🧭 gestor / 🔬 colaborador de bancada / 👤 cliente <escolha>
- **Substitui hoje:** <qual planilha / aba do Notion / e-mail isso aposenta>
- **Dor que resolve:** <link para a dor em docs/analise-cientista.md, se houver>

## 2. Entidade e campos

> Tipos em termos de domínio (a IA mapeia para Prisma + DTO). Marque obrigatórios e validações.

| Campo | Tipo | Obrigatório? | Default | Regra / validação | Unidade |
|---|---|---|---|---|---|
| `<code>` | string | sim | — | único por projeto | — |
| `<collectedAt>` | datetime | sim | — | não pode ser data futura | — |
| `<volumeMl>` | number | não | — | > 0 | mL |
| `<status>` | enum(...) | sim | `<X>` | só transições válidas (ver §5) | — |
| ... | | | | | |

- **Campos automáticos (não listar acima):** `id` (cuid), `createdAt`, `updatedAt`, `deletedAt` se houver soft delete.
- **Soft delete?** sim / não — <justifique: tem relações ou histórico a preservar?>

## 3. Relações

- **Pertence a `Project`?** sim / não → se sim, rota é `/projects/:projectId/<modulo>` e tudo é escopado por projeto.
- **Aninhado sob outro pai?** <ex: pertence a uma Task> — se sim, **toda ação valida que o filho pertence ao pai da rota** (anti-IDOR).
- **Outras relações:** <com quais models, e `onDelete` (Cascade / SetNull / Restrict)>

## 4. RBAC por ação (matriz)

> Quem pode cada coisa. ADMIN sempre passa. CLIENTE só enxerga projetos em `ProjectAccess`.

| Ação | Papéis permitidos | CLIENTE pode? |
|---|---|---|
| listar | CONSULTA, INSERE, APROVA | só via ProjectAccess (leitura) |
| ver um | CONSULTA, INSERE, APROVA | só via ProjectAccess (leitura) |
| criar | INSERE, APROVA | não |
| editar | INSERE, APROVA | não |
| excluir | APROVA | não |
| `<ação custom>` | <papéis> | <sim/não> |

## 5. Regras de negócio / invariantes

> O que é **SEMPRE verdade**. É o que vira teste e o que separa "guardar dado" de "garantir regra".

- **Cálculos derivados:** <ex: `score = probabilidade × impacto`, recalculado no use-case a cada save>
- **Máquina de estado:** <ex: de `TODO` só vai para `IN_PROGRESS` ou `DONE`; nunca volta de `DONE`>
- **Unicidade:** <ex: `code` único dentro do projeto>
- **Obrigatório quando:** <ex: `response` é obrigatório se `score >= 16`>
- **Anti-IDOR:** sub-recurso sempre validado como pertencente ao `:projectId`/pai da rota.
- **Outras invariantes:** <...>

## 6. Ações além do CRUD

> Endpoints especiais. Deixe vazio se for só CRUD.

- `<aprovar>` — <o que faz, quem pode, o que muda no estado>
- `<reordenar>` — <...>
- `<atribuir responsável>` — <...>

## 7. Saída (output DTO)

- **Aparece na resposta:** <lista de campos expostos>
- **NUNCA pode aparecer:** dado de outro projeto, campo interno, qualquer segredo. <liste o que filtrar>
- **Mapper de saída:** sim (todo módulo novo expõe via mapper, não a linha crua do Prisma).

## 8. Erros esperados

- **Não encontrado (404):** <quando>
- **Sem permissão (403):** <quando — inclui CLIENTE sem ProjectAccess e sub-recurso de outro projeto>
- **Conflito (409):** <ex: code duplicado>
- **Validação (400):** <campos inválidos via class-validator>

## 9. Exemplo concreto

> Um registro real preenchido. **Isto vale mais que toda a prosa acima** — desambígua tipos, formatos e o que é obrigatório de fato.

```json
{
  "code": "AM-2026-001",
  "collectedAt": "2026-06-20T14:30:00Z",
  "volumeMl": 12.5,
  "status": "RECEIVED",
  "projectId": "clx..."
}
```

## 10. Fora de escopo (YAGNI)

> O que **não** entra agora, de propósito, para não inflar o módulo.

- <ex: rastreabilidade de cadeia de custódia — fica para depois>
