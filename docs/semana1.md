# 🧬 Bioinfood ERP — Semana 1: De zero a sistema

Imagine que a Bioinfood era uma startup com uma gaveta de Excel, um Notion bagunçado e um grupo de WhatsApp para aprovar coisas. Em **uma semana**, tudo isso virou um sistema real.

---

## 🏗️ A fundação (o que ninguém vê, mas sustenta tudo)

Foi construída uma **arquitetura limpa em 3 camadas** — como um prédio bem projetado: a lógica de negócio fica no meio, separada do banco de dados e da internet. Isso significa que o sistema é fácil de testar, fácil de evoluir e difícil de quebrar sem querer.

O banco de dados tem **12 tabelas** modeladas do zero, com relacionamentos, índices e deleção lógica (nada some de verdade, só fica invisível).

---

## 🔐 Quem pode o quê (autenticação + controle de acesso)

O sistema sabe exatamente quem é cada pessoa e o que ela pode fazer:

| Role | Poderes |
|---|---|
| **ADMIN** | Dono do universo |
| **APROVA** | Cria projetos, aprova documentos, libera clientes |
| **INSERE** | Edita dados dos projetos |
| **CONSULTA** | Lê tudo, muda nada |
| **CLIENTE** | Vê só o que foi liberado pra ele |

Login com **token JWT** (expira em 15min) + refresh automático (7 dias). Nenhuma senha trafega em texto puro.

---

## 📁 Gestão de Projetos completa

Cada projeto tem uma jornada de vida: `PLANEJAMENTO → EM ANDAMENTO → CONCLUÍDO`. E dentro de cada projeto, **8 módulos** já funcionam:

### 📜 Termo de Abertura (Charter)
O documento formal do projeto — 8 seções cobrindo problema, objetivos, escopo, recursos, stakeholders e riscos. Com fluxo de **aprovação** (só APROVA e ADMIN assinam).

### 🌳 EAP / WBS
Estrutura Analítica do Projeto em **árvore hierárquica**. Decomposição do trabalho em pacotes, com código, critério de prontidão e entregáveis.

### ✅ Tarefas com superpoderes
- Kanban (arrastar entre colunas)
- Backlog (lista ordenável)
- Dependências entre tarefas (A só começa depois que B terminar)
- Checklist dentro de cada tarefa
- Story points, prioridade, responsável, datas

### 📅 Roadmap & Gantt
Marcos do projeto com datas e status de conclusão — visão cronológica de onde o projeto está.

### ⚠️ Gestão de Riscos
Matriz de probabilidade × impacto com **score automático**. Heatmap visual. Plano de resposta para cada risco.

### 👥 Acesso de Clientes
Clientes externos veem **apenas os projetos liberados** pra eles — sem ver os internos.

---

## 🖥️ 14 telas prontas no frontend

Login → Dashboard → Lista de projetos → e dentro de cada projeto:

**Visão Geral · Charter · WBS · Kanban · Backlog · Roadmap · Gantt · Riscos · Configurações**

---

## 📊 Números da semana

| | |
|---|---|
| Módulos de backend | **8** (auth, users, projects, tasks, charter, wbs, risks, milestones) |
| Endpoints de API | **~35** |
| Telas no frontend | **14** |
| Tabelas no banco | **12** |
| Linhas de código | **~5.000+** |

---

## 🚀 O que vem a seguir

Dashboard com métricas reais, notificações, relatórios exportáveis, e integração com os fluxos de R&D da Bioinfood.
