---
tipo: bug
escopo: web
complexidade: baixa
status: concluída
concluida: 2026-07-29
criada: 2026-07-28
tema: qualidade
---

# Estabilizar a suíte web, que falha de forma não determinística sob carga

> ✅ **Concluída em 2026-07-29.** Os seis `userEvent.type` com 201 caracteres
> viraram `fireEvent.change`. **Nenhum `testTimeout` foi aumentado** — o
> paliativo do passo 5 não foi necessário.
>
> **Ressalva honesta sobre a verificação:** a instabilidade **não reproduziu**
> nesta máquina em nenhum momento — a suíte já vinha passando 100% antes da
> mudança, em várias execuções ao longo do dia. Então as 5 execuções verdes do
> critério de aceite **confirmam que a mudança não quebrou nada, mas não provam
> que ela consertou o que se propunha**: não houve vermelho para virar verde.
>
> O que sustenta a mudança é a análise de causa, que continua sólida (~800
> eventos e ~200 renders por teste, removidos), não a medição. Se a suíte voltar
> a falhar sob carga numa máquina mais lenta ou em CI, **reabrir esta tarefa em
> vez de subir o timeout** — a hipótese estaria incompleta, como o próprio doc
> previu na seção de riscos.
>
> **O segundo critério de aceite foi verificado por mutação:** removendo o
> `.max(200)` de quatro dos schemas, os quatro testes correspondentes ficaram
> vermelhos. Eles continuam testando o que diziam testar.

## Anotação original
> A suíte de teste do web falha de forma não determinística sob carga. Rodando
> `pnpm test` completo falham 11-12 testes em conjuntos DIFERENTES a cada
> execução; os mesmos arquivos rodados isolados passam. Padrão comum: testes que
> digitam 200+ caracteres com `userEvent.type` para exercitar limite de tamanho,
> estourando timeout quando a suíte roda em paralelo.

## Contexto

`docs/deploy.md` §2 manda rodar `pnpm test` como portão antes de promover
`develop` para `main`. `main` tem auto-deploy no Railway, então esse é o último
ponto de checagem antes de qualquer coisa ir ao ar.

Uma suíte que fica vermelha por acaso destrói o valor do portão: quem opera
aprende que vermelho não significa nada, e no dia em que uma falha for real ela
vai ser ignorada junto com o ruído. **O defeito não é o teste que falha — é o
portão que deixa de funcionar.**

## Comportamento atual

Rodando a suíte completa (`pnpm --filter web test`), 11-12 testes falham em
**conjuntos diferentes a cada execução**. Observado em 2026-07-28, três execuções:

| Execução | Falhas |
|---|---|
| 1 | 12 falhas — `project-dialog`, `crm/task-dialog`, `pops-client`, `risks-client`, `roadmap-client`, `task-form-dialog` |
| 2 | 11 falhas — conjunto diferente, `risks-client` com 3 em vez de 2 |
| 3 | 2 falhas — só `roadmap-client` |

Os mesmos arquivos rodados isoladamente passam:

```
npx vitest run "risks-client" "pops-client" "project-dialog"   →  32/32
npx vitest run "roadmap-client"                                →   9/9
```

Confirmado que **não é regressão de código**: a base sem alterações (via
`git stash`) falhava igual.

## Comportamento esperado

`pnpm test` verde de forma determinística. Uma falha passa a significar que algo
quebrou de verdade.

## Como reproduzir

1. `cd apps/web && npx vitest run` (suíte inteira, em paralelo)
2. Repetir 2-3 vezes
3. Resultado: conjuntos diferentes de falhas a cada rodada, sempre entre os seis
   arquivos da tabela abaixo · Esperado: mesmo resultado toda vez

## Causa provável

Seis arquivos de teste digitam 201 caracteres, **tecla a tecla**, com
`userEvent.type`, para exercitar o limite de 200 do zod:

