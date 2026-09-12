import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Employee, CreateEmployeeInput, UpdateEmployeeInput } from '@/types';

interface EmployeeStore {
  employees: Employee[];
  isLoading: boolean;
  error: string | null;
  fetchEmployees: () => Promise<void>;
  addEmployee: (data: CreateEmployeeInput) => Promise<void>;
  updateEmployee: (id: string, data: UpdateEmployeeInput) => Promise<void>;
  softDeleteEmployee: (id: string) => Promise<void>;
  softDeleteEmployees: (ids: string[]) => Promise<void>;
}

// 목업 데이터 (Supabase 없을 때)
let mockEmployees: Employee[] = [];
let mockIdCounter = 1;

function generateMockId(): string {
  return `mock-emp-${mockIdCounter++}`;
}

export const useEmployeeStore = create<EmployeeStore>((set, get) => ({
  employees: [],
  isLoading: false,
  error: null,

  fetchEmployees: async () => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) {
        // 목업 모드: is_deleted=false만 반환 (이름 가나다순 정렬)
        set({
          employees: mockEmployees
            .filter((e) => !e.is_deleted)
            .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
          isLoading: false,
        });
        return;
      }

      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);
      const sortedData = ((data as Employee[]) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, 'ko')
      );
      set({ employees: sortedData, isLoading: false });
    } catch (err) {
      const message = err instanceof Error ? err.message : '직원 목록 조회 실패';
      set({ error: message, isLoading: false });
    }
  },

  addEmployee: async (data: CreateEmployeeInput) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) {
        const newEmployee: Employee = {
          id: generateMockId(),
          ...data,
          is_minor: data.is_minor ?? false,
          is_deleted: false,
          created_at: new Date().toISOString(),
        };
        mockEmployees = [...mockEmployees, newEmployee];
        set({ employees: mockEmployees.filter((e) => !e.is_deleted), isLoading: false });
        return;
      }

      let insertRes = await supabase
        .from('employees')
        .insert([{ ...data, is_minor: data.is_minor ?? false, is_deleted: false }])
        .select()
        .single();

      // DB에 is_minor 컬럼이 아직 생성되지 않은 경우(PGRST204) fallback: is_minor 제외 후 재시도
      if (insertRes.error && insertRes.error.message.includes('is_minor')) {
        console.warn('[Supabase] is_minor 컬럼이 DB에 없습니다. 마이그레이션(20260913000000_add_is_minor_to_employees.sql) 적용이 필요합니다.');
        const { is_minor: _, ...fallbackData } = data;
        insertRes = await supabase
          .from('employees')
          .insert([{ ...fallbackData, is_deleted: false }])
          .select()
          .single();
      }

      if (insertRes.error) throw new Error(insertRes.error.message);
      set((state) => ({
        employees: [...state.employees, insertRes.data as Employee],
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '직원 추가 실패';
      set({ error: message, isLoading: false });
    }
  },

  updateEmployee: async (id: string, data: UpdateEmployeeInput) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) {
        mockEmployees = mockEmployees.map((e) =>
          e.id === id ? { ...e, ...data } : e
        );
        set({ employees: mockEmployees.filter((e) => !e.is_deleted), isLoading: false });
        return;
      }

      let updateRes = await supabase
        .from('employees')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      // DB에 is_minor 컬럼이 아직 생성되지 않은 경우 fallback
      if (updateRes.error && updateRes.error.message.includes('is_minor')) {
        console.warn('[Supabase] is_minor 컬럼이 DB에 없습니다. 마이그레이션 적용이 필요합니다.');
        const { is_minor: _, ...fallbackData } = data;
        updateRes = await supabase
          .from('employees')
          .update(fallbackData)
          .eq('id', id)
          .select()
          .single();
      }

      if (updateRes.error) throw new Error(updateRes.error.message);
      set((state) => ({
        employees: state.employees.map((e) =>
          e.id === id ? (updateRes.data as Employee) : e
        ),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '직원 수정 실패';
      set({ error: message, isLoading: false });
    }
  },

  // 절대 금지: DELETE 쿼리 사용 금지 — is_deleted = true만 허용
  softDeleteEmployee: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      if (!supabase) {
        mockEmployees = mockEmployees.map((e) =>
          e.id === id ? { ...e, is_deleted: true } : e
        );
        set({ employees: mockEmployees.filter((e) => !e.is_deleted), isLoading: false });
        return;
      }

      const { error } = await supabase
        .from('employees')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw new Error(error.message);
      set((state) => ({
        employees: state.employees.filter((e) => e.id !== id),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '직원 삭제 실패';
      set({ error: message, isLoading: false });
    }
  },

  softDeleteEmployees: async (ids: string[]) => {
    if (ids.length === 0) return;
    set({ isLoading: true, error: null });
    try {
      if (!supabase) {
        const idSet = new Set(ids);
        mockEmployees = mockEmployees.map((e) =>
          idSet.has(e.id) ? { ...e, is_deleted: true } : e
        );
        set({ employees: mockEmployees.filter((e) => !e.is_deleted), isLoading: false });
        return;
      }

      const { error } = await supabase
        .from('employees')
        .update({ is_deleted: true })
        .in('id', ids);

      if (error) throw new Error(error.message);
      const idSet = new Set(ids);
      set((state) => ({
        employees: state.employees.filter((e) => !idSet.has(e.id)),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : '직원 일괄 삭제 실패';
      set({ error: message, isLoading: false });
    }
  },

  // 직접 상태 설정 헬퍼 (외부 동기화용)
  ...({} as Record<string, never>),
}));

// 목업 직원 전체 조회 (스케줄 스토어에서 employee 조인 시 사용)
export function getMockAllEmployees(): Employee[] {
  return mockEmployees;
}
