import { describe, it, expect } from 'vitest';
import type { ActivityDto } from '@bioinfood/shared';
import {
  anchorDate, formatTime, effectiveInterval, groupByDay, filterActivities,
  EMPTY_FILTERS,
} from './activities';

/**
 * O vitest fixa `TZ: America/Sao_Paulo` (ver vitest.config.ts). Isso importa
 * aqui: os dois defeitos cobertos abaixo só aparecem em fuso negativo, e num CI
 * em UTC estes testes passariam mesmo com o código quebrado.
 */

function makeActivity(over: Partial<ActivityDto> = {}): ActivityDto {
  return {
    id: 'act-1',
    title: 'Lote piloto',
    description: null,
    status: 'IN_PROGRESS',
    priority: 'MEDIUM',
    startDate: null,
    dueDate: null,
    assignee: null,
    project: { id: 'proj-1', name: 'Xarope de xilose' },
    predecessors: [],
    ...over,
  } as ActivityDto;
}

// ── Dia de calendário vs instante ────────────────────────────────────────────
//
// `Task.startDate`/`dueDate` são DIA (CLAUDE.md, seção "Datas"). A API devolve
// meia-noite UTC. Lido como instante em UTC-3, o dia 02 virava 21:00 do dia 01.

describe('anchorDate', () => {
  it('should keep the calendar day when the value is a pure day', () => {
    const date = anchorDate(makeActivity({ startDate: '2026-08-02T00:00:00.000Z' }))!;

    expect(date.getDate()).toBe(2);
    expect(date.getMonth()).toBe(7); // agosto
    expect(date.getHours()).toBe(0);
  });

  it('should keep local time when the value is a real instant', () => {
    // 17:30Z = 14:30 em São Paulo — atividade com hora marcada de verdade.
    const date = anchorDate(makeActivity({ startDate: '2026-08-02T17:30:00.000Z' }))!;

    expect(date.getDate()).toBe(2);
    expect(date.getHours()).toBe(14);
    expect(date.getMinutes()).toBe(30);
  });

  it('should fall back to dueDate when there is no startDate', () => {
    const date = anchorDate(makeActivity({ dueDate: '2026-08-21T00:00:00.000Z' }))!;

    expect(date.getDate()).toBe(21);
  });

  it('should return null when the activity has no dates', () => {
    expect(anchorDate(makeActivity())).toBeNull();
  });
});

describe('formatTime', () => {
  it('should return null when the activity is an all-day one', () => {
    // O defeito: 00:00Z vira 21:00 local, e a checagem antiga (HH:mm !== '00:00')
    // concluía "tem horário" e exibia um 21:00 inexistente.
    expect(formatTime(makeActivity({ startDate: '2026-08-02T00:00:00.000Z' }))).toBeNull();
  });

  it('should return the local time when the activity has a real one', () => {
    expect(formatTime(makeActivity({ startDate: '2026-08-02T17:30:00.000Z' }))).toBe('14:30');
  });
});

describe('effectiveInterval', () => {
  it('should span the exact calendar days when both ends are pure days', () => {
    const iv = effectiveInterval(makeActivity({
      startDate: '2026-08-02T00:00:00.000Z',
      dueDate: '2026-08-21T00:00:00.000Z',
    }))!;

    expect(iv.start.getDate()).toBe(2);
    expect(iv.end.getDate()).toBe(21);
  });

  it('should never end before it starts when the dates are inverted', () => {
    const iv = effectiveInterval(makeActivity({
      startDate: '2026-08-10T00:00:00.000Z',
      dueDate: '2026-08-01T00:00:00.000Z',
    }))!;

    expect(iv.end.getTime()).toBe(iv.start.getTime());
  });
});

// ── A visão Semana escondia o trabalho da semana ─────────────────────────────