| Arquivo | Linha |
|---|---|
| `apps/web/components/projects/project-dialog.test.tsx` | 62 |
| `apps/web/app/(dashboard)/crm/_components/task-dialog.test.tsx` | 90 |
| `apps/web/app/(dashboard)/pops/_components/pops-client.test.tsx` | 84 |
| `apps/web/app/(dashboard)/projects/[id]/risks/_components/risks-client.test.tsx` | 67 |
| `apps/web/app/(dashboard)/projects/[id]/roadmap/_components/roadmap-client.test.tsx` | 66 |
| `apps/web/app/(dashboard)/projects/[id]/_components/tasks/task-form-dialog.test.tsx` | 101 |

`userEvent.type` dispara o ciclo completo de eventos por caractere (keydown,
keypress, input, keyup) e cada um provoca re-render do react-hook-form. São ~800
eventos e ~200 renders por teste. Com os workers do Vitest competindo por CPU,
isso ultrapassa o timeout padrão de 5s.

**A evidência é forte:** o conjunto dos seis arquivos com `repeat(201)` é
exatamente o conjunto dos que falham. Nenhum arquivo sem `repeat(201)` falhou em
nenhuma execução.

Efeito colateral que reforça: quando o teste do limite estoura o timeout, o teste
seguinte no mesmo arquivo (`should create the X with the typed values`) costuma
cair junto — o `cleanup` do anterior não completou.

`apps/web/vitest.config.ts` não define `testTimeout`, então vale o padrão de 5s.

## Arquivos envolvidos

| Arquivo | O que muda |
|---|---|
| os seis `.test.tsx` da tabela acima | trocar `userEvent.type` por preenchimento direto no caso do texto longo |
| `apps/web/vitest.config.ts` | eventualmente `testTimeout`, se a troca acima não bastar |

## Plano de implementação

1. Num arquivo só (sugestão: `roadmap-client.test.tsx`, o que mais falha),
   substituir a digitação longa por `fireEvent.change`:
   ```ts
   fireEvent.change(screen.getByLabelText('Título *'), { target: { value: 'x'.repeat(201) } });
   ```
   O que o teste garante — o zod rejeitar acima de 200 — continua garantido: a
   validação roda no submit, não por tecla.
2. Rodar a suíte inteira 3 vezes e verificar que aquele arquivo parou de falhar.
3. Confirmado, replicar nos outros cinco.
4. Rodar a suíte completa 5 vezes seguidas. Zero falhas nas cinco.
5. **Só se ainda houver instabilidade**, aumentar `testTimeout` no
   `vitest.config.ts`. É paliativo: esconde lentidão em vez de removê-la, por
   isso vem por último.
6. `/testes` se for preciso reescrever mais do que a linha da digitação.

## Critérios de aceite

- [ ] Cinco execuções seguidas de `pnpm --filter web test` sem nenhuma falha
- [ ] Os seis testes de limite continuam **falhando** se o limite do zod for
      removido (ou seja: ainda testam o que diziam testar)
- [ ] Nenhum `testTimeout` global aumentado sem antes tentar a troca de digitação
- [ ] Build e testes verdes (`pnpm test`)

## Testes a escrever

Nenhum teste novo — a tarefa é sobre os que existem. A verificação é de
repetibilidade (passo 4), não de cobertura.

Para provar que o teste continua válido depois da mudança, comentar
temporariamente o `.max(200)` do schema e confirmar que o teste fica vermelho.

## Riscos e efeitos colaterais

- `fireEvent.change` não simula digitação real: não dispara `keydown`/`keyup`.
  Para o campo de texto longo isso é irrelevante (não há máscara nem handler de
  tecla nesses inputs), mas **não replique o padrão em campo mascarado** — o
  `MaskedInput` (`apps/web/components/ui/masked-input.tsx`) depende dos eventos
  de tecla.
- Se alguma falha sobrar fora dos seis arquivos, a hipótese está incompleta e
  vale reabrir a investigação em vez de subir o timeout.

## Decisões em aberto

Nenhuma.

## Fora de escopo

- Paralelismo do Vitest (`poolOptions`, `maxThreads`). Reduzir workers mascararia
  o problema e deixaria a suíte mais lenta para todo mundo.
- Os demais testes que usam `userEvent.type` com texto curto — não têm o
  problema.
