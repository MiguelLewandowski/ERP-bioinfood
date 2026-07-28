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

/**
 * O valor carrega um horário de verdade, ou é só um dia de calendário?
 *
 * Dia puro é gravado como meia-noite **UTC** (`'2026-08-10'` → `00:00:00.000Z`),
 * então a checagem é pelos componentes UTC. Fazer isso pelo horário LOCAL é o
 * erro clássico: em `America/Sao_Paulo`, `00:00Z` é 21:00 do dia anterior, e um
 * registro sem hora passaria por "tem hora 21:00".
 *
 * Ver docs/incidentes/timezone-cronograma.md.
 */
export function hasTimeComponent(value: string | Date | null | undefined): boolean {
  if (!value) return false;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  return d.getUTCHours() !== 0
    || d.getUTCMinutes() !== 0
    || d.getUTCSeconds() !== 0
    || d.getUTCMilliseconds() !== 0;
}

/** Formata um campo de dia em pt-BR já protegido do deslocamento de fuso. */
export function formatDay(
  value: string,
  options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' },
): string {
  return parseCalendarDate(value).toLocaleDateString('pt-BR', options);
}

/**
 * O dia de HOJE no fuso da operação (America/Sao_Paulo), como 'YYYY-MM-DD'.
 *
 * `new Date().toISOString().slice(0, 10)` devolve o dia em UTC — num servidor
 * em UTC, das 21h às 24h de Brasília isso já é "amanhã", e tudo que compara
 * prazo com "hoje" erra por um dia. Sempre usar esta função como referência.
 */
export function todayInSaoPaulo(now: Date = new Date()): string {
  // 'en-CA' formata como YYYY-MM-DD, que é ordenável como string.
  return now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}
