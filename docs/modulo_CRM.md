# Escopo do Módulo CRM — ERP

> Documento de referência do módulo de relacionamento (clientes, contatos, funil).
> Público-alvo do produto: **Gleidson** (dono, hoje único usuário responsável) e a equipe que entrar depois.
> Base técnica: PostgreSQL + Prisma. Ver `schema.prisma` para o modelo de dados.

---

## 1. Filosofia do módulo

O CRM não é uma agenda de contatos bonita. Ele existe para atacar **dois eixos**, e tudo neste escopo se justifica por um deles:

1. **Redução de atrito** — o sistema se alimenta com o mínimo de digitação. Todo campo que depende da disciplina do Gleidson é uma dívida; todo dado que entra sozinho (enriquecimento por CNPJ, timeline automática) é patrimônio.
2. **Proatividade** — o sistema devolve valor: lembra de quem está esfriando, mostra o funil real, calcula o que está em aberto. Um CRM que só guarda o passado é um museu.

Além disso, dentro do ERP o CRM tem um papel estrutural: **é a espinha de dados mestres de organizações e pessoas** que Projetos, LIMS e Estoque vão referenciar. Por isso ele é modelado com rigor de fundação, não de tela isolada.

**Meta de usabilidade para o Gleidson:** cadastrar uma empresa nova em menos de 15 segundos (digitando só o CNPJ), enxergar tudo de um cliente numa tela só, e mover uma oportunidade no funil arrastando um card. Nada de formulário com 40 campos obrigatórios.

---

## 2. Decisões de design (cada uma e o porquê)

### 2.1. Organização neutra + papéis (não "tabela de clientes" e "tabela de fornecedores")
Uma organização é um **hub neutro**; o que a torna cliente, parceiro, agência de fomento ou fornecedor é um **papel** (`PartyRole`) anexado. Motivo: a mesma empresa pode ter vários papéis (um lab parceiro que também compra reagentes), a estrutura de dados é idêntica, e cada papel liga módulos diferentes. Cadastro único, endereço único, manutenção única. É o padrão "Business Partner" dos ERPs sérios.

### 2.2. Pessoa separada de Organização
`Contact` (pessoa) e `Organization` (empresa) são entidades distintas, unidas por um **vínculo** (`ContactOrganizationLink`) que carrega cargo, se é decisor, financeiro ou técnico. Motivo: pessoas trocam de empresa; empresas têm vários contatos. Fundir os dois trava esses cenários.

### 2.3. Identidade (login) ≠ pessoa de negócio
`User` é quem loga e tem permissão. `Contact` é com quem se tem relação comercial. Um cliente com acesso ao portal é um `User` ligado a um `Contact`. Motivo: evita o nó clássico de "esse registro é funcionário ou cliente?". Por isso o antigo papel de sistema `CLIENTE` virou `PORTAL` (nível de permissão), e "ser cliente" passou a ser papel da organização.

### 2.4. Rótulo é dado; semântica é código (a decisão central deste módulo)
A regra que define o que é configurável e o que é fixo:

- **Se o Gleidson precisa criar, renomear ou reordenar durante a operação, sem esperar um deploy → é DADO (tabela).** Ex.: funis, colunas do kanban, origens, setores, escada de maturidade.
- **Se o código depende do significado fixo e o conjunto é fechado → é ENUM (código).** Ex.: `StageType` (OPEN/WON/LOST), papéis estruturais, permissões.

O truque que evita perder relatório: cada etapa do funil tem um **rótulo livre** (que o usuário define) **e** um `type` fixo (OPEN/WON/LOST) que o sistema entende. O Gleidson nomeia "Piloto", "Proposta", "Fechamento"; o código ainda sabe o que "ganho" significa para calcular conversão. É assim que Pipedrive e HubSpot funcionam.

### 2.5. Múltiplos funis
Os dados reais mostram quatro linhas de negócio com funis próprios (R&D as a Service, Subvenção Econômica, Licenciamento Tecnológico, Prospecção). Por isso `Pipeline` + `PipelineStage` em vez de um único enum de etapa. Cada funil tem suas colunas; cada oportunidade pertence a um funil e a uma etapa dele.

