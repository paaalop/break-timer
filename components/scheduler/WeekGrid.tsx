'use client';

import { forwardRef, useState, useEffect } from 'react';
import type { WorkSchedule, Employee } from '@/types';
import DayCard from './DayCard';
import { getWeekDates, parseDate, formatDateToYYYYMMDD, formatWeekRange } from '@/lib/weekUtils';

interface WeekGridProps {
  weekStart: string;
  schedules: WorkSchedule[];
  employees: Employee[];
  onBreakClick: (schedule: WorkSchedule) => void;
  onPrevWeek?: () => void;
  onNextWeek?: () => void;
}

const DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

const WeekGrid = forwardRef<HTMLDivElement, WeekGridProps>(function WeekGrid(
  { weekStart, schedules, employees, onBreakClick, onPrevWeek, onNextWeek },
  ref
) {
  const dates = getWeekDates(weekStart);

  // 기본 활성 날짜: 오늘 날짜가 해당 주차에 포함되면 오늘, 아니면 첫째 날(월요일)
  const [activeDate, setActiveDate] = useState<string>(() => {
    const today = formatDateToYYYYMMDD(new Date());
    return dates.includes(today) ? today : dates[0];
  });

  // 주차가 변경될 때 활성 날짜 재설정
  useEffect(() => {
    const today = formatDateToYYYYMMDD(new Date());
    setActiveDate(dates.includes(today) ? today : dates[0]);
  }, [weekStart]);

  return (
    <div ref={ref}>
      {/* 1. 모바일 전용 UI (< md): [주 선택바 + 요일선택바 통합 카드] + [선택된 요일 카드 1개] */}
      <div className="block md:hidden">
        {/* 통합 네비게이터 (배경 없음, 플랫 스타일) */}
        <div style={{ marginBottom: 12 }}>
          {/* 1단: 주 선택 — 화살표가 날짜 텍스트 바로 양옆에 위치 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              padding: '6px 0 4px',
            }}
          >
            <button
              type="button"
              onClick={onPrevWeek}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#999',
                fontSize: 18,
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
              }}
              aria-label="이전 주"
            >
              ‹
            </button>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-neutral-dark)',
                letterSpacing: '-0.01em',
              }}
            >
              {formatWeekRange(weekStart)}
            </span>
            <button
              type="button"
              onClick={onNextWeek}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#999',
                fontSize: 18,
                cursor: 'pointer',
                padding: '2px 4px',
                lineHeight: 1,
              }}
              aria-label="다음 주"
            >
              ›
            </button>
          </div>

          {/* 2단: 요일 선택 — 배경 없음, 선택된 블럭 전체 하단 밑줄 */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              padding: '4px 0 0',
            }}
          >
            {dates.map((date) => {
              const d = parseDate(date);
              const dayNum = d.getDay();
              const dayName = DAY_NAMES[dayNum];
              const dateNum = d.getDate();
              const isWeekend = dayNum === 0 || dayNum === 6;
              const isActive = activeDate === date;
              const dayScheduleCount = schedules.filter((s) => s.work_date === date).length;

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setActiveDate(date)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px 2px 8px',
                    border: 'none',
                    borderBottom: isActive ? '2px solid var(--color-neutral-dark)' : '2px solid transparent',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: isActive
                      ? 'var(--color-neutral-dark)'
                      : isWeekend
                      ? '#C0392B'
                      : '#999',
                    transition: 'color 0.12s ease, border-color 0.12s ease',
                  }}
                >
                  {/* 요일 */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 700 : 500,
                      lineHeight: 1.2,
                      marginBottom: 3,
                    }}
                  >
                    {dayName}
                  </span>
                  {/* 날짜 — 선택 시 볼드 */}
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: isActive ? 800 : 500,
                      lineHeight: 1.2,
                      letterSpacing: '-0.02em',
                    }}
                  >
                    {dateNum}
                  </span>
                  {/* 인원수 */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 600 : 400,
                      marginTop: 3,
                      opacity: isActive ? 1 : 0.45,
                      lineHeight: 1.2,
                    }}
                  >
                    {dayScheduleCount > 0 ? `${dayScheduleCount}명` : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 선택된 요일의 단일 카드 */}
        <DayCard
          key={activeDate}
          date={activeDate}
          schedules={schedules.filter((s) => s.work_date === activeDate)}
          employees={employees}
          onBreakClick={onBreakClick}
        />
      </div>

      {/* 2. 데스크톱 전용 UI (md: 이상): 3열 그리드로 7개 요일 전체 표시 */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {dates.map((date) => {
          const daySchedules = schedules.filter((s) => s.work_date === date);
          return (
            <DayCard
              key={date}
              date={date}
              schedules={daySchedules}
              employees={employees}
              onBreakClick={onBreakClick}
            />
          );
        })}
      </div>
    </div>
  );
});

export default WeekGrid;
