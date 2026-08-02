import type { ProjectMember } from './project-members';
import { parseCurrencyBRL } from './masks';

export interface CharterPrintField {
  key: string;
  label: string;
  /**
   * Campo gravado como HTML pelo editor rico. Vai para a impressão SEM escapar
   * — ver `renderRich` para por que isso não é um furo de XSS aqui.
   */
  rich?: boolean;
}

/** Item da checklist de recursos, para a seção 6 do PDF. */
export interface CharterPrintEquipment {
  checked: boolean;
  item: { name: string; code: string | null; category: { name: string } };
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

/**
 * Conteúdo de campo rico, já em HTML, entra na impressão sem escapar — senão o
 * PDF sairia com `<ul>` e `<strong>` literais no lugar da formatação.
 *
 * Por que não é furo de XSS: este HTML veio do banco, e o banco só aceita o que
 * passou pela allowlist do servidor (`apps/api/src/common/sanitize/rich-text.ts`)
 * no `PUT /charter`. `script`, `style`, `on*` e `javascript:` não sobrevivem à
 * escrita, então não existem aqui.
 *
 * Campo que NUNCA passou pelo editor (texto puro escrito antes) continua sendo
 * escapado: sem uma tag sequer, o `looksLikeHtml` dá falso e o caminho seguro
 * é usado.
 */
function renderRich(value: string): string {
  const looksLikeHtml = /<\/?(p|h2|h3|ul|ol|li|strong|em|s|a|br|blockquote|code)\b/i.test(value);
  return looksLikeHtml ? value : `<p>${escapeHtml(value)}</p>`;
}

function renderField(label: string, raw: string, rich?: boolean): string {
  const body = rich ? renderRich(raw) : `<p>${escapeHtml(raw)}</p>`;
  return `<div class="field"><h3>${escapeHtml(label)}</h3><div class="body">${body}</div></div>`;
}

/**
 * Checklist de recursos agrupada por categoria. O estado (providenciado ou não)
 * vai impresso — é a informação que faz a lista valer num documento formal.
 */
function renderEquipment(equipment: CharterPrintEquipment[]): string {
  if (equipment.length === 0) return '';

  const byCategory = new Map<string, CharterPrintEquipment[]>();
  for (const row of equipment) {
    const name = row.item.category.name;
    byCategory.set(name, [...(byCategory.get(name) ?? []), row]);
  }

  const groups = [...byCategory.entries()]
    .map(([category, rows]) => {
      const items = rows
        .map((r) => {
          const mark = r.checked ? '☑' : '☐';
          const code = r.item.code ? ` <span class="code">${escapeHtml(r.item.code)}</span>` : '';
          return `<li>${mark} ${escapeHtml(r.item.name)}${code}</li>`;
        })
        .join('');
      return `<p class="group">${escapeHtml(category)}</p><ul class="checklist">${items}</ul>`;
    })
    .join('');

  const done = equipment.filter((r) => r.checked).length;
  return `<div class="field"><h3>Equipamentos e materiais `
    + `<span class="count">(${done} de ${equipment.length} providenciado${done === 1 ? '' : 's'})</span>`
    + `</h3><div class="body">${groups}</div></div>`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function buildCharterHtml(
  values: CharterExportValues,
  sectionIds: string[],
  members: ProjectMember[],
  sections: CharterPrintSection[],
  equipment: CharterPrintEquipment[] = [],
): string {
  const date = new Date().toLocaleDateString('pt-BR');
  const blocks = sections.filter((s) => sectionIds.includes(s.id)).map((section) => {
    let fields: string;
    if (section.id === 'recursos') {
      const teamNames = (values.teamUserIds ?? [])
        .map((id) => members.find((m) => m.id === id)?.name)
        .filter((name): name is string => !!name);

      const budget = (() => {
        const n = parseCurrencyBRL(values.budget ?? '');
        return n !== undefined ? formatCurrency(n) : '';
      })();

      const infrastructure = (values.infrastructure ?? '').trim();

      fields = [
        teamNames.length > 0 ? renderField('Equipe', teamNames.join(', ')) : '',
        renderEquipment(equipment),
        infrastructure ? renderField('Observações de infraestrutura', infrastructure, true) : '',
        budget ? renderField('Orçamento estimado', budget) : '',
      ].join('');
    } else {
      fields = section.fields
        .map(({ key, label, rich }) => {
          const raw = (values[key] ?? '').toString().trim();
          if (!raw) return '';
          return renderField(label, raw, rich);
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
  .field .body { color: #575756; }
  .field .body p { margin: 0 0 6px; white-space: normal; }
  .field .body p:last-child { margin-bottom: 0; }

  /* Hierarquia dos campos ricos. Sem isto o PDF sairia com todo o conteúdo
     achatado num bloco só — a formatação apareceria na tela e sumiria no
     documento, que é justamente o que a reunião pediu para resolver. */
  .field .body h2 { font-size: 12.5px; color: #1D1D1B; margin: 8px 0 3px; padding: 0; border: 0; }
  .field .body h3 { font-size: 12px; color: #1D1D1B; margin: 6px 0 2px; }
  .field .body ul, .field .body ol { margin: 4px 0 6px; padding-left: 18px; }
  .field .body li { margin-bottom: 2px; }
  .field .body li > p { margin: 0; }
  .field .body strong { color: #1D1D1B; }
  .field .body blockquote { margin: 6px 0; padding-left: 8px; border-left: 2px solid #E5E5E5; font-style: italic; }
  .field .body a { color: #147F23; }
  /* Checklist do editor: o marcador é o checkbox, então o bullet sai. */
  .field .body ul[data-type="taskList"] { list-style: none; padding-left: 2px; }
  .field .body ul[data-type="taskList"] li[data-checked="true"] { color: #878787; text-decoration: line-through; }

  /* Checklist de equipamentos (seção Recursos). */
  .field .body p.group { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: #878787; margin: 8px 0 2px; }
  .field .body ul.checklist { list-style: none; padding-left: 2px; margin: 0 0 6px; }
  .field .body ul.checklist .code { color: #878787; font-size: 11px; }
  .field h3 .count { font-weight: normal; color: #706F6F; font-size: 11px; }
</style></head>
<body>
  <header>
    <h1>Termo de Abertura do Projeto</h1>
    <p>Bioinfood &middot; Gerado em ${date}</p>
  </header>
  ${blocks || '<p>Nenhuma seção com conteúdo selecionada.</p>'}
</body></html>`;
}
