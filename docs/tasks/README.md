# Tarefas

Fila de tarefas detalhadas a partir de anotações cruas do desenvolvedor.
Cada arquivo é **autocontido**: descreve o bug/feature, a causa, os arquivos
envolvidos, o plano e os critérios de aceite.

- Criar tarefa: `/nova-tarefa <anotação do bug ou melhoria>`
- Lote grande (7+ anotações): `/nova-tarefa` entra em **triagem** — cria o esqueleto de todas e aprofunda sob demanda
- Aprofundar: `/nova-tarefa aprofundar docs/tasks/<arquivo>.md`
- Implementar: `/implementar-plano docs/tasks/<arquivo>.md`

Nomenclatura: `bug-<slug>.md` · `feat-<slug>.md`

Status: **🔍 triagem** = só o esqueleto, tipo/escopo/complexidade são palpite — **não implementar**.
**✅ detalhada** = investigada, com causa, plano e critérios de aceite.

## Índice

### Bugs
- [ ] [Nomes de ADMIN não aparecem nos selects de responsável](bug-admin-nao-aparece-nos-selects.md) — bug · api · baixa · 🔍 triagem
- [ ] [Não deixa mudar tarefa de TODO para DONE ao salvar](bug-nao-salva-status-todo-para-done.md) — bug · web · média · 🔍 triagem

### Qualidade
- [x] [Estabilizar a suíte web, que falha de forma não determinística sob carga](test-suite-web-instavel-sob-carga.md) — bug · web · baixa · ✅ CONCLUÍDA 2026-07-29

### Projeto / TAP
- [ ] [Adicionar tipos de projeto (INTERNO, PARCERIA, CONTRATO, SERVIÇO, SUBVENÇÃO)](feat-tipos-de-projeto.md) — feature · db · média · 🔍 triagem
- [ ] [Retirar o campo "Restrições" do TAP](feat-remover-restricoes-tap.md) — feature · web · baixa · 🔍 triagem
- [ ] [Criar seção de Riscos no TAP, com atalho para a aba Riscos](feat-secao-riscos-no-tap.md) — feature · web · baixa · 🔍 triagem
- [ ] [Adicionar ordenação e hierarquia de texto nas caixas do TAP](feat-hierarquia-texto-tap.md) — feature · web · alta · 🔍 triagem

### Tarefas
- [ ] [Padronizar o formulário de nova tarefa do "Novo" global com o do Backlog](feat-padronizar-form-nova-tarefa.md) — feature · web · baixa · 🔍 triagem
- [ ] [Permitir mais de um responsável por tarefa](feat-multiplos-responsaveis-tarefa.md) — feature · db · alta · 🔍 triagem

### Riscos
- [ ] [Permitir mais de um responsável por risco](feat-multiplos-responsaveis-risco.md) — feature · db · média · 🔍 triagem

### Stakeholders
- [ ] [Stakeholder: tornar o contato opcional e permitir digitar só o nome](feat-stakeholder-contato-opcional.md) — feature · db · média · 🔍 triagem

### Atividades
- [ ] [Calendário: ver todas as atividades do dia sem precisar clicar](feat-calendario-mostrar-mais-atividades.md) — feature · web · baixa · 🔍 triagem
- [ ] [Melhoria visual da tela de Atividades](feat-melhoria-visual-atividades.md) — feature · web · média · 🔍 triagem

### Gantt
- [ ] [Manter a barra de rolagem horizontal sempre visível](feat-gantt-barra-horizontal-fixa.md) — feature · web · baixa · 🔍 triagem
- [ ] [Tentar adicionar desfazer (Ctrl+Z)](feat-gantt-ctrl-z.md) — feature · web · alta · 🔍 triagem
- [x] [Aplicar o PATCH condicional também aos marcos](bug-gantt-marco-grava-sem-comparar.md) — bug · web · baixa · ✅ CONCLUÍDA 2026-07-29
- [x] [Reduzir a escrita de reordenar, que reescreve o projeto inteiro](perf-gantt-reordenar-reescreve-projeto-inteiro.md) — feature · web · média · ✅ CONCLUÍDA 2026-07-29

> As duas acima saíram de `docs/incidentes/timezone-cronograma.md` §10. Ler o
> incidente antes de implementar: ele explica por que o Gantt escreve como
> escreve, e o que já foi corrigido ali.

### Estoque (módulo novo)
- [ ] [Checklist de equipamentos no projeto + CRUD de equipamentos](feat-checklist-equipamentos-projeto.md) — feature · api · alta · 🔍 triagem
- [ ] [Adicionar materiais de insumo em Recursos e Orçamento](feat-materiais-insumo-recursos-tap.md) — feature · api · média · 🔍 triagem

### Notas (módulo novo)
- [ ] [Criar módulo de anotações pessoais](feat-modulo-anotacoes-pessoais.md) — feature · api · alta · 🔍 triagem

## Feedback registrado (não é tarefa)

**Reunião de teste — Bruna e Luana, 28/07/2026:** o ERP foi considerado *menos fluido que
o Notion por ter mais abas*. As próprias usuárias atribuíram isso à ambientação a um
sistema novo, não a um defeito. Não vira tarefa agora — mas se reaparecer em outra
reunião, é sinal de problema real de navegação e deve virar `/analisar-uiux`.