### 2.6. Escada de maturidade de P&D (Lab → Piloto → Escala)
É específica do negócio (biotecnologia / P&D) e aparece hoje enfiada num campo de texto. Modelada como `EngagementStage` configurável e opcional na oportunidade, para permitir medir quantos negócios estão em cada fase — algo que a planilha não entrega.

### 2.7. IDs estáveis, soft delete e auditoria
Todo registro mestre tem `id` interno imutável (cuid) para o qual os módulos apontam; o CNPJ é chave de deduplicação, não a referência. Exclusões são lógicas (`deletedAt`), preservando histórico. Alterações sensíveis passam pelo `AuditLog` já existente.

---

## 3. O que o módulo VAI ter

### 3.1. Cadastro de organizações
- Campos de identidade: razão social, nome fantasia, documento (CNPJ/CPF/estrangeiro), inscrições, CNAE, website, observações.
- **Enriquecimento por CNPJ**: digitou os 14 dígitos → razão social, endereço, situação cadastral, CNAE e setor preenchidos automaticamente via API pública (BrasilAPI/ReceitaWS). É o recurso de maior retorno do módulo.
- **Deduplicação na origem**: checagem por documento normalizado (só dígitos) antes de salvar, evitando cadastro repetido.
- **Hierarquia matriz → filiais**: uma organização pode ser filial de outra (relevante para LIMS/faturamento com CNPJs distintos).
- **Papéis** (`PartyRole`): CUSTOMER, SUPPLIER, PARTNER, FUNDING_AGENCY (agência de fomento), RESEARCH_INSTITUTION (ICT), CARRIER. Uma organização pode acumular papéis.
- **Perfil de cliente** (`CustomerProfile`): estágio (potencial/efetivo), condição de pagamento, limite de crédito, vendedor responsável.
- **Perfil de fornecedor** (`SupplierProfile`): categoria, prazo de entrega, homologação, avaliação. (Modelado; operação plena vem com o módulo de Compras.)
- **Endereços** múltiplos e tipados (principal, cobrança, entrega, coleta).

### 3.2. Contatos e vínculos
- Cadastro de pessoas com e-mail, telefone, celular, aniversário, LinkedIn, observações.
- **Vínculo com organização** carregando cargo, departamento e marcadores de papel: decisor, financeiro, técnico, e "contato principal" da empresa.
- Um contato pode se vincular a mais de uma organização (ex.: consultor que atende vários clientes).

### 3.3. Timeline de interações
- Registro unificado de e-mail, ligação, reunião, visita, WhatsApp — com direção (entrada/saída/interna), assunto, resumo curto e conteúdo completo.
- Vinculada à organização e, opcionalmente, ao contato e ao usuário que registrou.
- É a base do "contexto instantâneo antes de qualquer contato": abrir a ficha e ver onde a conversa parou.
- Campos `summary` e `fullContent` já preparados para resumo por IA no futuro (sem migração).

### 3.4. Atividades / follow-ups
- Tarefas de relacionamento (`Activity`) com título, descrição, prioridade, prazo, responsável e status (pendente/em andamento/concluída/cancelada).
- Podem nascer de uma interação ("cliente pediu proposta até sexta") e ficam ligadas à organização/contato.
- Fundação da futura lista "o que fazer hoje" e do combate ao esfriamento de contatos.

### 3.5. Funil configurável (o coração operacional)
- **Pipelines** que o Gleidson cria e nomeia (um por linha de negócio), com um marcado como padrão.
- **Colunas do kanban** (`PipelineStage`) que ele adiciona, renomeia, colore e **reordena arrastando** — cada uma com um `type` (OPEN/WON/LOST) e uma probabilidade default.
- **Oportunidades** movidas entre colunas por drag-and-drop, cada uma com valor, moeda, funil, etapa, estágio de maturidade (Lab/Piloto/Escala), contato principal, responsável, datas e motivo de perda estruturado.
- Como o `type` é estável, o sistema calcula automaticamente: total em aberto, taxa de conversão (ganhos ÷ fechados), valor ponderado por probabilidade.

