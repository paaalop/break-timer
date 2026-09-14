import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { autoAssignBreaks, validateBreakSlot } from '@/lib/autoBreakAlgo';
import type { WorkSchedule, BreakWarning, UpsertScheduleInput, Employee, OptimizationPolicy, DailyBreakSetting } from '@/types';
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
  fetchDaySchedules: (date: string) => Promise<WorkSchedule[]>;
  fetchDayBreakSetting: (date: string) => Promise<DailyBreakSetting | null>;
  saveDayBreakSetting: (setting: { work_date: string; min_total_staff: number; break_start_ref: string }) => Promise<void>;
  upsertSchedule: (data: UpsertScheduleInput) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  deleteSchedules: (ids: string[]) => Promise<void>;
  autoFillWeekSchedules: (weekStart: string, employees: Employee[]) => Promise<void>;
  runAutoBreak: (date: string, breakStartRef: string, minStaffOverride?: number) => Promise<{ updatedSchedules: WorkSchedule[]; warnings: BreakWarning[] }>;
  setManualBreak: (id: string, start: string, end: string) => Promise<void>;
  syncDaySchedules: (date: string, mode: 'missing_only' | 'reset_all', employees: Employee[]) => Promise<void>;
  clearBreakWarnings: () => void;
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
  minTotalStaff: 4,
  isLoading: false,
  error: null,

  clearBreakWarnings: () => set({ breakWarnings: [] }),

  setMinTotalStaff: (num: number) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auto_break_min_staff', String(num));
    }
    set({ minTotalStaff: num });
  },

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

  fetchDaySchedules: async (date: string): Promise<WorkSchedule[]> => {
    try {
      let rawSchedules: WorkSchedule[] = [];
      if (!supabase) {
        const allEmployees = getMockAllEmployees();
        rawSchedules = mockSchedules
          .filter((s) => s.work_date === date)
          .map((s) => ({ ...s, employee: allEmployees.find((e) => e.id === s.employee_id) }))
          .sort((a, b) => a.start_time.localeCompare(b.start_time));
      } else {
        const { data, error } = await supabase
          .from('work_schedules')
          .select('*, employee:employees(*)')
          .eq('work_date', date)
          .order('start_time', { ascending: true });

        if (error) throw new Error(error.message);
        rawSchedules = (data as WorkSchedule[]) ?? [];
      }

      // 로컬스토리지에 저장된 마지막 배치 결과 캐시가 있다면 휴게시간 보존
      if (typeof window !== 'undefined') {
        const cachedStr = localStorage.getItem(`auto_break_allocations_${date}`);
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr) as Record<string, { start: string; end: string }>;
            rawSchedules = rawSchedules.map((s) => {
              const alloc = cached[s.employee_id];
              if (alloc && (!s.break_start_time || !s.break_end_time)) {
                return { ...s, break_start_time: alloc.start, break_end_time: alloc.end };
              }
              return s;
            });
          } catch {
            // ignore
          }
        }
      }

      return rawSchedules;
    } catch (err) {
      const message = err instanceof Error ? err.message : '일별 스케줄 조회 실패';
      set({ error: message });
      return [];
    }
  },

  fetchDayBreakSetting: async (date: string): Promise<DailyBreakSetting | null> => {
    try {
      if (!supabase) {
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`auto_break_config_${date}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            return {
              work_date: date,
              min_total_staff: parsed.minStaff ?? 4,
              break_start_ref: parsed.breakStartRef ?? '14:00',
            };
          }
        }
        return null;
      }

      const { data, error } = await supabase
        .from('daily_break_settings')
        .select('*')
        .eq('work_date', date)
        .maybeSingle();

      if (error) {
        console.warn('[fetchDayBreakSetting] DB read error:', error.message);
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`auto_break_config_${date}`);
          if (cached) {
            const parsed = JSON.parse(cached);
            return {
              work_date: date,
              min_total_staff: parsed.minStaff ?? 4,
              break_start_ref: parsed.breakStartRef ?? '14:00',
            };
          }
        }
        return null;
      }

      if (data) {
        if (typeof window !== 'undefined') {
          localStorage.setItem(`auto_break_config_${date}`, JSON.stringify({
            minStaff: data.min_total_staff,
            breakStartRef: data.break_start_ref,
          }));
        }
        return data as DailyBreakSetting;
      }

      // DB에 없는 날짜면 로컬스토리지 확인
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`auto_break_config_${date}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            work_date: date,
            min_total_staff: parsed.minStaff ?? 4,
            break_start_ref: parsed.breakStartRef ?? '14:00',
          };
        }
      }

      return null;
    } catch {
      return null;
    }
  },

  saveDayBreakSetting: async (setting: { work_date: string; min_total_staff: number; break_start_ref: string }): Promise<void> => {
    // 1. 브라우저 캐시 즉시 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem(`auto_break_config_${setting.work_date}`, JSON.stringify({
        minStaff: setting.min_total_staff,
        breakStartRef: setting.break_start_ref,
      }));
    }

    // 2. Supabase upsert
    if (supabase) {
      try {
        const { error } = await supabase
          .from('daily_break_settings')
          .upsert({
            work_date: setting.work_date,
            min_total_staff: setting.min_total_staff,
            break_start_ref: setting.break_start_ref,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'work_date' });
        if (error) {
          console.warn('[saveDayBreakSetting] DB upsert error:', error.message);
        }
      } catch (err) {
        console.warn('[saveDayBreakSetting] error:', err);
      }
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

  syncDaySchedules: async (date: string, mode: 'missing_only' | 'reset_all', employees: import('@/types').Employee[]) => {
    set({ isLoading: true, error: null });
    try {
      const { schedules, upsertSchedule, deleteSchedules } = get();
      const dayOfWeek = parseDate(date).getDay();
      const activeEmployees = employees.filter((e) => !e.is_deleted);
      const availableForDay = activeEmployees.filter((e) =>
        e.available_days.includes(dayOfWeek as import('@/types').DayOfWeek)
      );

      if (mode === 'reset_all') {
        const currentDayScheduleIds = schedules
          .filter((s) => s.work_date === date)
          .map((s) => s.id);
        if (currentDayScheduleIds.length > 0) {
          await deleteSchedules(currentDayScheduleIds);
        }
        for (const emp of availableForDay) {
          const defaultShift = emp.default_shift_types[0] ?? 'open';
          const defaults = SHIFT_DEFAULTS[defaultShift];
          await upsertSchedule({
            employee_id: emp.id,
            work_date: date,
            shift_type: defaultShift,
            start_time: defaults.start,
            end_time: defaults.end,
            break_start_time: null,
            break_end_time: null,
          });
        }
      } else {
        // missing_only: 아직 배정되지 않은 직원만 기본 시프트로 추가
        const currentAssignedIds = new Set(
          schedules.filter((s) => s.work_date === date).map((s) => s.employee_id)
        );
        for (const emp of availableForDay) {
          if (!currentAssignedIds.has(emp.id)) {
            const defaultShift = emp.default_shift_types[0] ?? 'open';
            const defaults = SHIFT_DEFAULTS[defaultShift];
            await upsertSchedule({
              employee_id: emp.id,
              work_date: date,
              shift_type: defaultShift,
              start_time: defaults.start,
              end_time: defaults.end,
              break_start_time: null,
              break_end_time: null,
            });
          }
        }
      }

      await get().fetchSchedules(get().selectedWeekStart, true);
      set({ isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '직원 정보 동기화 실패';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  runAutoBreak: async (date: string, breakStartRef: string, minStaffOverride?: number) => {
    set({ isLoading: true, error: null });
    try {
      const minStaff = minStaffOverride ?? get().minTotalStaff;

      // 1. DB(또는 목업)에서 해당 날짜 스케줄 직접 조회 (독립적 쿼리)
      let daySchedules: WorkSchedule[] = [];
      const client = supabase;
      if (!client) {
        const allEmployees = getMockAllEmployees();
        daySchedules = mockSchedules
          .filter((s) => s.work_date === date)
          .map((s) => ({ ...s, employee: allEmployees.find((e) => e.id === s.employee_id) }));
      } else {
        const { data, error } = await client
          .from('work_schedules')
          .select('*, employee:employees(*)')
          .eq('work_date', date)
          .order('start_time', { ascending: true });
        if (error) throw new Error(error.message);
        daySchedules = (data as WorkSchedule[]) ?? [];
      }

      if (daySchedules.length === 0) {
        set({ isLoading: false });
        return { updatedSchedules: [], warnings: [] };
      }

      // 2. 휴게 배치 알고리즘 실행
      const result = autoAssignBreaks(daySchedules, breakStartRef, minStaff);

      // 3. DB 일괄 업데이트
      let updatedSchedules: WorkSchedule[] = [];
      if (!client) {
        const now = new Date().toISOString();
        mockSchedules = mockSchedules.map((s) => {
          if (s.work_date !== date) return s;
          const alloc = result.allocations[s.employee_id];
          return {
            ...s,
            break_start_time: alloc ? alloc.start : null,
            break_end_time: alloc ? alloc.end : null,
            updated_at: now,
          };
        });
        const allEmployees = getMockAllEmployees();
        updatedSchedules = mockSchedules
          .filter((s) => s.work_date === date)
          .map((s) => ({ ...s, employee: allEmployees.find((e) => e.id === s.employee_id) }));
      } else {
        await Promise.all(
          daySchedules.map(async (schedule) => {
            const alloc = result.allocations[schedule.employee_id];
            const { error } = await client
              .from('work_schedules')
              .update({
                break_start_time: alloc ? alloc.start : null,
                break_end_time: alloc ? alloc.end : null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', schedule.id);
            if (error) {
              console.warn('[runAutoBreak] DB update error:', error.message);
            }
          })
        );
        const { data } = await client
          .from('work_schedules')
          .select('*, employee:employees(*)')
          .eq('work_date', date)
          .order('start_time', { ascending: true });
        const fetched = (data as WorkSchedule[]) ?? [];
        updatedSchedules = fetched.map((s) => {
          const alloc = result.allocations[s.employee_id];
          return {
            ...s,
            break_start_time: s.break_start_time || (alloc ? alloc.start : null),
            break_end_time: s.break_end_time || (alloc ? alloc.end : null),
          };
        });
      }

      // 로컬스토리지에 마지막 배치 결과 영구 보존
      if (typeof window !== 'undefined') {
        localStorage.setItem(`auto_break_allocations_${date}`, JSON.stringify(result.allocations));
      }

      // 날짜별 배치 조건 DB 및 로컬 영속화
      await get().saveDayBreakSetting({
        work_date: date,
        min_total_staff: minStaff,
        break_start_ref: breakStartRef,
      });

      set({ breakWarnings: result.warnings, isLoading: false });
      return { updatedSchedules, warnings: result.warnings };
    } catch (err) {
      const message = err instanceof Error ? err.message : '자동 배치 실패';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  setManualBreak: async (id: string, start: string, end: string) => {
    set({ error: null });
    try {
      const client = supabase;
      let targetSchedule: WorkSchedule | undefined;
      let otherSchedules: WorkSchedule[] = [];

      if (!client) {
        targetSchedule = mockSchedules.find((s) => s.id === id);
        if (!targetSchedule) throw new Error('스케줄을 찾을 수 없습니다.');
        const allEmployees = getMockAllEmployees();
        targetSchedule = {
          ...targetSchedule,
          employee: allEmployees.find((e) => e.id === targetSchedule!.employee_id),
        };
        otherSchedules = mockSchedules
          .filter((s) => s.work_date === targetSchedule!.work_date && s.id !== id)
          .map((s) => ({
            ...s,
            employee: allEmployees.find((e) => e.id === s.employee_id),
          }));
      } else {
        // DB에서 해당 스케줄 직접 단건 조회 (주간 스토어 캐시 의존 제거)
        const { data: targetData, error: targetError } = await client
          .from('work_schedules')
          .select('*, employee:employees(*)')
          .eq('id', id)
          .single();
        if (targetError || !targetData) throw new Error('스케줄을 찾을 수 없습니다.');
        targetSchedule = targetData as WorkSchedule;

        // DB에서 해당 일자의 동료 스케줄 직접 조회
        const { data: othersData, error: othersError } = await client
          .from('work_schedules')
          .select('*, employee:employees(*)')
          .eq('work_date', targetSchedule.work_date)
          .neq('id', id);
        if (othersError) throw new Error(othersError.message);
        otherSchedules = (othersData as WorkSchedule[]) ?? [];
      }

      // Step 3 검증 로직
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

      // DB에 직접 UPDATE (upsertSchedule 호출 X -> 주간근무표 상태 간섭 원천 차단)
      const now = new Date().toISOString();
      if (!client) {
        mockSchedules = mockSchedules.map((s) =>
          s.id === id
            ? { ...s, break_start_time: start, break_end_time: end, updated_at: now }
            : s
        );
      } else {
        const { error: updateError } = await client
          .from('work_schedules')
          .update({
            break_start_time: start,
            break_end_time: end,
            updated_at: now,
          })
          .eq('id', id);
        if (updateError) throw new Error(updateError.message);
      }

      // 로컬스토리지 캐시에도 수동 변경 동기화
      if (typeof window !== 'undefined' && targetSchedule) {
        const cacheKey = `auto_break_allocations_${targetSchedule.work_date}`;
        try {
          const cached = JSON.parse(localStorage.getItem(cacheKey) || '{}');
          cached[targetSchedule.employee_id] = { start, end };
          localStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch {
          // ignore
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '수동 휴게 저장 실패';
      set({ error: message });
      throw err;
    }
  },
}));
