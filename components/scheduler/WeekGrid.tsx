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
        {/* 통합 네비게이터 카드 (1단: 주 탐색 / 구분선 / 2단: 요일 탐색) */}
        <div
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            marginBottom: 10,
            overflow: 'hidden',
          }}
        >
          {/* 1단: 주 선택 바 (< 이전주 | 2026.09.07 ~ 2026.09.13 | 다음주 >) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 8px',
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          >
            <button
              type="button"
              onClick={onPrevWeek}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--color-neutral-dark)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '3px 6px',
              }}
              aria-label="이전 주"
            >
              &lt; 이전주
            </button>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-neutral-dark)',
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
                color: 'var(--color-neutral-dark)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '3px 6px',
              }}
              aria-label="다음 주"
            >
              다음주 &gt;
            </button>
          </div>

          {/* 2단: 요일 선택 바 (1행: 7 (월), 2행: 인원수) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 2,
              padding: '4px 4px',
              background: 'var(--color-bg)',
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
                    padding: '5px 1px',
                    borderRadius: 3,
                    border: 'none',
                    cursor: 'pointer',
                    background: isActive ? 'var(--color-primary)' : 'transparent',
                    color: isActive
                      ? '#FFFFFF'
                      : isWeekend
                      ? '#C0392B'
                      : 'var(--color-neutral-dark)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {/* 1행: 7 (월) */}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: isActive ? 700 : 600,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    {dateNum} ({dayName})
                  </span>

                  {/* 2행: 인원수 */}
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: isActive ? 600 : 500,
                      marginTop: 2,
                      opacity: isActive ? 0.9 : 0.65,
                      whiteSpace: 'nowrap',
                      lineHeight: 1.2,
                    }}
                  >
                    {dayScheduleCount}명
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