### 3.6. Taxonomias configuráveis (geridas pelo admin)
- **Origem** (`OrganizationSource`): Network, Evento, Site, Busca ativa, UpLab… — o Gleidson adiciona novas.
- **Setor** (`Sector`): Indústria Food, Fuels, Feed, ICT, Biotecnologia… — editável.
- **Escada de engajamento** (`EngagementStage`): Lab → Piloto → Escala, reordenável.
- Todas com flag `isActive` para aposentar um valor sem apagar o histórico que o usa.

### 3.7. Administração e permissões
- Quem configura funis, colunas e taxonomias é papel de **admin** (Gleidson), não qualquer usuário — encaixado no RBAC já existente (`SystemRole`).
- **Defaults semeados**: no primeiro dia o sistema já vem com um funil e etapas padrão prontos, senão o kanban abriria vazio. O usuário edita a partir daí.

### 3.8. Relatórios básicos (não-IA)
- Funil por pipeline: quantas e quanto (R$) em cada etapa.
- Conversão e valor em aberto por responsável e por período.
- Contatos/organizações sem interação há X dias (risco de esfriamento) — cálculo simples por data, sem IA.

---

## 4. Como cada coisa deve funcionar (fluxos do Gleidson)

### Fluxo A — Cadastrar empresa nova
Gleidson cola o CNPJ → o sistema normaliza para dígitos, verifica duplicata, consulta a API pública e preenche razão social, endereço, situação e setor → ele confirma, marca o papel (cliente/parceiro/fomento) e salva. Empresa estrangeira sem CNPJ: ele marca `FOREIGN` e preenche manualmente, sem o sistema exigir CNPJ.

### Fluxo B — Registrar uma conversa e não esquecer o retorno
Depois de uma reunião, ele abre a ficha da empresa, adiciona uma interação (tipo "reunião", resumo em 3 linhas) e, no mesmo passo, cria uma atividade "enviar proposta" com prazo. A atividade aparece na lista de pendências até ser concluída.

### Fluxo C — Tocar o funil
No kanban do pipeline "R&D as a Service", ele arrasta o card "ITAL CCD Laranja" de "Qualificação" para "Proposta". A probabilidade se ajusta ao default da nova etapa. Ao arrastar para uma coluna do tipo WON, o sistema marca `closedAt` e conta como ganho nos relatórios.

### Fluxo D — Configurar um novo funil
Surgiu uma nova linha de negócio. Como admin, ele cria um pipeline "Licenciamento", adiciona colunas ("Contato inicial", "Due diligence", "Contrato", "Fechado"), define quais são WON/LOST e reordena — tudo sem depender de deploy.

### Fluxo E — Ficha 360 da organização
Ao abrir uma empresa, ele vê em abas: dados e papéis; contatos vinculados (com quem é decisor); a timeline de interações; e as oportunidades abertas com aquela empresa. Contexto completo antes de ligar.

---

## 5. O que o módulo NÃO vai ter agora (e por quê)

Escopo deliberadamente **fora** desta fase — não por serem ruins, mas porque exigem volume de dados ou infraestrutura que ainda não fazem sentido para uma base de dezenas de registros e um usuário. Os ganchos já estão no schema para quando chegar a hora.

