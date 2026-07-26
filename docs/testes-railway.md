# Roteiro de teste — ambiente Railway

Roteiro manual para validar o ERP depois de subir no Railway. Para hospedar, ver
[`docs/deploy-railway.md`](./deploy-railway.md).

Ordem proposta: **fumaça → sessão → RBAC → funcional → limpeza**. As três
primeiras seções pegam as falhas que quebram tudo; a funcional é longa e só vale
a pena depois que elas passam.

Substitua nos comandos:
- `$WEB` = `https://<seu-web>.up.railway.app`
- `$API` = `https://<sua-api>.up.railway.app`

Usuários do seed (senhas são as que você passou em `SEED_*_PASSWORD`):

| E-mail                   | Papel     | Enxerga                                    |
|--------------------------|-----------|--------------------------------------------|
| `admin@bioinfood.com`    | `ADMIN`   | tudo                                       |
| `lider@bioinfood.com`    | `PADRAO`  | todos os projetos; sem usuários, sem CRM    |
| `cliente@bioinfood.com`  | `CLIENTE` | só os projetos liberados em `ProjectAccess` |

---

## 1. Fumaça (2 minutos)

- [ ] `curl -s $API/health` → `{"status":"ok"}`
- [ ] `curl -s -o /dev/null -w "%{http_code}\n" $API/projects` → `401`
- [ ] `$WEB` abre a tela de login sem erro no console do navegador
- [ ] Login com o ADMIN entra e cai em `/projects`
- [ ] `railway logs --service api` não tem stack trace no boot

Se `/health` responder mas o login der "Serviço indisponível", o `web` está
apontando para a API errada — é o `NEXT_PUBLIC_API_URL` assado no build
(§7 do guia de deploy). Redeploy do `web`, não restart.

---

## 2. Sessão e cookies

O modelo é access token de 15min + refresh de 7d rotativo de uso único, com
detecção de reuso. É a parte mais fácil de quebrar sem perceber.

- [ ] **Cookies corretos.** DevTools → Application → Cookies em `$WEB`:
      `access_token` e `refresh_token` com `HttpOnly` ✅ e `Secure` ✅.
      Sem `Secure` significa `NODE_ENV` diferente de `production` no `web`.
- [ ] **Token não vaza para o cliente.** No console: `document.cookie` não mostra
      os tokens. Em "View source" da página, buscar por `eyJ` (começo de um JWT)
      não acha nada no payload RSC.
- [ ] **Chamadas passam pelo proxy.** Aba Network, navegando pelo app: as
      requisições vão para `$WEB/api/proxy/...`, nenhuma direto para `$API`.
- [ ] **Expiração renova sozinha.** Faça login, espere 15+ minutos, navegue para
      outra página. Esperado: um flash de "Renovando sessão…" e a página carrega.
      Falha: cair no login.
- [ ] **Logout revoga de verdade.** Antes de sair, copie o `refresh_token` do
      DevTools. Saia. Então:
      ```bash
      curl -s -X POST $API/auth/refresh -H "Content-Type: application/json" \
        -d '{"refreshToken":"<o token copiado>"}'
      ```
      Esperado: `401`. Se renovar, o logout não está revogando no banco.
- [ ] **Reuso derruba a sessão.** Logue de novo, copie o `refresh_token`, force
      uma renovação (espere os 15min ou chame `/api/auth/refresh` pelo console),
      e então mande o token **antigo** pelo curl acima. Esperado: `401` e a sessão
      do navegador também cai na próxima navegação — o backend trata reuso como
      roubo e revoga tudo do usuário.
- [ ] **Troca de senha obrigatória.** Crie um usuário novo pela tela de usuários,
      logue com ele: tem que ser empurrado para `/change-password` e não conseguir
      escapar navegando para outra rota.

> **Ponto de atenção conhecido.** Existem dois caminhos de renovação: o
> `apps/web/proxy.ts` (middleware) e o `SessionRefreshGate`. Os dois usam o mesmo
> refresh rotativo de uso único. Se durante os testes uma sessão cair sozinha sem
> motivo aparente, é aqui que se olha primeiro — uma corrida entre os dois
> dispararia a detecção de reuso e derrubaria todas as sessões do usuário.
> Anote como reproduziu.

---

## 3. RBAC — o que cada papel NÃO pode

Testes negativos importam mais que os positivos. Faça cada bloco numa janela
anônima separada para não misturar sessões.

### PADRAO (`lider@bioinfood.com`)

- [ ] A sidebar não mostra Usuários nem CRM
- [ ] Ir direto em `$WEB/users` → redireciona, não mostra a tela
- [ ] Ir direto em `$WEB/crm` → bloqueado
- [ ] Vê e edita todos os projetos, inclusive os que não criou
- [ ] Consegue criar projeto e aprovar TAP
- [ ] Exclusão de projeto é reversível (soft delete), sem opção de apagar definitivo

### CLIENTE (`cliente@bioinfood.com`)

- [ ] Em `/projects` aparecem **somente** os projetos liberados (o seed libera o
      `proj-001` e o projeto demo) — o `proj-002` não pode aparecer
- [ ] Pegue o id de um projeto que ele não acessa (com o ADMIN) e abra
      `$WEB/projects/<id>` como CLIENTE → negado, não "vazio"