describe('groupByDay', () => {
  const week = {
    start: new Date('2026-07-27T00:00:00'),
    end: new Date('2026-08-02T23:59:59'),
  };

  /**
   * O caso real medido no banco de demonstração: cinco atividades COMEÇARAM
   * antes da semana e quatro delas VENCEM dentro dela. A versão anterior
   * agrupava pela data-âncora e descartava todas — o cabeçalho dizia "6 Total"
   * e a lista mostrava uma.
   */
  it('should list an activity that started before the week but is due inside it', () => {
    const anvisa = makeActivity({
      id: 'anvisa',
      title: 'Levantamento regulatório ANVISA',
      startDate: '2026-06-26T00:00:00.000Z',
      dueDate: '2026-07-31T00:00:00.000Z',
    });

    const blocks = groupByDay([anvisa], week);
    const dueDay = blocks.find((b) => b.key === '2026-07-31');

    expect(dueDay?.due.map((a) => a.id)).toEqual(['anvisa']);
  });

  it('should split the day between what is due and what is merely ongoing', () => {
    const ongoing = makeActivity({
      id: 'ongoing',
      startDate: '2026-07-21T00:00:00.000Z',
      dueDate: '2026-08-15T00:00:00.000Z', // vence depois da semana
    });
    const dueToday = makeActivity({
      id: 'due',
      startDate: '2026-07-20T00:00:00.000Z',
      dueDate: '2026-07-30T00:00:00.000Z',
    });

    const blocks = groupByDay([ongoing, dueToday], week);
    const day30 = blocks.find((b) => b.key === '2026-07-30')!;

    expect(day30.due.map((a) => a.id)).toEqual(['due']);
    expect(day30.ongoing.map((a) => a.id)).toEqual(['ongoing']);
  });

  it('should cover every day the activity spans inside the week', () => {
    const spanning = makeActivity({
      startDate: '2026-07-28T00:00:00.000Z',
      dueDate: '2026-07-30T00:00:00.000Z',
    });

    const blocks = groupByDay([spanning], week);

    expect(blocks.map((b) => b.key)).toEqual(['2026-07-28', '2026-07-29', '2026-07-30']);
  });

  it('should clamp to the week when the activity starts before and ends after', () => {
    const long = makeActivity({
      startDate: '2026-01-01T00:00:00.000Z',
      dueDate: '2026-12-31T00:00:00.000Z',
    });

    const blocks = groupByDay([long], week);

    expect(blocks).toHaveLength(7);
    expect(blocks[0].key).toBe('2026-07-27');
    expect(blocks[6].key).toBe('2026-08-02');
    // Nenhum dia da semana é o término, então tudo é "em andamento".
    expect(blocks.every((b) => b.due.length === 0 && b.ongoing.length === 1)).toBe(true);
  });

  it('should drop days with nothing on them', () => {
    const single = makeActivity({ dueDate: '2026-07-29T00:00:00.000Z' });

    const blocks = groupByDay([single], week);

    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe('2026-07-29');
  });

  it('should ignore an activity that has no dates at all', () => {
    expect(groupByDay([makeActivity()], week)).toEqual([]);
  });

  /**
   * O sintoma que denunciava o defeito: o resumo contava sobre a lista
   * filtrada, e a lista mostrava menos. Os dois têm que falar do mesmo conjunto.
   */
  it('should account for every activity the summary counts', () => {
    const activities = [
      makeActivity({ id: 'a', startDate: '2026-06-26T00:00:00.000Z', dueDate: '2026-07-31T00:00:00.000Z' }),
      makeActivity({ id: 'b', startDate: '2026-07-02T00:00:00.000Z', dueDate: '2026-08-02T00:00:00.000Z' }),
      makeActivity({ id: 'c', startDate: '2026-07-06T00:00:00.000Z', dueDate: '2026-07-31T00:00:00.000Z' }),
      makeActivity({ id: 'd', startDate: '2026-07-16T16:30:00.000Z', dueDate: '2026-07-30T17:30:00.000Z' }),
      makeActivity({ id: 'e', startDate: '2026-07-21T00:00:00.000Z', dueDate: '2026-08-15T00:00:00.000Z' }),
      makeActivity({ id: 'f', startDate: '2026-08-02T00:00:00.000Z', dueDate: '2026-08-21T00:00:00.000Z' }),
    ];

    const blocks = groupByDay(activities, week);
    const seen = new Set(blocks.flatMap((b) => [...b.due, ...b.ongoing]).map((a) => a.id));

    expect(seen.size).toBe(6);
  });
});

describe('filterActivities — onlyOverdue', () => {
  const base = { ...EMPTY_FILTERS, currentUserId: 'user-1' };

  it('should keep only the overdue ones when the chip is on', () => {
    const past = makeActivity({ id: 'past', dueDate: '2020-01-01T00:00:00.000Z', status: 'TODO' });
    const future = makeActivity({ id: 'future', dueDate: '2099-01-01T00:00:00.000Z', status: 'TODO' });

    const result = filterActivities([past, future], { ...base, onlyOverdue: true });

    expect(result.map((a) => a.id)).toEqual(['past']);
  });

  it('should not treat a finished activity as overdue', () => {
    const done = makeActivity({ dueDate: '2020-01-01T00:00:00.000Z', status: 'DONE' });

    expect(filterActivities([done], { ...base, onlyOverdue: true })).toEqual([]);
  });

  it('should keep everything when the chip is off', () => {
    const past = makeActivity({ id: 'past', dueDate: '2020-01-01T00:00:00.000Z', status: 'TODO' });

    expect(filterActivities([past], base)).toHaveLength(1);
  });
});