- **Recursos de IA** (priorização da lista diária, previsão de receita, sugestão de próximo passo, resumo automático de interações, deduplicação inteligente por similaridade de nome). Motivo: com dezenas de registros e um usuário, previsão e priorização por IA seriam chute com verniz. Os campos (`summary`, `probability`, timeline indexada) já estão prontos para plugar depois, sem migração.
- **Captura automática** (integração com e-mail, WhatsApp, agenda que registra interações sozinho). Motivo: é a maior fonte de valor futura, mas exige infraestrutura de integração; entra numa fase dedicada.
- **Automação de sequências de follow-up** (envio automático de mensagens em cadência). Motivo: risco em relacionamento se disparado sem curadoria; fica para depois, e mesmo assim com aprovação humana antes do envio.
- **Mapa de relacionamentos** ("quem conhece quem", força de relação calculada). Motivo: valor alto, mas depende de histórico de interações acumulado que ainda não existe.
- **Lado fornecedor operacional** (cotações, pedidos de compra em uso real). Motivo: o modelo já suporta (papel SUPPLIER, `SupplierProfile`, stubs de compras), mas a operação vem com o módulo de Estoque/Compras.
- **Portal do cliente** (login externo para o cliente acompanhar). Motivo: o `SystemRole.PORTAL` e o vínculo `User.contactId` já preparam o terreno; a interface externa é fase posterior.
- **App mobile dedicado**. Motivo: priorizar web responsivo primeiro.
- **Assinatura de contrato / faturamento**. Motivo: pertence ao módulo Financeiro; o CRM só fornecerá a organização e a oportunidade ganha como origem.

---

## 6. Migração dos dados atuais (planilhas exportadas)

Os dados reais vêm do `Registro_de_Oportunidade_de_Negócios.xlsx` (as planilhas `746214-*` vieram vazias). Volume: ~39 empresas no anexo, mais ~8 empresas, ~8 pessoas e ~8 oportunidades nas abas manuais; um único responsável (Gleidson).

Limpezas obrigatórias no ETL de importação:
- **CNPJ** em três formatos (número puro perdendo zero à esquerda, mascarado, estrangeiro) → normalizar para dígitos; estrangeiro vira `documentType = FOREIGN` sem exigir CNPJ.
- **Descrições com `<br />`** → remover HTML.
- **Placeholders** ("se houver") → tratar como vazio.
- **Pessoas nas oportunidades só com primeiro nome** → conciliação manual/aproximada.
- **Organizações citadas em oportunidades mas ausentes do cadastro** (ex.: FAPESP) → criar antes de vincular.
- **Duplicidade** entre a aba manual e o anexo → deduplicar por documento/nome.
- **Semear taxonomias** (`OrganizationSource`, `Sector`, `EngagementStage`) a partir dos valores distintos encontrados, e um pipeline padrão com etapas.

De-para resumido: Empresas → `Organization` (+ `Address`, `PartyRole`, `CustomerProfile`); Pessoas → `Contact` (+ `ContactOrganizationLink`); Oportunidades → `Opportunity` (Funil → `Pipeline`, Etapa → `PipelineStage`).

---

## 7. Roadmap por fases (ordem de valor)

1. **Fundação + importação.** Migrar `schema.prisma`, semear taxonomias e pipeline padrão, rodar o ETL das planilhas. Entrega: base limpa e navegável.
2. **Cadastro com CNPJ + ficha 360.** Enriquecimento automático, dedup, abas de dados/contatos/timeline/oportunidades. Entrega: o dia a dia de consulta.
3. **Funil kanban configurável.** Pipelines, colunas arrastáveis, oportunidades com drag-and-drop, relatórios básicos de conversão. Entrega: gestão comercial real.
4. **Interações + atividades.** Timeline e follow-ups com prazo. Entrega: nada de contato esquecido.
5. **Camada de IA** (só quando houver volume): dedup inteligente e resumo de interações primeiro; priorização e previsão depois.

Regra de ouro do roadmap: cada fase entrega valor sozinha. Não construir a fase seguinte antes da anterior estar em uso.

---

## 8. Referência do modelo de dados

Modelos centrais do CRM no `schema.prisma`: `Organization`, `Address`, `PartyRole`, `CustomerProfile`, `SupplierProfile`, `Contact`, `ContactOrganizationLink`, `Interaction`, `Activity`, `Pipeline`, `PipelineStage`, `Opportunity`, e as taxonomias `OrganizationSource`, `Sector`, `EngagementStage`. Enums estruturais: `PartyRoleType`, `CustomerStage`, `StageType`, `InteractionType`, `ActivityStatus`, `SystemRole`.

Princípio que resume o módulo inteiro: **os rótulos que o Gleidson controla são dados; a semântica de que o código depende é fixa. Redução de atrito na entrada, proatividade na saída.**