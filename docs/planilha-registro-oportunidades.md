# Mapeamento — `Registro de Oportunidade de Negócios.xlsx`

> Documento de referência da planilha real usada pelo Gleidson para
> registrar leads/oportunidades antes de existir o CRM. Gerado lendo o
> arquivo em `docs/Registro de Oportunidade de Negócios.xlsx` (extraído via
> XML interno do xlsx, célula a célula) para não precisar reabrir a planilha
> a cada sessão. **Isto é só mapeamento — nenhum ETL foi executado.**
>
> Arquivo original: 5 abas, 389 strings únicas, gerado em ferramenta com
> convenções de **Agendor** (CRM brasileiro) — um comentário de célula na
> aba "1- Empresas" diz literalmente "único usuário ativo no Agendor" na
> coluna Usuário responsável.

---

## 1. Aba "Instruções"

Texto guia (linhas 2, 4-7, 9-12), sem tabela de dados:

- Fluxo de preenchimento: **1- Empresa → 2- Pessoas → 3- Oportunidade** (nessa ordem, após uma conversa/mensagem/encontro em evento).
- Aviso antes de "1- Empresa": conferir se a empresa já não está cadastrada na aba **"ANEXO - Empresas Cadastradas"** antes de recriar.
- Regras: "Não adicione ou exclua nenhuma coluna"; "Usar sempre o mesmo padrão da linha 2 para dar informação"; outras instruções vivem em comentários por célula (extraídos abaixo, por aba).

---

## 2. Aba "1- Empresas" (registro manual rápido)

**9 linhas de dados (linhas 2-9); só as linhas 2-4 têm todos os campos coerentes com o cabeçalho — linhas 5-9 têm valores em colunas erradas (ver §2.3).**

### 2.1. Colunas (ordem real, A→AD)

| Col | Header | Comentário da célula (instrução) |
|---|---|---|
| A | Nome | "Nome fantasia" |
| B | CNPJ | "Apenas números. Para multinacionais, priorize a unidade BR. Para estrangeiras, deixar em branco" |
| C | Razão Social | — |
| D | Categoria | — (valores vistos: `Parceiro`) |
| E | Origem | — (valores vistos: `Busca ativa`, `BioX`, `Network`, `Evento`, `ITAL`) |
| F | Usuário responsável | "único usuário ativo no Agendor" (sempre `Gleidson Teixeira`, exceto uma linha `Osmar`) |
| G | Setor | (`Indústria Bev`, `Indústria Food`) |
| H | Descrição | texto livre |
| I | E-mail | |
| J | WhatsApp | |
| K | Telefone | |
| L | Celular | |
| M | Fax | |
| N | Ramal | |
| O | Website | |
| P | CEP | |
| Q | País | |
| R | Estado | |
| S | Cidade | |
| T | Bairro | |
| U | Rua | |
| V | Número | |
| W | Complemento | |
| X | Produto | |
| Y | Facebook | |
| Z | Twitter | |
| AA | LinkedIn | |
| AB | Skype | |
| AC | Instagram | |
| AD | Ranking | |

> Nota: nas linhas de dados, "Website" apareceu deslocado em M (não O) na
> linha 2 e "R&D as a Service | Piloto" apareceu em P — ver mistura abaixo.
> O campo **X (Produto)** na prática recebeu valores tipo `R&D as a Service | Piloto`
> em algumas linhas — parece usado como "linha de negócio / produto de interesse", não um nome de produto.

### 2.2. Linhas limpas (2-4)

| Linha | Nome | CNPJ (bruto) | Categoria | Origem | Setor | Descrição |
|---|---|---|---|---|---|---|
| 2 | ITAL | `5.1917987000144E13` (=51917987000144) | Parceiro | Busca ativa | Indústria Bev | Empresa com 10 anos de mercado. Tem interesse nos produtos X e Y. |
| 3 | Arbiom | `47-2614756` (texto, formato EIN dos EUA — empresa estrangeira) | Parceiro | BioX | Indústria Food | Levedura para nutrição humana e animal |
| 4 | Synex | `61.048.628/0001-51` (já mascarado) | Parceiro | Network | Indústria Food | Upcycling de resíduos e co-produtos agroindustriais |

