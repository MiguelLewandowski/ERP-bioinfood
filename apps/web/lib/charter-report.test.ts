import { describe, it, expect } from 'vitest';
import {
  buildCharterHtml,
  type CharterPrintSection,
  type CharterPrintEquipment,
} from './charter-report';

const SECTIONS: CharterPrintSection[] = [
  {
    id: 'contexto',
    label: 'Contexto',
    color: '#147F23',
    fields: [
      { key: 'problem', label: 'Problema', rich: true },
      { key: 'legacyPlain', label: 'Campo simples' },
    ],
  },
  { id: 'recursos', label: 'Recursos e Orçamento', color: '#DD8005', fields: [] },
];

const ALL = SECTIONS.map((s) => s.id);

describe('buildCharterHtml — campos ricos', () => {
  it('should keep the markup when the field is rich', () => {
    const html = buildCharterHtml(
      { problem: '<h2>Custo</h2><ul><li><p>Insumo caro</p></li></ul>' },
      ALL, [], SECTIONS,
    );

    expect(html).toContain('<h2>Custo</h2>');
    expect(html).toContain('<ul><li><p>Insumo caro</p></li></ul>');
    // Se escapasse, o PDF sairia com as tags visíveis no lugar da formatação.
    expect(html).not.toContain('&lt;h2&gt;');
  });

  it('should wrap plain text in a paragraph when the rich field predates the editor', () => {
    const html = buildCharterHtml({ problem: 'Texto escrito antes do editor' }, ALL, [], SECTIONS);

    expect(html).toContain('<p>Texto escrito antes do editor</p>');
  });

  it('should escape dangerous markup when a legacy plain value contains tags', () => {
    // Campo não-rico continua no caminho seguro de sempre.
    const html = buildCharterHtml({ legacyPlain: '<script>alert(1)</script>' }, ALL, [], SECTIONS);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('should escape a rich field that has no markup at all', () => {
    // Sem tag reconhecível o valor não é tratado como HTML — é o que impede
    // texto puro suspeito de atravessar pelo caminho do `rich`.
    const html = buildCharterHtml({ problem: 'a < b e c > d' }, ALL, [], SECTIONS);

    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
  });
});

describe('buildCharterHtml — checklist de equipamentos', () => {
  const EQUIPMENT: CharterPrintEquipment[] = [
    { checked: true, item: { name: 'Autoclave 75 L', code: 'BIO-0042', category: { name: 'Equipamento' } } },
    { checked: false, item: { name: 'Centrífuga', code: null, category: { name: 'Equipamento' } } },
  ];

  it('should print each item with its checked state when the project has a checklist', () => {
    const html = buildCharterHtml({}, ALL, [], SECTIONS, EQUIPMENT);

    expect(html).toContain('Autoclave 75 L');
    expect(html).toContain('BIO-0042');
    expect(html).toContain('Centrífuga');
    expect(html).toContain('☑');
    expect(html).toContain('☐');
  });

  it('should report the providenciado count when the checklist is partial', () => {
    const html = buildCharterHtml({}, ALL, [], SECTIONS, EQUIPMENT);

    expect(html).toContain('1 de 2 providenciado');
  });

  it('should group the items by category when several categories exist', () => {
    const mixed: CharterPrintEquipment[] = [
      ...EQUIPMENT,
      { checked: false, item: { name: 'Pipeta 1000 µL', code: null, category: { name: 'Vidraria' } } },
    ];

    const html = buildCharterHtml({}, ALL, [], SECTIONS, mixed);

    expect(html).toContain('Equipamento');
    expect(html).toContain('Vidraria');
  });

  it('should omit the section when nothing was filled in', () => {
    const html = buildCharterHtml({}, ALL, [], SECTIONS, []);

    expect(html).not.toContain('Recursos e Orçamento');
  });

  it('should escape the item name when it contains markup', () => {
    const nasty: CharterPrintEquipment[] = [
      { checked: false, item: { name: '<img src=x onerror=alert(1)>', code: null, category: { name: 'Equipamento' } } },
    ];

    const html = buildCharterHtml({}, ALL, [], SECTIONS, nasty);

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});
