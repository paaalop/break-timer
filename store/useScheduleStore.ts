import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { autoAssignBreaks } from '@/lib/autoBreakAlgo';
import type { WorkSchedule, BreakWarning, UpsertScheduleInput, Employee, OptimizationPolicy } from '@/types';
import { getMockAllEmployees } from './useEmployeeStore';
import { getWeekDates, getWeekStartFromDate, parseDate } from '@/lib/weekUtils';
import { SHIFT_DEFAULTS } from '@/lib/constants';

interface ScheduleStore {
  selectedWeekStart: string;
  schedules: WorkSchedule[];
  breakWarnings: BreakWarning[];
  minTotalStaff: number;
  isLoading: boolean;
  error: string | null;
  setWeekStart: (date: string) => void;
  setMinTotalStaff: (num: number) => void;
  fetchSchedules: (weekStart: string, silent?: boolean) => Promise<void>;
  upsertSchedule: (data: UpsertScheduleInput) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  deleteSchedules: (ids: string[]) => Promise<void>;
  autoFillWeekSchedules: (weekStart: string, employees: Employee[]) => Promise<void>;
  runAutoBreak: (date: string, breakStartRef: string) => Promise<void>;
  setManualBreak: (id: string, start: string, end: string) => Promise<void>;
}

// 목업 데이터
let mockSchedules: WorkSchedule[] = [];
let mockScheduleIdCounter = 1;

function generateMockScheduleId(): string {
  return `mock-sched-${mockScheduleIdCounter++}`;
}

