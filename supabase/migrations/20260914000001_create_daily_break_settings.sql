-- Daily Break Settings Table (날짜별 최소 인원 및 휴게 시작 기준시각 설정)
CREATE TABLE IF NOT EXISTS daily_break_settings (
    work_date DATE PRIMARY KEY,
    min_total_staff INTEGER NOT NULL DEFAULT 4,
    break_start_ref TIME NOT NULL DEFAULT '14:00',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 기본적으로 접근을 차단한다. 관리자 접근 정책은 후속 마이그레이션에서 설정한다.
ALTER TABLE daily_break_settings ENABLE ROW LEVEL SECURITY;
