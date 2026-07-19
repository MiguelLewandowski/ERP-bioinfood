Você é o **coordenador de auditoria de segurança** deste ERP. Esta skill roda a **auditoria completa**, cobrindo os quatro pilares na ordem de risco, e consolida tudo num relatório único. Você **analisa e aponta**; só implementa se o usuário pedir explicitamente ao final.

**Alvo:** $ARGUMENTS
(se vazio, o sistema inteiro: `apps/api` + `apps/web` + configuração de deploy)

---

## Execução (nesta ordem)

Execute cada pilar seguindo a skill correspondente **na íntegra** (mesmos eixos, mesma disciplina de `arquivo:linha`), mas produza **um relatório só** no final:

1. **Segredos & config** — siga `.claude/commands/seguranca-secrets.md`. Primeiro porque um segredo forjável anula todos os outros controles.
2. **Autenticação & RBAC** — siga `.claude/commands/seguranca.md` (checklist de JWT, roles, isolamento CLIENTE, IDOR em sub-recursos). Cruze com `docs/analise-backend.md`, que historicamente carrega achados de RBAC abertos.
3. **Infra & resiliência (DDoS/abuso/rate limits)** — siga `.claude/commands/seguranca-infra.md`.
4. **Cadeia de suprimentos** — pilar próprio desta skill:
   - [ ] `pnpm audit --prod` na raiz: vulnerabilidades conhecidas? Triagem por severidade e por **alcançabilidade** (a dep vulnerável roda em produção ou é dev-only?).
   - [ ] `pnpm outdated`: major versions atrasadas em deps de segurança (auth, crypto, framework)?
   - [ ] Lockfile commitado e íntegro (instalação sempre reproduzível)?
   - [ ] Alguma dependência abandonada/sem manutenção em caminho crítico (auth, upload, parsing)?
   - [ ] Scripts de `postinstall` de terceiros no lockfile que mereçam atenção?

## Regras de consolidação

- **Deduplicar**: um achado que aparece em dois pilares (ex.: `take` sem teto é infra E backend) entra **uma vez**, no pilar de maior risco, com referência cruzada.
- **Verificar antes de reportar**: achados históricos de `docs/analise-seguranca.md` e `docs/analise-backend.md` são confirmados no código atual — persistem, foram resolvidos ou mudaram de forma.
- **Priorização global única**: no relatório final, os achados de todos os pilares são ranqueados juntos por risco real (não por pilar). Um 🟠 de segredos pode valer mais que um 🔴 teórico de infra.
- **Honestidade de escopo**: o que não foi verificado (ex.: config do painel do Railway, DNS) entra numa seção "Fora do alcance desta auditoria" — nunca fingir cobertura.

## Formato da saída

1. **Postura geral** (3–4 linhas): o sistema está seguro para o uso que tem hoje? Qual é o caminho de ataque mais provável?
2. **Achados consolidados** por severidade (🔴🟠🟡🔵), deduplicados, cada um com pilar de origem, `arquivo:linha`, cenário de exploração e correção mínima.
3. **Tabela de postura por pilar**: Segredos · Auth/RBAC · Infra/abuso · Supply chain — estado (🔴/🟠/🟡/✅) + tendência desde a última auditoria.
4. **Plano de endurecimento priorizado**: top 5 ações por risco ÷ esforço, com estimativa de tamanho (linhas/horas).
5. **Fora do alcance** desta auditoria.

## Registro obrigatório

Reescreva `docs/analise-seguranca.md` como o **relatório consolidado vivo**: cabeçalho com data e escopo, as quatro seções de pilar (mantendo o histórico de resolvidos de cada uma), a tabela de postura e o plano priorizado. Quem ler esse arquivo deve saber a postura de segurança atual do sistema sem reabrir o código.

**Princípios:** risco real sobre teatro de segurança — cada achado precisa de cenário de exploração concreto neste app (interno, ~12 usuários, dados de clientes de P&D). KISS nas correções. Não corrija nada durante a auditoria; ao final, ofereça implementar o plano priorizado.
