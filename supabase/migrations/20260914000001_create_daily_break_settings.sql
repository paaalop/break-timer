-- Daily Break Settings Table (날짜별 최소 인원 및 휴게 시작 기준시각 설정)
CREATE TABLE IF NOT EXISTS daily_break_settings (
    work_date DATE PRIMARY KEY,
    min_total_staff INTEGER NOT NULL DEFAULT 4,
    break_start_ref TIME NOT NULL DEFAULT '14:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 비활성화 (익명/클라이언트 직접 접근 허용)
ALTER TABLE daily_break_settings DISABLE ROW LEVEL SECURITY;