### 2.3. Linhas sujas (5-9) — valores na coluna errada

| Linha | Col A (Nome) | Col B (CNPJ) — valor real encontrado | Outras colunas preenchidas |
|---|---|---|---|
| 5 | Mondelez | `Gleidson Teixeira` (nome de pessoa, não CNPJ) | nenhuma |
| 6 | Cogumelo | `Cliente em potencial` (estágio comercial, não CNPJ) | E=Evento, F=Gleidson Teixeira, G=Indústria Bev |
| 7 | Cirkla | `Cliente em potencial` | E=ITAL, F=Osmar, G=Indústria Food, H=Produção de micoproteína (Aspergillus oryzae), I=info@cirkla.es |
| 8 | Gleidson Teixeira | (só a coluna A preenchida — linha lixo) | — |
| 9 | Gleidson Teixeira | (idem) | — |

**Leitura:** linhas 5-9 são anotações rápidas/incompletas, não registros
prontos para importar. "Cliente em potencial" e "Gleidson Teixeira" nunca
deveriam estar na coluna CNPJ — indicam que o usuário pulou colunas ao
digitar rápido. Empresas citadas aqui (Mondelez, Cogumelo, Cirkla) **não
aparecem no ANEXO** — são candidatas a cadastro novo, sem CNPJ disponível.

---

## 3. Aba "2- Pessoas"

**9 linhas de dados; só a linha 2 é um registro completo. Linhas 3-9 são lixo/rascunho.**

### 3.1. Colunas (A→AD)

| Col | Header | Comentário |
|---|---|---|
| A | Nome | "Nome + sobrenome é suficiente" |
| B | CPF | "só números" |
| C | Empresa | "Mesmo nome fantasia da empresa que você cadastrou ou identificou na aba ANEXO — pode até usar um `=`" (referência cruzada por fórmula!) |
| D | Cargo | |
| E | Aniversário | serial de data Excel (ex.: `45940.0`) |
| F | Ano de nascimento | |
| G | Usuário responsável | |
| H | Categoria | |
| I | Origem | |
| J | Descrição | |
| K | E-mail | |
| L | WhatsApp | "formato +55 99 99999-9999" |
| M | Telefone | |
| N | Celular | |
| ... | (Fax, Ramal, CEP, País, Estado, Cidade, Bairro, Rua, Número, Complemento, Produto, Facebook, Twitter, LinkedIn, Skype, Instagram, Ranking) | mesmo padrão da aba Empresas |

### 3.2. Linha 2 (única completa)

| Campo | Valor |
|---|---|
| Nome | Pessoa A |
| CPF | `se houver` (placeholder — não é CPF) |
| Empresa | Empresa A |
| Cargo | Diretor comercial |
| Aniversário | `45940.0` (serial Excel → 2025-10-08) |
| Usuário responsável | Gleidson Teixeira |
| Origem | Busca ativa |
| Descrição | "Trabalhamos juntos na... agora ele..." |
| E-mail | pessoa@empresa.com.br |
| WhatsApp | `+55 11 99999-9999` |
| Telefone / Celular | `se houver` (placeholder repetido) |
| País/Estado/Cidade | Brasil / SP / São Paulo |
| LinkedIn | http://www.linkedin.com/company/pessoa-a |

Todos os valores de "Pessoa A" / "Empresa A" / `contato@empresa-a.com.br`
são **dados de exemplo do template**, não um lead real — confirmado porque
os mesmos valores aparecem na aba "1- Empresas" linha 2 como placeholder de
formato (`http://www.empresa-a.com.br`, `+55 11 99999-9999`).

### 3.3. Linhas 3-9 (lixo)

