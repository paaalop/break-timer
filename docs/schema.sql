-- 1. Employees Table
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    available_roles TEXT[] NOT NULL,
    available_days INTEGER[] NOT NULL,
    default_shift_types TEXT[] NOT NULL,
    is_minor BOOLEAN DEFAULT false NOT NULL,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Work Schedules Table
CREATE TABLE work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    work_date DATE NOT NULL,
    shift_type TEXT NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    break_start_time TIME,
    break_end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Daily Break Settings Table (날짜별 최소 인원 및 휴게 시작 기준시각 설정)
CREATE TABLE IF NOT EXISTS daily_break_settings (
    work_date DATE PRIMARY KEY,
    min_total_staff INTEGER NOT NULL DEFAULT 4,
    break_start_ref TIME NOT NULL DEFAULT '14:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
