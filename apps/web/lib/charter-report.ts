import type { ProjectMember } from './project-members';
import { parseCurrencyBRL } from './masks';

export interface CharterPrintField {
  key: string;
  label: string;
}

export interface CharterPrintSection {
  id: string;
  label: string;
  color: string;
  fields: CharterPrintField[];
}

export interface CharterExportValues {
  teamUserIds?: string[];
  infrastructure?: string;
  budget?: string;
  [key: string]: unknown;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function buildCharterHtml(
  values: CharterExportValues,
  sectionIds: string[],
  members: ProjectMember[],
  sections: CharterPrintSection[],
): string {
  const date = new Date().toLocaleDateString('pt-BR');
  const blocks = sections.filter((s) => sectionIds.includes(s.id)).map((section) => {
    let fields: string;
    if (section.id === 'recursos') {
      const teamNames = (values.teamUserIds ?? [])
        .map((id) => members.find((m) => m.id === id)?.name)
        .filter((name): name is string => !!name);
      const rows: Array<[string, string]> = [
        ['Equipe', teamNames.join(', ')],
        ['Infraestrutura', (values.infrastructure ?? '').trim()],
        ['Orçamento estimado', (() => {
          const n = parseCurrencyBRL(values.budget ?? '');
          return n !== undefined ? formatCurrency(n) : '';
        })()],
      ];
      fields = rows
        .filter(([, raw]) => raw)
        .map(([label, raw]) => `<div class="field"><h3>${escapeHtml(label)}</h3><p>${escapeHtml(raw)}</p></div>`)
        .join('');
    } else {
      fields = section.fields
        .map(({ key, label }) => {
          const raw = (values[key] ?? '').toString().trim();
          if (!raw) return '';
          return `<div class="field"><h3>${escapeHtml(label)}</h3><p>${escapeHtml(raw)}</p></div>`;
        })
        .join('');
    }
    if (!fields) return '';
    return `<section><h2 style="color:${section.color}">${escapeHtml(section.label)}</h2>${fields}</section>`;
  }).join('');

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Termo de Abertura do Projeto</title>
<style>
  @page { margin: 24mm 18mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1D1D1B; font-size: 12px; line-height: 1.5; }
  header { border-bottom: 3px solid #147F23; padding-bottom: 12px; margin-bottom: 20px; }
  header h1 { color: #147F23; font-size: 20px; margin: 0 0 4px; }
  header p { color: #706F6F; font-size: 11px; margin: 0; }
  section { page-break-inside: avoid; margin-bottom: 22px; }
  section h2 { font-size: 14px; margin: 0 0 10px; padding-bottom: 4px; border-bottom: 1px solid #E5E5E5; }
  .field { margin-bottom: 12px; }
  .field h3 { font-size: 12px; color: #1D1D1B; margin: 0 0 2px; }
  .field p { margin: 0; color: #575756; white-space: normal; }
</style></head>
<body>
  <header>
    <h1>Termo de Abertura do Projeto</h1>
    <p>Bioinfood &middot; Gerado em ${date}</p>
  </header>
  ${blocks || '<p>Nenhuma seção com conteúdo selecionada.</p>'}
</body></html>`;
}