Só a coluna A preenchida: linha 3 = `Cogumelo` (na verdade nome de
empresa, não pessoa — mais um caso de digitação na coluna errada), linhas
4-9 = `Gleidson Teixeira` repetido sem mais contexto.

---

## 4. Aba "3- Oportunidades"

**9 linhas de dados; linhas 2-6 têm conteúdo real, mas com colunas
sistematicamente trocadas — ver §4.2. Esta aba precisa de revisão linha a
linha na hora do ETL, não dá para confiar em mapeamento posicional puro.**

### 4.1. Colunas (A→O)

| Col | Header | Comentário da célula |
|---|---|---|
| A | Título do negócio | "começar o nome do negócio com o nome da empresa" |
| B | Empresa relacionada | "Mesmo nome fantasia da empresa que você cadastrou ou identificou na aba ANEXO — pode usar `=`". **Regra de negócio importante (linha 3, comentário completo):** *"Empresa é quem nos paga. Para projetos FAPESP em que somos 'terceiros', a Empresa é o ITAL. Para projetos FAPESP em que somos beneficiários de bolsas ou outras rubricas, a Empresa é a FAPESP."* → ou seja, o campo "Empresa" pode ser o pagador real, não necessariamente o cliente-fim do projeto. |
| C | Pessoa relacionada | "Mesmo nome da pessoa que você cadastrou — pode usar `=`" |
| D | Usuário responsável | |
| E | Data de início | "Não é o início do PROJETO, é o início da NEGOCIAÇÃO — o primeiro contato que gerou essa oportunidade" |
| F | Data de conclusão | |
| G | Valor Total | |
| H | Funil | (linhas de negócio: `R&D as a Service`, `Subvenção Econômica`, `Licenciamento Tecnológico`, `Prospecção` — bate com §2.5 do escopo) |
| I | Etapa | |
| J | Status | |
| K | Motivo de perda | |
| L | Descrição do motivo de perda | |
| M | Ranking | |
| N | Descrição | |
| O | Produtos e Serviços | |

### 4.2. Dados reais e o problema de alinhamento de coluna

| Linha | A (Título) | B (Empresa) | C (Pessoa) | E (deveria ser Data início) | F (deveria ser Data fim) | H (deveria ser Funil) | I (deveria ser Etapa) |
|---|---|---|---|---|---|---|---|
| 2 | ITAL CCD Laranja | ITAL | Aline | `42851.0` (data real, ok) | `400000.0` ← **isto é o Valor Total, não uma data** | `R&D as a Service` (correto) | `Desenvovlimeno de enzima ....` ← **isto é uma Descrição, não uma Etapa** |
| 3 | ITAL CCD Cacau | FAPESP | Luccas | `Subvenção Econômica` ← **isto é o Funil, não uma data** | — | — (vazio) | `Aproveitamento de resíduos de cacau...` ← Descrição |
| 4 | Levedura Torula | Arbiom | Charlotte | `45778.0` (data ok) | `94000.0` ← Valor Total | `R&D as a Service` | — |
| 5 | Up-cycling | — | Bruno | `46023.0` (data ok) | `Licenciamento Tecnoloiga` ← Funil (com typo) | — | — |
| 6 | Mondelez | — | — | — | `Prospecção e Qualificação` ← Funil + Etapa concatenados | — | — |
| 7 | Cogumelo \| R&D as Service | Gleidson Teixeira ← **nome de pessoa na coluna Empresa** | — | — | — | — | — |
| 8-9 | Gleidson Teixeira | (lixo, só coluna A) | | | | | |

**Leitura:** o usuário consistentemente pulou a coluna G (Valor Total) e
colocou o valor em F (Data de conclusão), e pulou H (Funil) escrevendo o
nome do funil em E (Data de início) quando não tinha data. A coluna I
(Etapa) muitas vezes recebeu a Descrição do negócio. **Nenhuma linha tem
Status preenchido.** Isso é esperado de um rascunho rápido — a ETL real vai
precisar de revisão humana linha a linha nesta aba (só 7 linhas, viável).