export const useScheduleStore = create<ScheduleStore>((set, get) => ({
  selectedWeekStart: getWeekStartFromDate(new Date()),
  schedules: [],
  breakWarnings: [],
  minTotalStaff: 3,
  isLoading: false,
  error: null,

  setMinTotalStaff: (num: number) => set({ minTotalStaff: num }),

  setWeekStart: (date: string) => {
    set({ selectedWeekStart: date, schedules: [], breakWarnings: [] });
  },

  fetchSchedules: async (weekStart: string, silent = false) => {
    if (!silent) {
      set({ isLoading: true, error: null });
    } else {
      set({ error: null });
    }
    try {
      const dates = getWeekDates(weekStart);
      const startDate = dates[0];
      const endDate = dates[6];

      if (!supabase) {
        // 목업 모드: 해당 주 스케줄 반환
        const weekSchedules = mockSchedules.filter((s) => {
          return s.work_date >= startDate && s.work_date <= endDate;
        });
        // employee 조인 시뮬레이션
        const allEmployees = getMockAllEmployees();
        const joined = weekSchedules.map((s) => ({
          ...s,
          employee: allEmployees.find((e) => e.id === s.employee_id),
        }));
        set({ schedules: joined, isLoading: false });
        return;
      }

      const { data, error } = await supabase
        .from('work_schedules')
        .select('*, employee:employees(*)')
        .gte('work_date', startDate)
        .lte('work_date', endDate)
        .order('work_date', { ascending: true });

      if (error) throw new Error(error.message);
      set({ schedules: (data as WorkSchedule[]) ?? [], isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '스케줄 조회 실패';
      set({ error: message, isLoading: false });
    }
  },

  upsertSchedule: async (data: UpsertScheduleInput) => {
    set({ error: null });
    try {
      if (!supabase) {
        const now = new Date().toISOString();
        if (data.id) {
          // 업데이트
          mockSchedules = mockSchedules.map((s) =>
            s.id === data.id
              ? {
                  ...s,
                  ...data,
                  break_start_time: data.break_start_time ?? null,
                  break_end_time: data.break_end_time ?? null,
                  updated_at: now,
                }
              : s
          );
        } else {
          // 삽입
          const allEmployees = getMockAllEmployees();
          const newSchedule: WorkSchedule = {
            id: generateMockScheduleId(),
            employee_id: data.employee_id,
            work_date: data.work_date,
            shift_type: data.shift_type,
            start_time: data.start_time,
            end_time: data.end_time,
            break_start_time: data.break_start_time ?? null,
            break_end_time: data.break_end_time ?? null,
            created_at: now,
            updated_at: now,
            employee: allEmployees.find((e) => e.id === data.employee_id),
          };
          mockSchedules = [...mockSchedules, newSchedule];
        }

        // 상태 업데이트
        const { selectedWeekStart } = get();
        const dates = getWeekDates(selectedWeekStart);
        const allEmployees = getMockAllEmployees();
        const weekSchedules = mockSchedules
          .filter((s) => s.work_date >= dates[0] && s.work_date <= dates[6])
          .map((s) => ({ ...s, employee: allEmployees.find((e) => e.id === s.employee_id) }));
        set({ schedules: weekSchedules });
        return;
      }

      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase
          .from('work_schedules')
          .update({ ...rest, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from('work_schedules')
          .insert([rest]);
        if (error) throw new Error(error.message);
      }

      // silent 재조회로 화면 언마운트 및 스크롤 튐 방지
      await get().fetchSchedules(get().selectedWeekStart, true);
    } catch (err) {
      const message = err instanceof Error ? err.message : '스케줄 저장 실패';
      set({ error: message });
      throw err;
    }
  },

  deleteSchedule: async (id: string) => {
    set({ error: null });
    try {
      if (!supabase) {
        mockSchedules = mockSchedules.filter((s) => s.id !== id);
        set((state) => ({
          schedules: state.schedules.filter((s) => s.id !== id),
        }));
        return;
      }

      const { error } = await supabase
        .from('work_schedules')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      set((state) => ({
        schedules: state.schedules.filter((s) => s.id !== id),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '스케줄 삭제 실패';
      set({ error: message });
    }
  },

  deleteSchedules: async (ids: string[]) => {
    if (ids.length === 0) return;
    set({ error: null });
    try {
      if (!supabase) {
        const idSet = new Set(ids);
        mockSchedules = mockSchedules.filter((s) => !idSet.has(s.id));
        set((state) => ({
          schedules: state.schedules.filter((s) => !idSet.has(s.id)),
        }));
        return;
      }

      const { error } = await supabase
        .from('work_schedules')
        .delete()
        .in('id', ids);

      if (error) throw new Error(error.message);
      const idSet = new Set(ids);
      set((state) => ({
        schedules: state.schedules.filter((s) => !idSet.has(s.id)),
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '스케줄 일괄 삭제 실패';
      set({ error: message });
    }
  },

  autoFillWeekSchedules: async (weekStart: string, employees: import('@/types').Employee[]) => {
    set({ isLoading: true, error: null });
    try {
      const { schedules, upsertSchedule } = get();
      const dates = getWeekDates(weekStart);
      const activeEmployees = employees.filter((e) => !e.is_deleted);

      for (const date of dates) {
        // 일요일: 0, 월: 1, ..., 토: 6
        const dayOfWeek = parseDate(date).getDay();
        const currentDaySchedules = schedules.filter((s) => s.work_date === date);
        const assignedIds = new Set(currentDaySchedules.map((s) => s.employee_id));

        for (const emp of activeEmployees) {
          // 해당 요일 근무 가능한 직원이며 아직 배정되지 않은 경우
          if (emp.available_days.includes(dayOfWeek as import('@/types').DayOfWeek) && !assignedIds.has(emp.id)) {
            const defaultShift = emp.default_shift_types[0] ?? 'open';
            const defaults = SHIFT_DEFAULTS[defaultShift];
            const startTime = defaults.start;
            const endTime = defaults.end;

            await upsertSchedule({
              employee_id: emp.id,
              work_date: date,
              shift_type: defaultShift,
              start_time: startTime,
              end_time: endTime,
              break_start_time: null,
              break_end_time: null,
            });
          }
        }
      }

      await get().fetchSchedules(weekStart, true);
      set({ isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '스케줄 자동 채우기 실패';
      set({ error: message, isLoading: false });
    }
  },

  runAutoBreak: async (date: string, breakStartRef: string) => {
    set({ isLoading: true, error: null });
    try {
      // 해당 날짜 스케줄 (employee 포함)
      const { schedules } = get();
      const daySchedules = schedules.filter((s) => s.work_date === date && s.employee);

      if (daySchedules.length === 0) {
        set({ isLoading: false });
        return;
      }

      const result = autoAssignBreaks(daySchedules, breakStartRef, get().minTotalStaff);

      // N+1 방지: Promise.all 일괄 처리
      await Promise.all(
        Object.entries(result.allocations).map(([employeeId, { start, end }]) => {
          const schedule = daySchedules.find((s) => s.employee_id === employeeId);
          if (!schedule) return Promise.resolve();
          return get().upsertSchedule({
            id: schedule.id,
            employee_id: schedule.employee_id,
            work_date: schedule.work_date,
            shift_type: schedule.shift_type,
            start_time: schedule.start_time,
            end_time: schedule.end_time,
            break_start_time: start,
            break_end_time: end,
          });
        })
      );

      set({ breakWarnings: result.warnings, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '자동 배치 실패';
      set({ error: message, isLoading: false });
    }
  },

  setManualBreak: async (id: string, start: string, end: string) => {
    set({ error: null });
    try {
      const { schedules } = get();
      const targetSchedule = schedules.find((s) => s.id === id);
      if (!targetSchedule) throw new Error('스케줄을 찾을 수 없습니다.');

      // Step 3 검증 로직 (autoBreakAlgo에서 분리된 함수 사용)
      const { validateBreakSlot } = await import('@/lib/autoBreakAlgo');
      const otherSchedules = schedules.filter((s) => s.work_date === targetSchedule.work_date && s.id !== id);

      const { isValid, missingRoles } = validateBreakSlot(
        targetSchedule,
        start,
        end,
        otherSchedules,
        get().minTotalStaff
      );

      if (!isValid) {
        const message = `${start}~${end}에 ${missingRoles.join(', ')} 포지션 커버 불가 — 저장 차단`;
        set({ error: message });
        throw new Error(message);
      }

      await get().upsertSchedule({
        id,
        employee_id: targetSchedule.employee_id,
        work_date: targetSchedule.work_date,
        shift_type: targetSchedule.shift_type,
        start_time: targetSchedule.start_time,
        end_time: targetSchedule.end_time,
        break_start_time: start,
        break_end_time: end,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : '수동 휴게 저장 실패';
      set({ error: message });
      throw err;
    }
  },
}));
