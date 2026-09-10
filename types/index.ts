// types/index.ts

export * from '../lib/constants';

export type ShiftType = 'open' | 'close' | 'oma' | 'part';
export type Role = 'cashier' | 'pass';
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type OptimizationPolicy = 'early_finish' | 'balanced' | 'stable_staff';

export interface Employee {
  id: string;
  name: string;
  available_roles: Role[];
  available_days: DayOfWeek[];
  default_shift_types: ShiftType[];
  is_deleted: boolean;
  created_at: string;
}

export type CreateEmployeeInput = Omit<Employee, 'id' | 'is_deleted' | 'created_at'>;
export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;

export interface WorkSchedule {
  id: string;
  employee_id: string;
  work_date: string;            // 'YYYY-MM-DD'
  shift_type: ShiftType;
  start_time: string;           // 'HH:MM'
  end_time: string;             // 'HH:MM'
  break_start_time: string | null;  // 'HH:MM'
  break_end_time: string | null;    // 'HH:MM'
  created_at: string;
  updated_at: string;
  employee?: Employee;          // Supabase 조인 시 포함
}

export interface UpsertScheduleInput {
  id?: string;
  employee_id: string;
  work_date: string;
  shift_type: ShiftType;
  start_time: string;
  end_time: string;
  break_start_time?: string | null;
  break_end_time?: string | null;
}

export interface BreakWarning {
  time: string;      // '15:00-15:30'
  missing: string[];   // ['ade', '최소 근무 인원 미달']
}

export interface AlgoResult {
  allocations: Record<string, { start: string; end: string }>;
  warnings: BreakWarning[];
}
