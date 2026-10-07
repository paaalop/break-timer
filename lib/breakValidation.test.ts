import { describe, expect, it } from 'vitest';
import type { WorkSchedule } from '@/types';
import { autoAssignBreaks, getBreakDurationMinutes, toMinutes } from './autoBreakAlgo';
import { getBreakIssues, getBreakTimeTable, getSlotBreakUnavailableReason } from './breakValidation';

const base: WorkSchedule = {
  id: '1', employee_id: '1', work_date: '2026-10-07', shift_type: 'open',
  start_time: '10:30', end_time: '20:00', break_start_time: null, break_end_time: null,
  created_at: '', updated_at: '',
  employee: { id: '1', name: '직원', available_roles: ['manager', 'cashier', 'pass'],
    available_days: [], default_shift_types: ['open'], is_deleted: false, created_at: '' },
};

describe('shared break duration rules', () => {
  it('retains the full-time and part-time threshold rules', () => {
    expect(getBreakDurationMinutes(base)).toBe(90);
    expect(getBreakDurationMinutes({ ...base, shift_type: 'part_close', end_time: '14:29' })).toBe(0);
    expect(getBreakDurationMinutes({ ...base, shift_type: 'part_open', end_time: '14:30' })).toBe(30);
    expect(getBreakDurationMinutes({ ...base, shift_type: 'part', end_time: '18:29' })).toBe(30);
    expect(getBreakDurationMinutes({ ...base, shift_type: 'part', end_time: '18:30' })).toBe(90);
  });
  it('rounds minor breaks up to 30 minutes and uses the same duration in automatic allocation', () => {
    const minor = { ...base, end_time: '18:01', employee: { ...base.employee!, is_minor: true } };
    expect(getBreakDurationMinutes(minor)).toBe(60);
    expect(getBreakDurationMinutes({ ...minor, end_time: '14:30' })).toBe(30);
    expect(getBreakDurationMinutes({ ...minor, end_time: '14:29' })).toBe(0);
    for (const employee of [base, minor, { ...base, shift_type: 'part' as const, end_time: '15:00' }]) {
      const { start, end } = autoAssignBreaks([employee], '14:00').allocations[employee.employee_id];
      expect(toMinutes(end) - toMinutes(start)).toBe(getBreakDurationMinutes(employee));
    }
  });
});

describe('manual break issues', () => {
  it('reports unassigned breaks only for shifts needing a break', () => {
    expect(getBreakIssues(base)).toEqual(['휴게 미배치']);
    expect(getBreakIssues({ ...base, shift_type: 'part_close', start_time: '18:30', end_time: '21:30' })).toEqual([]);
  });
  it('checks the shared duration rules including minor rounding', () => {
    const assigned = { ...base, break_start_time: '14:00', break_end_time: '14:30' };
    expect(getBreakIssues(assigned)).toEqual(['휴게시간 부족 · 기준 90분 / 배치 30분']);
    expect(getBreakIssues({ ...assigned, shift_type: 'part_open', end_time: '15:00' })).toEqual([]);
    expect(getBreakIssues({ ...assigned, end_time: '18:01', employee: { ...base.employee!, is_minor: true } }))
      .toEqual(['휴게시간 부족 · 기준 60분 / 배치 30분']);
  });
  it('reports incomplete, reversed and out-of-work breaks', () => {
    expect(getBreakIssues({ ...base, break_start_time: '14:00' })).toEqual(['휴게 시작·종료 시간을 모두 입력하세요.']);
    expect(getBreakIssues({ ...base, break_start_time: '15:00', break_end_time: '14:00' })).toEqual(['휴게 종료는 시작보다 늦어야 합니다.']);
    expect(getBreakIssues({ ...base, break_start_time: '10:00', break_end_time: '11:30' })).toEqual(['휴게가 근무시간을 벗어납니다.']);
    expect(getBreakIssues({ ...base, break_start_time: '14:00:00', break_end_time: '15:30:00' })).toEqual([]);
  });
});

describe('slot eligibility', () => {
  it('rejects shifts without breaks and starts before arrival or too close to departure', () => {
    expect(getSlotBreakUnavailableReason({ ...base, end_time: '14:00' }, 660)).toBe('휴게 대상이 아닙니다.');
    expect(getSlotBreakUnavailableReason(base, 600)).toBe('출근 전에는 배치할 수 없습니다.');
    expect(getSlotBreakUnavailableReason(base, 1140)).toBe('퇴근 전까지 휴게시간을 확보할 수 없습니다.');
    expect(getSlotBreakUnavailableReason(base, 1110)).toBeNull();
    expect(getSlotBreakUnavailableReason(base, 630)).toBeNull();
  });
});

