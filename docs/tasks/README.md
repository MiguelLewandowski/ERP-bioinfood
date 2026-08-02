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

### CRM — Importação (planejamento futuro)
- [ ] [Importar contatos/empresas/negócios de planilha do Agendor](feat-importar-planilha-agendor.md) — feature · api/web · alta · 🔍 triagem — **só planejar, sem arquivo de exemplo ainda**

## Lote CRM de 2026-07-31 — concluído

As demais 20 anotações do lote de CRM (breadcrumb, funil, tarefas, congelamento,
timeline por oportunidade, tags de status, nomenclatura negócio→oportunidade,
persistência de rascunho ao fechar modal) foram implementadas na sessão de
2026-07-31 e os documentos de tarefa removidos. Duas notas que não viraram
arquivo por não terem alvo identificável na anotação ("adicionar uma tela",
"contatos") foram descartadas a pedido do desenvolvedor.

Decisão de escopo tomada durante a implementação, registrada aqui por não
estar em nenhum outro doc:
- **Remoção de ponderação (`probability`) do funil**: só saiu da UI (config de
  funil, card do kanban, dialog, métrica "Ponderado" do resumo) — a coluna
  continua no banco, sem migration destrutiva.

"Categoria do funil" (esclarecido depois: são as etapas dentro de cada funil,
tipo "To Do"/"Em andamento") — a tela de config só permitia adicionar/excluir
etapa, não renomear uma já existente. Adicionado edição inline do nome em
`funis-client.tsx` (`StageRow`), reaproveitando `pipelinesApi.updateStage`
(a API já aceitava `name`, só faltava expor na UI).