- [ ] Pela API, o IDOR também tem que fechar:
      ```bash
      curl -s -o /dev/null -w "%{http_code}\n" $API/projects/<id-proibido> \
        -H "Authorization: Bearer <access token do cliente>"
      ```
      Esperado `403`/`404`, nunca `200`
- [ ] Sem Usuários, sem CRM, sem criar projeto

### ADMIN

- [ ] Acessa Usuários e CRM
- [ ] Consegue liberar acesso de projeto para o CLIENTE
- [ ] O diálogo de liberar acesso **não** oferece projetos cancelados
- [ ] Exclusão definitiva disponível

---

## 4. Funcional por módulo

### Projetos

- [ ] Criar projeto com cliente (organização) e datas
- [ ] TAP: preencher, salvar, aprovar — e conferir que o aprovador fica registrado
- [ ] EAP/WBS: criar nós aninhados
- [ ] Tarefas: criar, mover status, definir responsável e dependências
- [ ] Gantt: abre e renderiza sem erro de client-only
- [ ] Kanban: arrastar cartão persiste depois de recarregar
- [ ] Roadmap, Riscos, Partes interessadas: criar e editar um item em cada
- [ ] **Datas de dia inteiro.** Uma tarefa com vencimento em `2026-10-01` tem que
      mostrar `01/10` — não `30/09`. Esse é o bug clássico de timezone do projeto.
- [ ] Término previsto (`forecastEndDate`) reflete a maior data de vencimento das
      tarefas

### Atividades

- [ ] Calendário mostra atividades de todos os projetos, por dia
- [ ] Atividades de projeto **cancelado** não aparecem
- [ ] Modal do dia rola por dentro quando o dia tem muitas atividades; o cabeçalho
      fica fixo
- [ ] Modal de detalhe da atividade mantém os botões visíveis em tela baixa
- [ ] "Abrir no projeto" leva ao lugar certo

### POPs

- [ ] Criar POP, subir nova versão, ver o número da versão subir
- [ ] Filtro por categoria (select) filtra e a contagem por categoria bate
- [ ] Botão "Abrir" leva ao documento no Drive em aba nova
- [ ] `/pops/config` (só ADMIN) cria e edita categorias

### CRM

- [ ] Criar empresa, pessoa e negócio
- [ ] Kanban de oportunidades: arrastar entre etapas persiste após recarregar
- [ ] Máscaras de CNPJ/CPF/telefone funcionam
- [ ] Atividades/interações do CRM salvam

### Usuários (ADMIN)

- [ ] Paginação: com mais de 20 usuários, a contagem "1–20 de N" bate e
      anterior/próxima navegam de verdade (URL muda para `?page=2`)
- [ ] Criar usuário com cada papel
- [ ] Resetar senha força troca no próximo login
- [ ] Liberar/revogar acesso de projeto para CLIENTE

### Busca e navegação

- [ ] ⌘K / Ctrl+K abre a busca global e encontra projeto por nome
- [ ] Breadcrumbs corretos ao navegar dentro de um projeto

---

## 5. Erros e limites

- [ ] **Rate limit de auth.** Erre a senha 6 vezes seguidas → esperado `429`, não
      erro genérico. Espere um minuto para destravar. (Só funciona em produção; é
      desligado fora dela de propósito.)
- [ ] **Formulários.** Enviar campos obrigatórios vazios mostra mensagem amigável,
      não stack trace nem "Erro 500"
- [ ] **API fora do ar.** Pare o serviço `api` no Railway e tente logar →
      "Serviço indisponível", não tela branca. Suba de volta depois.
- [ ] **404.** `$WEB/rota-que-nao-existe` mostra a página de não encontrado
- [ ] **Payload grande.** Um POST acima de 1MB tem que ser recusado pela API

---

## 6. Responsividade

Testar em ~375px (celular) e num notebook de 768px de altura:

- [ ] Sidebar vira menu e não sobrepõe conteúdo
- [ ] Modais de Atividades não vazam para fora da tela
- [ ] Tabelas rolam horizontalmente em vez de estourar a página
- [ ] Tela de login centralizada e legível

---

## 7. Registrando o que achar

Para cada problema, anote: papel do usuário, URL, o que esperava, o que aconteceu,
e o trecho de `railway logs --service api` do mesmo instante. Sem o log do
servidor, metade dos bugs de RBAC vira adivinhação.

---

## 8. Limpeza depois dos testes

Quando terminar a rodada, apague os dados de teste para não deixar usuário de
demonstração com senha conhecida num ambiente público:

```bash
DATABASE_URL="<DATABASE_PUBLIC_URL>" \
ALLOW_DATA_RESET=yes \
RESET_DB_HOST_CONFIRM="<host:porta da URL>" \
pnpm db:reset-data
```

Isso esvazia todas as tabelas e preserva o histórico de migrations — o ambiente
continua de pé, pronto para um seed novo. Detalhes e a opção de destruir tudo
estão em §9 do [guia de deploy](./deploy-railway.md).

Checklist de encerramento:

- [ ] Dados de teste apagados
- [ ] Usuários de demonstração não existem mais (ou tiveram a senha trocada)
- [ ] Bugs encontrados viraram issue ou anotação
- [ ] Se o ambiente vai ficar parado, considere pausar os serviços para não gastar
      as horas do plano
