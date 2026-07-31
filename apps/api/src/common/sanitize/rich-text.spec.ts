import { describe, it, expect } from 'vitest';
import { sanitizeRichText, sanitizeRichTextFields, richTextToPlain } from './rich-text';

describe('sanitizeRichText', () => {
  it('should strip script tags and their content when html carries a script', () => {
    const dirty = '<p>Olá</p><script>alert("xss")</script>';

    const clean = sanitizeRichText(dirty);

    expect(clean).toBe('<p>Olá</p>');
    expect(clean).not.toContain('alert');
  });

  it('should drop javascript: hrefs when a link tries to execute code', () => {
    const dirty = '<a href="javascript:alert(1)">clique</a>';

    const clean = sanitizeRichText(dirty);

    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('clique');
  });

  it('should drop inline event handlers when markup carries onerror', () => {
    const dirty = '<p onclick="steal()">texto</p><img src=x onerror="alert(1)">';

    const clean = sanitizeRichText(dirty);

    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('onerror');
    expect(clean).not.toContain('<img');
  });

  it('should drop iframes and style blocks when html embeds them', () => {
    const dirty = '<iframe src="https://evil.test"></iframe><style>body{display:none}</style><p>ok</p>';

    const clean = sanitizeRichText(dirty);

    expect(clean).toBe('<p>ok</p>');
  });

  it('should keep the formatting the editor produces when html is legitimate', () => {
    const dirty =
      '<h2>Objetivos</h2><ol><li><p>Isolar a cepa</p><ul><li><p>Coletar amostras</p></li></ul></li></ol>' +
      '<p><strong>negrito</strong> <em>itálico</em> <s>riscado</s></p>';

    const clean = sanitizeRichText(dirty);

    expect(clean).toContain('<h2>Objetivos</h2>');
    expect(clean).toContain('<ol>');
    expect(clean).toContain('<ul>');
    expect(clean).toContain('<strong>negrito</strong>');
    expect(clean).toContain('<em>itálico</em>');
    expect(clean).toContain('<s>riscado</s>');
  });

  it('should keep task list markers when content has a checklist', () => {
    const dirty =
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>feito</p></li></ul>';

    const clean = sanitizeRichText(dirty);

    expect(clean).toContain('data-type="taskList"');
    expect(clean).toContain('data-checked="true"');
  });

  it('should force external links to open safely when a link is kept', () => {
    const dirty = '<a href="https://bioinfood.test">site</a>';

    const clean = sanitizeRichText(dirty);

    expect(clean).toContain('target="_blank"');
    expect(clean).toContain('rel="noopener noreferrer"');
  });

  it('should leave plain text untouched when the field predates the editor', () => {
    const legacy = 'Isolar a cepa produtora e escalonar para 5 L.';

    expect(sanitizeRichText(legacy)).toBe(legacy);
  });

  it('should pass null and undefined through when the field is empty', () => {
    expect(sanitizeRichText(null)).toBeNull();
    expect(sanitizeRichText(undefined)).toBeUndefined();
  });
});

describe('sanitizeRichTextFields', () => {
  it('should sanitize only the listed keys when the object mixes types', () => {
    const data = {
      problem: '<p>ok</p><script>alert(1)</script>',
      priority: 'Alta',
      budget: 1200,
    };

    const clean = sanitizeRichTextFields(data, ['problem']);

    expect(clean.problem).toBe('<p>ok</p>');
    expect(clean.priority).toBe('Alta');
    expect(clean.budget).toBe(1200);
  });

  it('should not touch keys absent from the payload when a field was not sent', () => {
    const data: { problem?: string; scope?: string } = { problem: '<p>a</p>' };

    const clean = sanitizeRichTextFields(data, ['problem', 'scope']);

    expect('scope' in clean).toBe(false);
  });
});

describe('richTextToPlain', () => {
  it('should return searchable text when html has markup', () => {
    const html = '<h2>Escopo</h2><ul><li><p>Item um</p></li><li><p>Item dois</p></li></ul>';

    expect(richTextToPlain(html)).toBe('Escopo Item um Item dois');
  });

  it('should return empty string when content is null', () => {
    expect(richTextToPlain(null)).toBe('');
  });
});
