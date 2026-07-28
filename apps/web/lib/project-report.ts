import type { ProjectDto, ProjectStatus } from '@bioinfood/shared';
import { formatDay } from './dates';

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNING: 'Planejamento',
  IN_PROGRESS: 'Em andamento',
  ON_HOLD: 'Pausado',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

function fmtDate(value: string | null): string {
  return value ? formatDay(value, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';
}

export type ProjectColumnKey =
  | 'name' | 'status' | 'client' | 'start' | 'end' | 'forecastEnd'
  | 'owner' | 'members' | 'objective' | 'description';

interface ColumnDef {
  key: ProjectColumnKey;
  label: string;
  value: (p: ProjectDto) => string;
}

export const PROJECT_COLUMNS: ColumnDef[] = [
  { key: 'name',        label: 'Projeto',     value: (p) => p.name },
  { key: 'status',      label: 'Status',      value: (p) => PROJECT_STATUS_LABELS[p.status] ?? p.status },
  { key: 'client',      label: 'Cliente',     value: (p) => p.client?.tradeName ?? p.client?.legalName ?? '—' },
  { key: 'start',       label: 'Início',            value: (p) => fmtDate(p.startDate) },
  { key: 'end',         label: 'Término (plan.)',   value: (p) => fmtDate(p.endDate) },
  { key: 'forecastEnd', label: 'Término (est.)',    value: (p) => fmtDate(p.forecastEndDate) },
  { key: 'owner',       label: 'Responsável', value: (p) => p.createdBy?.name ?? '—' },
  { key: 'members',     label: 'Membros',     value: (p) => String(p.accesses?.length ?? 0) },
  { key: 'objective',   label: 'Objetivo',    value: (p) => p.objective ?? '—' },
  { key: 'description', label: 'Descrição',   value: (p) => p.description ?? '—' },
];

// Colunas exibidas/exportadas por padrão.
export const DEFAULT_COLUMN_KEYS: ProjectColumnKey[] = [
  'name', 'status', 'client', 'start', 'end', 'forecastEnd', 'owner', 'members',
];

function selectedColumns(keys: ProjectColumnKey[]): ColumnDef[] {
  // Mantém a ordem do catálogo, filtrando pelas chaves selecionadas.
  return PROJECT_COLUMNS.filter((c) => keys.includes(c.key));
}

function csvCell(value: string): string {
  const needsQuote = /[",;\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export function buildProjectsCsv(projects: ProjectDto[], keys: ProjectColumnKey[]): string {
  const cols = selectedColumns(keys);
  const header = cols.map((c) => csvCell(c.label)).join(';');
  const lines = projects.map((p) => cols.map((c) => csvCell(c.value(p))).join(';'));
  // BOM para o Excel reconhecer UTF-8.
  return `﻿${[header, ...lines].join('\r\n')}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function buildProjectsReportHtml(projects: ProjectDto[], keys: ProjectColumnKey[]): string {
  const cols = selectedColumns(keys);
  const date = new Date().toLocaleDateString('pt-BR');
  const head = cols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join('');
  const body = projects
    .map((p) => `<tr>${cols.map((c) => `<td>${escapeHtml(c.value(p))}</td>`).join('')}</tr>`)
    .join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Relatório de Projetos</title>
<style>
  @page { margin: 16mm; size: A4 landscape; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1D1D1B; font-size: 12px; }
  header { border-bottom: 3px solid #147F23; padding-bottom: 12px; margin-bottom: 18px; }
  header h1 { color: #147F23; font-size: 20px; margin: 0 0 4px; }
  header p { color: #706F6F; font-size: 11px; margin: 0; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #E5E5E5; vertical-align: top; }
  th { background: #F5F5F5; color: #575756; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
  tr:nth-child(even) td { background: #FAFAFA; }
</style></head>
<body>
  <header>
    <h1>Relatório de Projetos</h1>
    <p>Bioinfood &middot; ${projects.length} ${projects.length === 1 ? 'projeto' : 'projetos'} &middot; Gerado em ${date}</p>
  </header>
  <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}

export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function printHtml(html: string): void {
  const win = window.open('', '_blank'); // aba nova, não pop-up
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.onload = () => win.print();
  setTimeout(() => win.print(), 500);
}
