import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScheduleStore } from './useScheduleStore';
import { useEmployeeStore } from './useEmployeeStore';

vi.mock('@/lib/supabase', () => ({ supabase: null }));

afterEach(async () => {
  await useScheduleStore.getState().deleteSchedules(useScheduleStore.getState().schedules.map((s) => s.id));
  await useEmployeeStore.getState().softDeleteEmployees(useEmployeeStore.getState().employees.map((e) => e.id));
  localStorage.clear();
});

describe('manual break persistence', () => {
  it('allows coverage warnings on the manual page and retains the weekly validation', async () => {
    await useEmployeeStore.getState().addEmployee({ name: '수동 배치', available_roles: ['cashier'], available_days: [3], default_shift_types: ['open'] });
    await useEmployeeStore.getState().fetchEmployees();
    const employee = useEmployeeStore.getState().employees[0];
    const store = useScheduleStore.getState();
    store.setWeekStart('2026-10-05');
    await store.upsertSchedule({ employee_id: employee.id, work_date: '2026-10-07', shift_type: 'open', start_time: '10:30', end_time: '20:00' });
    const [schedule] = await store.fetchDaySchedules('2026-10-07');
    await expect(store.setManualBreak(schedule.id, '14:10', '15:40')).rejects.toThrow('저장 차단');
    await store.setManualBreak(schedule.id, '14:10', '15:40', true);
    expect((await store.fetchDaySchedules('2026-10-07'))[0]).toMatchObject({ break_start_time: '14:10', break_end_time: '15:40' });
    await store.setManualBreak(schedule.id, null, null, true);
    expect((await store.fetchDaySchedules('2026-10-07'))[0]).toMatchObject({ break_start_time: null, break_end_time: null });
    expect(JSON.parse(localStorage.getItem('auto_break_allocations_2026-10-07')!)[employee.id]).toBeUndefined();
    await expect(store.setManualBreak(schedule.id, '15:00', '14:00', true)).rejects.toThrow('올바르게');
  });
});