describe('fixed 30-minute timeline and precise coverage', () => {
  it('starts at the selected time in 30-minute steps', () => {
    const rows = getBreakTimeTable([base], '13:30');
    expect(rows[0].timeStr).toBe('13:30 ~ 14:00');
    expect(rows.at(-1)!.timeStr).toBe('19:30 ~ 20:00');
    expect(rows.every((r) => r.endMin - r.startMin === 30)).toBe(true);
  });
  it('hides only trailing empty slots after all required employees have valid breaks', () => {
    const rows = getBreakTimeTable([
      { ...base, break_start_time: '14:00', break_end_time: '15:30' },
      { ...base, id: '2', employee_id: '2', break_start_time: '16:00', break_end_time: '17:30' },
      { ...base, id: '3', employee_id: '3', shift_type: 'part_open', end_time: '13:00' },
    ], '14:00');
    expect(rows.at(-1)!.timeStr).toBe('17:00 ~ 17:30');
    expect(rows.find((r) => r.startMin === 930)!.onBreak).toEqual([]);
    expect(rows.some((r) => r.startMin >= 1050)).toBe(false);
  });
  it('keeps later slots available when a required break is missing or invalid', () => {
    const assigned = { ...base, break_start_time: '14:00', break_end_time: '15:30' };
    for (const incomplete of [
      { ...base, id: '2', employee_id: '2' },
      { ...base, id: '2', employee_id: '2', break_start_time: '14:00', break_end_time: '14:30' },
      { ...base, id: '2', employee_id: '2', break_start_time: '19:30', break_end_time: '21:00' },
    ]) {
      expect(getBreakTimeTable([assigned, incomplete], '14:00').at(-1)!.timeStr).toBe('19:30 ~ 20:00');
    }
  });
  it('retains the final partially occupied slot and returns no trailing slots after the selected start', () => {
    const assigned = { ...base, break_start_time: '14:10', break_end_time: '15:40' };
    expect(getBreakTimeTable([assigned], '14:00').at(-1)!.timeStr).toBe('15:30 ~ 16:00');
    expect(getBreakTimeTable([assigned], '16:00')).toEqual([]);
  });
  it('shows the full working day before any break and does not warn about roles without actual breaks', () => {
    const rows = getBreakTimeTable([{ ...base, employee: { ...base.employee!, available_roles: [] } }]);
    expect(rows).toHaveLength(19);
    expect(rows[0].timeStr).toBe('10:30 ~ 11:00');
    expect(rows.at(-1)!.timeStr).toBe('19:30 ~ 20:00');
    expect(rows.every((r) => r.endMin - r.startMin === 30 && r.warnings.length === 0)).toBe(true);
    expect(getBreakTimeTable([])).toEqual([]);
  });
  it('catches short role gaps without splitting clickable slots', () => {
    const rows = getBreakTimeTable([
      { ...base, break_start_time: '14:10', break_end_time: '15:40' },
      { ...base, id: '2', employee_id: '2', end_time: '14:20', employee: { ...base.employee!, id: '2', available_roles: ['cashier'] } },
    ]);
    const slot = rows.find((r) => r.timeStr === '14:00 ~ 14:30')!;
    expect(slot.warnings).toEqual([
      { timeStr: '14:10 ~ 14:20', startMin: 850, endMin: 860, missingRoles: ['manager', 'pass'] },
      { timeStr: '14:20 ~ 14:30', startMin: 860, endMin: 870, missingRoles: ['manager', 'cashier', 'pass'] },
    ]);
    expect(slot.onBreak.map((s) => s.id)).toEqual(['1']);
    expect(slot.working.map((s) => s.id)).toEqual(['1', '2']);
    const lastBreakSlot = rows.find((r) => r.startMin === 930)!;
    expect(lastBreakSlot.warnings[0].timeStr).toBe('15:30 ~ 15:40');
    expect(rows.find((r) => r.startMin === 960)).toBeUndefined();
  });
  it('reflects a 90-minute break in three slots and clears warnings when roles are covered', () => {
    const schedules = [
      { ...base, break_start_time: '14:00', break_end_time: '15:30' },
      { ...base, id: '2', employee_id: '2' },
    ];
    const rows = getBreakTimeTable(schedules);
    expect(rows.filter((r) => r.onBreak.length).map((r) => r.startMin)).toEqual([840, 870, 900]);
    expect(rows.every((r) => r.warnings.length === 0)).toBe(true);
  });
});
