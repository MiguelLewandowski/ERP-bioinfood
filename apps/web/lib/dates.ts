// Datas de calendário (prazo, marco, início/fim) representam um DIA, não um
// instante. `new Date('2026-10-01')` — ou o ISO com Z que a API devolve — é
// interpretado como meia-noite UTC; renderizado em America/Sao_Paulo (UTC-3)
// isso vira 30/09. Todo campo de dia deve passar por aqui antes de formatar.

/**
 * Converte um valor de data da API ('2026-10-01' ou '2026-10-01T00:00:00.000Z')
 * na meia-noite LOCAL do mesmo dia do calendário, sem deslocamento de fuso.
 */
export function parseCalendarDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(`${value.slice(0, 10)}T00:00:00`);
}
