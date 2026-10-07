import { afterEach, describe, expect, it, vi } from 'vitest';
import { useEmployeeStore } from './useEmployeeStore';
import { useScheduleStore } from './useScheduleStore';
import { autoAssignBreaks } from '@/lib/autoBreakAlgo';
import { SHIFT_DEFAULTS } from '@/lib/constants';
import type { ShiftType, WorkSchedule } from '@/types';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

afterEach(async () => {
  await useScheduleStore.getState().deleteSchedules(useScheduleStore.getState().schedules.map((s) => s.id));
  await useEmployeeStore.getState().softDeleteEmployees(useEmployeeStore.getState().employees.map((e) => e.id));
});

describe('part shift persistence and automatic scheduling', () => {
  it('round-trips employee defaults and generates the correct times for all part types', async () => {
    for (const shift of ['part_open', 'part_close', 'part'] as const) {
      await useEmployeeStore.getState().addEmployee({ name: shift, available_roles: ['cashier'], available_days: [1], default_shift_types: [shift] });
    }
    await useEmployeeStore.getState().fetchEmployees();
    const employees = useEmployeeStore.getState().employees;
    expect(employees.map((e) => e.default_shift_types[0]).sort()).toEqual(['part', 'part_close', 'part_open']);
    useScheduleStore.getState().setWeekStart('2026-10-05');
    await useScheduleStore.getState().autoFillWeekSchedules('2026-10-05', employees);
    const saved = await useScheduleStore.getState().fetchDaySchedules('2026-10-05');
    expect(saved).toHaveLength(3);
    for (const entry of saved) {
      expect(entry.start_time).toBe(SHIFT_DEFAULTS[entry.shift_type].start);
      expect(entry.end_time).toBe(SHIFT_DEFAULTS[entry.shift_type].end);
      expect(entry.employee?.default_shift_types[0]).toBe(entry.shift_type);
    }
    const employee = employees.find((e) => e.default_shift_types[0] === 'part_open')!;
    await useEmployeeStore.getState().updateEmployee(employee.id, { default_shift_types: ['part_close'] });
    await useEmployeeStore.getState().fetchEmployees();
    expect(useEmployeeStore.getState().employees.find((e) => e.id === employee.id)?.default_shift_types).toEqual(['part_close']);
  });

  it('enforces fixed times on save while leaving legacy custom times intact', async () => {
    useScheduleStore.getState().setWeekStart('2026-10-05');
    for (const shift of ['part_open', 'part_close', 'part'] as const) {
      await useScheduleStore.getState().upsertSchedule({ employee_id: shift, work_date: '2026-10-06', shift_type: shift, start_time: '11:00', end_time: '16:30' });
    }
    const saved = await useScheduleStore.getState().fetchDaySchedules('2026-10-06');
    for (const shift of ['part_open', 'part_close'] as const) {
      expect(saved.find((s) => s.shift_type === shift)).toMatchObject({ start_time: SHIFT_DEFAULTS[shift].start, end_time: SHIFT_DEFAULTS[shift].end });
    }
    expect(saved.find((s) => s.shift_type === 'part')).toMatchObject({ start_time: '11:00', end_time: '16:30' });
  });
});

describe('part break calculation compatibility', () => {
  function worker(id: number, shift: ShiftType, start = '10:30', end = '16:30'): WorkSchedule {
    return { id: String(id), employee_id: String(id), work_date: '2026-10-07', shift_type: shift,
      start_time: start, end_time: end, break_start_time: null, break_end_time: null, created_at: '', updated_at: '',
      employee: { id: String(id), name: String(id), available_roles: ['manager', 'cashier', 'pass'], available_days: [3], default_shift_types: [shift], is_deleted: false, created_at: '' } };
  }

  it('excludes both fixed parts from breaks because each is under four hours', () => {
    expect(autoAssignBreaks([
      worker(1, 'part_open', '10:30', '14:00'), worker(2, 'part_close', '18:30', '21:30'),
    ], '14:00').allocations).toEqual({});
  });

  it('keeps the same part grouping, priority, and break lengths across subtypes', () => {
    const mixed = [worker(1, 'part'), worker(2, 'part_open'), worker(3, 'part_close'), worker(4, 'part')];
    expect(autoAssignBreaks(mixed, '14:00')).toEqual(autoAssignBreaks(mixed.map((s) => ({ ...s, shift_type: 'part' })), '14:00'));
  });
});
