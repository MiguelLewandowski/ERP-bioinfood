---
tipo: feature
escopo: api/web
complexidade: alta (palpite)
status: triagem
criada: 2026-07-31
tema: crm-importacao
---

# Importar empresas/contatos/negócios de planilha exportada do Agendor

## Anotação original
> CRM Adicionar import baseado no arquivo do agendor - só planejar no futuro eu anexo o arquivo

## Alvo provável
Nenhum ainda — feature nova, sem código existente. O próprio desenvolvedor
marcou como **só planejamento futuro**: "eu anexo o arquivo" depois.

## O que precisa ser investigado
- **Não aprofundar até o arquivo de exemplo do Agendor ser anexado** — o
  mapeamento de colunas depende inteiramente do shape real da planilha
  exportada, que ninguém tem ainda.
- Quando o arquivo chegar: mapear colunas → `Organization`/`Contact`/
  `Opportunity`, decidir estratégia de deduplicação (CNPJ? nome?), decidir se é
  upload de CSV/XLSX e onde roda o parser (API, para não travar o browser com
  arquivo grande).

> ⚠️ Documento em triagem — **não implementar, e não aprofundar ainda**: falta o
> arquivo de exemplo do Agendor que o próprio desenvolvedor vai anexar.
