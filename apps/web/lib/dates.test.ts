import { describe, expect, it } from 'vitest';
import { formatDay, parseCalendarDate, todayInSaoPaulo } from './dates';

describe('parseCalendarDate', () => {
  it('should keep the calendar day of a plain date string', () => {
    expect(parseCalendarDate('2026-10-01').getDate()).toBe(1);
  });

  it('should keep the calendar day of an ISO timestamp in UTC', () => {
    expect(parseCalendarDate('2026-10-01T00:00:00.000Z').getDate()).toBe(1);
  });
});

describe('formatDay', () => {
  it('should format the same calendar day the API sent', () => {
    expect(formatDay('2026-10-01', { day: '2-digit', month: '2-digit', year: 'numeric' }))
      .toBe('01/10/2026');
  });

  it('should not shift the day for an ISO timestamp at UTC midnight', () => {
    expect(formatDay('2026-10-01T00:00:00.000Z', { day: '2-digit', month: '2-digit', year: 'numeric' }))
      .toBe('01/10/2026');
  });
});

describe('todayInSaoPaulo', () => {
  it('should return the Brazilian day when UTC has already rolled over', () => {
    // 01:30 UTC de 02/10 ainda é 22:30 de 01/10 em Brasília (UTC-3).
    expect(todayInSaoPaulo(new Date('2026-10-02T01:30:00.000Z'))).toBe('2026-10-01');
  });

  it('should return a sortable YYYY-MM-DD string', () => {
    expect(todayInSaoPaulo(new Date('2026-03-09T15:00:00.000Z'))).toBe('2026-03-09');
  });
});
