import { describe, it, expect } from 'vitest';
import { fmtDuration } from './gantt-mapping';

describe('fmtDuration', () => {
  it('should show the duration in days', () => {
    expect(fmtDuration(15)).toBe('15d');
  });

  // O caso que a remoção do addDays expôs: com dueDate == startDate a diferença
  // é zero, zero é falsy, e a célula saía vazia.
  it('should show 1d when the task starts and ends on the same day', () => {
    expect(fmtDuration(0)).toBe('1d');
  });

  it('should not fall back to 0d or an empty cell for a zero length task', () => {
    expect(fmtDuration(0)).not.toBe('0d');
    expect(fmtDuration(0)).not.toBe('');
  });

  it('should floor a negative duration at 1d', () => {
    expect(fmtDuration(-3)).toBe('1d');
  });

  it('should show nothing when there is no duration to show', () => {
    expect(fmtDuration(undefined)).toBe('');
    expect(fmtDuration(null)).toBe('');
    expect(fmtDuration('')).toBe('');
  });

  it('should show nothing when the value is not a number', () => {
    expect(fmtDuration('abc')).toBe('');
    expect(fmtDuration(NaN)).toBe('');
  });

  it('should accept a numeric string from the widget', () => {
    expect(fmtDuration('7')).toBe('7d');
  });
});