**Empresas/pessoas citadas que não estão na ANEXO nem nas abas 1/2:**
FAPESP (agência de fomento, já prevista em `PartyRoleType.FUNDING_AGENCY`),
Aline, Luccas, Charlotte, Bruno (só primeiro nome — confirma o problema já
antecipado no escopo: "pessoas nas oportunidades só com primeiro nome →
conciliação manual/aproximada").

---

## 5. Aba "ANEXO - Empresas Cadastradas" (base estruturada, 39 empresas)

**39 linhas de dados (linhas 2-40), muito mais consistente que as abas
manuais — parece ter sido preenchida via consulta de CNPJ (Receita
Federal/BrasilAPI-like), uma por uma.**

### 5.1. Colunas (A→AI)

| Col | Header | Observação |
|---|---|---|
| A | Código da empresa | ID numérico do sistema de origem (Agendor?), ex. `4.8649541E7` — não usar como ID nosso |
| B | Nome Fantasia | |
| C | Razão Social | nome completo, maiúsculas |
| D | Usuário responsável | sempre `Gleidson Teixeira` |
| E | Categoria | valores: `Cliente em potencial`, `Cliente efetivo`, `Parceiro`, `Agência de Fomento`, `ICT` — **candidatos a `PartyRoleType`/`CustomerStage`** |
| F | Origem do cliente | valores: `Network`, `Site`, `Busca ativa`, `Evento`, `ITAL`, `BioX`, `UpLab` — bate com taxonomia `OrganizationSource` já semeada |
| G | Setor | `Indústria Food`, `Indústria Feed`, `Indústria Fuels`, `Indústria Química`, `Indústria em geral`, `ICT`, `Agência de Fomento`, `Hub de Inovação`, `Trader`, `Empresa Biotecnologia` — mais valores que a taxonomia `Sector` atual (5 setores semeados); a ETL vai precisar expandir/mapear |
| H | CNPJ | número em notação científica, ex. `4.6344354000154E13` → `46344354000154` (14 dígitos). **Risco:** perda de dígito por ponto flutuante — validar cada CNPJ contra dígito verificador antes de gravar, não confiar cegamente na conversão numérica |
| I | Descrição | **campo composto**: concatena via `<br />` dados de enriquecimento de CNPJ — Data de abertura, Porte, Situação cadastral, Data da situação cadastral, Quadro de sócios e administradores (lista), Código e descrição da atividade econômica principal (CNAE). Ver §5.2. |
| J | Website | quase sempre vazio nesta amostra |
| K | Ranking | sempre `0.0` — coluna não usada |
| L-Q | Telefone, Celular, WhatsApp, Fax, Ramal, Rádio | preenchidos de forma inconsistente: às vezes telefone fixo formatado `(55) 249986500`, às vezes celular como número puro sem formatação `5516997310113`, às vezes WhatsApp com o mesmo número do celular |
| R | E-mail | |
| S | País | quase sempre `Brasil` |
| T | Estado | sigla UF |
| U | Cidade | |
| V | CEP | numérico, ex. `1.8502E7` → `18502000` (perde zeros à direita — **mesmo risco de notação científica**) |
| W | Bairro | |
| X | Rua | |
| Y | Número | float, ex. `503.0`, `0.0` quando não informado |
| Z | Complemento | |
| AA-AE | Facebook, Twitter, LinkedIn, Skype, Instagram | só LinkedIn tem dados reais nesta amostra |
| AF | Data de cadastro | **corrompida**: literalmente o texto `#########` em 100% das linhas amostradas (não é problema de largura de coluna — o valor armazenado é essa string) |
| AG | Ultima atualização | idem, `#########` em todas as linhas |
| AH | Cadastrado por | sempre `Gleidson Teixeira` |
| AI | Contato | sempre vazio |

### 5.2. Estrutura do campo "Descrição" (coluna I) — dados de CNPJ

Formato observado (exemplo real, Ajinomoto):

```
DATA DE ABERTURA DA EMPRESA: 1975-06-26<br /><br />
PORTE DA EMPRESA: DEMAIS<br /><br />
SITUAÇÃO CADASTRAL: Ativa<br /><br />
DATA DA SITUAÇÃO CADASTRAL: 2005-11-03<br /><br />
QUADRO DE SÓCIOS E ADMINISTRADORES:<br />
AJINOMOTO CO., INC. - <br />
ROBERTO MICHIO YAMAUCHI - <br />
FABIO LUIZ CEREGATTO - <br />
[outros]<br /><br />
CÓDIGO E DESCRIÇÃO DA ATIVIDADE ECONÔMICA PRINCIPAL:<br />
2029100 - Fabricação de produtos químicos orgânicos não especificados anteriormente
```

Isso é exatamente o formato de resposta de consulta de CNPJ (Receita
Federal / BrasilAPI) colado como texto — os campos "DATA DE ABERTURA",
"PORTE", "SITUAÇÃO CADASTRAL", "DATA DA SITUAÇÃO CADASTRAL", "CNAE
principal" podem ser **parseados com regex** para popular
`Organization.registrationStatus`, `Organization.cnae`, etc., em vez de
ficarem soterrados em `notes` como texto livre. "QUADRO DE SÓCIOS" não tem
campo correspondente no schema atual (pode virar `notes` ou ser descartado).

### 5.3. As 39 empresas (nome fantasia → categoria → CNPJ bruto)

| Nome Fantasia | Categoria | Setor | CNPJ (bruto, converter) |
|---|---|---|---|
| Ajinomoto | Cliente em potencial | Indústria Food | `4.6344354000154E13` |
| Aleris | Cliente em potencial | Indústria Feed | `1.530411800018E13` |
| Ambev | Cliente efetivo | Indústria Food | `7.5265570001E12` |
| ATVOS | Cliente em potencial | Indústria Fuels | `8.842690000138E12` |
| BioX | Parceiro | Indústria em geral | `0.0` (sem CNPJ — provavelmente estrangeira, ver §1 "Empresa com 10 anos..." aba 1 linha 3: Arbiom tem EIN, BioX pode ser ligada) |
| Braskem | Cliente em potencial | Indústria Química | `4.2150391004591E13` |
| Cargill Bioenergia | Cliente em potencial | Indústria Fuels | `1.0249419000135E13` |
| Cerradinho \| Usina | Cliente em potencial | Indústria Fuels | `4.7062997000178E13` |
| CMAA | Cliente em potencial | Indústria Fuels | `8.493364000162E12` |
| CNPEM | Parceiro | ICT | `1.576817000175E12` |
| CNPq | Agência de Fomento | Agência de Fomento | `3.3654831000136E13` |
| Colorado \| Usina | Cliente em potencial | Indústria Fuels | `5.1990778000207E13` |
| Cubo Itau | Parceiro | Hub de Inovação | `4.2267898000109E13` |
| Duas Rodas | Cliente em potencial | Indústria Food | `8.4430149000109E13` |
| Enersugar | Cliente em potencial | Indústria Fuels | `3.46564440001E13` |
| FairFeed | Cliente em potencial | Indústria Feed | `3.4443221000156E13` |
| FAPESP | Agência de Fomento | Agência de Fomento | `4.3828151000145E13` |
| FINEP | Agência de Fomento | Agência de Fomento | `3.3749086000109E13` |
| Goiasa | Cliente em potencial | Indústria Fuels | `2.773950000184E12` |
| GranBio | Cliente em potencial | Indústria Fuels | `6.0553941000184E13` |
| Granvital | Cliente em potencial | Indústria Food | `8.986657000181E12` |
| HT Nutri | Cliente em potencial | Indústria Food | `5.252578000159E12` |
| Ingredion | Cliente efetivo | Indústria Food | `1.730520000112E12` |
| Inpasa | Cliente em potencial | Indústria Fuels | `2.9316596000115E13` |
| ITAL | Parceiro | ICT | `5.1917987000144E13` (mesmo CNPJ da aba 1 linha 2 — **duplicata confirmada entre abas**) |
| Kerry Brasil | Cliente em potencial | Indústria em geral | `2.332686000143E12` |
| Leap Protein | Parceiro | Empresa Biotecnologia | `0.0` (sem CNPJ; linha também tem "Razão Social" = `Gleidson Teixeira`, provável erro de digitação) |
| M. Dias Branco | Cliente efetivo | Indústria Food | `7.206816000115E12` |
| Marques Agro | Parceiro | Trader | `2.480896000014E13` |
| Minussugar | Cliente efetivo | Empresa Biotecnologia | `0.0` (sem CNPJ — empresa estrangeira, e-mail `rodolfo@minussugar.com`, telefone `12039798321` = DDI dos EUA) |
| Moringa da Paz | Cliente efetivo | Indústria Food | `2.4764712000145E13` |
| Natura | Cliente em potencial | Indústria em geral | `7.1673990000177E13` |
| Raizen | Cliente em potencial | (Setor vazio — linha com colunas deslocadas: CNPJ `3.3453598000123E13` caiu na coluna Categoria) | `3.3453598000123E13` |
| SL Cereais & Alimentos | Cliente efetivo | Indústria Food | `8.1066938000106E13` |
| Suntaq Brasil | Parceiro | Indústria em geral | `3.3177533000283E13` |
| Synex | Cliente em potencial | Indústria Food | `6.1048628000151E13` (mesmo CNPJ da aba 1 linha 4 — **duplicata confirmada**) |
| UFSCar | ICT | ICT | `4.535805800014E13` |
| Usina Coruripe | Cliente em potencial | Indústria Fuels | `1.222941500011E13` |
| Zilor | Cliente em potencial | Indústria Feed | `5.1422988000118E13` |

**Duplicidade confirmada entre "1- Empresas" e "ANEXO":** ITAL e Synex
aparecem nas duas abas com o mesmo CNPJ — exatamente o cenário que o §6 do
escopo já previa ("Duplicidade entre a aba manual e o anexo → deduplicar
por documento/nome"). Arbiom (aba 1) não está no ANEXO.

**Linha com colunas deslocadas:** Raizen (linha 34) tem o CNPJ na posição
da coluna "Categoria" (E) em vez de "CNPJ" (H) — mais um caso de digitação
fora de posição, desta vez na aba estruturada.

---

## 6. Achados que a futura ETL (Fase 5) vai precisar tratar

1. **CNPJ em notação científica** (`5.1917987000144E13`) — converter para
   inteiro de 14 dígitos com `padStart(14, '0')`, e **validar dígito
   verificador** antes de gravar (risco de perda de precisão de ponto
   flutuante em números grandes).
2. **CEP e Número também em notação científica/float** — mesmo cuidado
   (`1.8502E7` → `18502000`, não `18502`).
3. **Colunas AF/AG do ANEXO ("Data de cadastro" / "Ultima atualização")
   estão corrompidas** — texto literal `#########` em todas as linhas
   amostradas. Ignorar essas duas colunas na importação; não são metadados
   de negócio (são timestamps do sistema de origem, não do CNPJ).
4. **Coluna "Descrição" do ANEXO é um bloco de texto estruturado** (dados
   de consulta de CNPJ com `<br />`) — vale a pena parsear com regex para
   extrair `registrationStatus`, `cnae`, data de abertura, em vez de jogar
   tudo em `notes`.
5. **Abas manuais (1, 2, 3) têm alta taxa de erro de coluna** — usuário
   pulou campos e digitou o valor seguinte na coluna errada
   sistematicamente (calendário → texto de funil, CNPJ → nome de pessoa
   etc.). Essas 3 abas somam só ~20 linhas de dados reais — dá para revisar
   manualmente uma a uma em vez de confiar em mapeamento posicional
   automático.
6. **Placeholders para tratar como vazio:** `"se houver"` (aba Pessoas,
   CPF/Telefone/Celular).
7. **Pessoas só com primeiro nome** nas oportunidades (Aline, Luccas,
   Charlotte, Bruno) — conciliação manual, sem CNPJ/CPF para dedup.
8. **Organizações citadas em oportunidades mas ausentes do cadastro:**
   nenhuma nova além do já esperado (FAPESP já está no ANEXO).
9. **Duplicidade confirmada** entre aba "1- Empresas" e "ANEXO": ITAL,
   Synex (mesmo CNPJ nas duas abas) — dedupe por documento resolve.
10. **Regra de negócio não-óbvia para Oportunidades:** em projetos FAPESP,
    a organização "pagadora" (campo `Empresa relacionada`) pode ser o ITAL
    (se formos "terceiros") ou a própria FAPESP (se formos beneficiários de
    bolsa) — **não é sempre o cliente-fim do projeto**. Import deve
    respeitar o que está escrito na planilha, não inferir.
11. **Referências cruzadas por fórmula (`=`)** entre abas ("Empresa" na
    aba Pessoas/Oportunidades pode ser uma fórmula apontando pro nome
    fantasia cadastrado em Empresas/ANEXO) — o parser da ETL precisa ler o
    valor calculado da fórmula (`<v>`), não a fórmula (`<f>`) em si; nos
    dados extraídos aqui isso já foi resolvido (usei sempre `<v>`).
12. **Setores encontrados no ANEXO excedem a taxonomia `Sector` já
    semeada** (5 valores) — lista real tem pelo menos: Indústria Food,
    Indústria Feed, Indústria Fuels, Indústria Química, Indústria em geral,
    ICT, Agência de Fomento, Hub de Inovação, Trader, Empresa Biotecnologia.
    A ETL (tarefa 5.A4 do plano) precisa semear os que faltarem.

---

## 7. De-para inicial (schema já validado, sem implementar agora)

| Origem (coluna/aba) | Destino (schema) |
|---|---|
| Nome Fantasia / Nome | `Organization.tradeName` |
| Razão Social | `Organization.legalName` |
| CNPJ (normalizado) | `Organization.document` + `documentType=CNPJ` (ou `FOREIGN` sem CNPJ) |
| Categoria (Cliente em potencial/efetivo/Parceiro/Agência de Fomento/ICT) | `PartyRole.type` (CUSTOMER/PARTNER/FUNDING_AGENCY/RESEARCH_INSTITUTION) + `CustomerProfile.stage` (PROSPECT/ACTIVE) quando aplicável |
| Origem do cliente | `Organization.sourceId` → `OrganizationSource` |
| Setor | `Organization.sectorId` → `Sector` |
| Descrição (bloco CNPJ) | parse → `registrationStatus`, `cnae`, resto em `notes` |
| Endereço (CEP/País/Estado/Cidade/Bairro/Rua/Número/Complemento) | `Address` (type=PRIMARY) |
| Telefone/Celular/WhatsApp/E-mail | ficam em `notes` ou viram `Contact` se identificarem uma pessoa (não a organização) |
| Nome (aba Pessoas) + Cargo | `Contact` + `ContactOrganizationLink.jobTitle` |
| Empresa (aba Pessoas/Oportunidades) | resolve por nome fantasia contra Organization já importada |
| Título do negócio, Valor Total, Funil, Etapa, Status, Motivo de perda | `Opportunity` (funil resolvido por nome, criando `Pipeline`/`PipelineStage` das 4 linhas de negócio se não existirem) |
| Data de início (negociação) | mais próximo de `Opportunity.createdAt` ou campo de data de abertura — **não** é `Project.startDate` |
