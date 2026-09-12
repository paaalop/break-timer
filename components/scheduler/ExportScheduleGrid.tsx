'use client';

import { forwardRef } from 'react';
import type { WorkSchedule, Employee, ShiftType } from '@/types';
import { SHIFT_LABELS } from '@/lib/constants';
import { getWeekDates, formatDayLabel, formatWeekRange } from '@/lib/weekUtils';

const SHIFT_TEXT_COLOR: Record<ShiftType, string> = {
  open: '#D97706',
  close: '#2563EB',
  oma: '#DC2626',
  part: '#78716C',
};

function formatHHMM(timeStr?: string | null): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

interface ExportScheduleGridProps {
  weekStart: string;
  schedules: WorkSchedule[];
  employees: Employee[];
}

const ExportScheduleGrid = forwardRef<HTMLDivElement, ExportScheduleGridProps>(
  function ExportScheduleGrid({ weekStart, schedules }, ref) {
    const dates = getWeekDates(weekStart);

    return (
      <div
        ref={ref}
        style={{
          width: 360,
          background: '#FFFFFF',
          padding: '10px 8px 12px',
          boxSizing: 'border-box',
          fontFamily:
            'Pretendard, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
          color: '#333',
          fontVariantLigatures: 'none',
          fontFeatureSettings: '"liga" 0',
          textRendering: 'optimizeLegibility',
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          WebkitTextSizeAdjust: '100%',
          textSizeAdjust: '100%',
        }}
      >
        {/* 상단 타이틀 바 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 7,
            paddingBottom: 5,
            borderBottom: '1.5px solid #5C4033',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
            <span
              style={{
                fontSize: 14,
                fontWeight: 800,
                color: '#5C4033',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              코지하우스 사직점
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: '#666',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
              }}
            >
              주간 근무표
            </span>
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: '#888',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}
          >
            {formatWeekRange(weekStart)}
          </span>
        </div>

        {/* 4행 2열 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 5,
          }}
        >
          {dates.map((date) => {
            const daySchedules = schedules
              .filter((s) => s.work_date === date)
              .sort((a, b) => {
                const sc = a.start_time.localeCompare(b.start_time);
                if (sc !== 0) return sc;
                const ec = a.end_time.localeCompare(b.end_time);
                if (ec !== 0) return ec;
                return (a.employee?.name || '').localeCompare(b.employee?.name || '', 'ko');
              });

            const dayOfWeek = new Date(date + 'T00:00:00').getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            return (
              <div
                key={date}
                style={{
                  border: '1px solid #E5E0D8',
                  borderRadius: 6,
                  background: '#FFFFFF',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 115,
                }}
              >
                {/* 날짜 헤더 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    height: 24,
                    padding: '0 7px',
                    borderBottom: '1px solid #E5E0D8',
                    background: '#F7F5F2',
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isWeekend ? '#C0392B' : '#333',
                      letterSpacing: '-0.02em',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDayLabel(date)}
                  </span>
                  <span
                    style={{
                      fontSize: 9.5,
                      fontWeight: 500,
                      color: '#999',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {daySchedules.length > 0 ? `${daySchedules.length}명` : ''}
                  </span>
                </div>

                {/* 근무자 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1 }}>
                  {daySchedules.length === 0 ? (
                    <div
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#bbb',
                        fontSize: 10.5,
                        whiteSpace: 'nowrap',
                        minHeight: 80,
                        lineHeight: 1.2,
                      }}
                    >
                      근무자 없음
                    </div>
                  ) : (
                    daySchedules.map((s, idx) => (
                      <div
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 23,
                          padding: '0 7px',
                          borderBottom: idx === daySchedules.length - 1 ? 'none' : '1px solid #F0EDE8',
                          background: 'transparent',
                          gap: 4,
                          boxSizing: 'border-box',
                        }}
                      >
                        {/* 이름 */}
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: '#333',
                            lineHeight: 1.2,
                            flex: '0 0 auto',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {s.employee?.name ?? ''}
                        </span>

                        {/* 구분 뱃지 */}
                        <span
                          style={{
                            fontSize: 9.5,
                            fontWeight: 700,
                            color: SHIFT_TEXT_COLOR[s.shift_type] ?? '#555',
                            lineHeight: 1.2,
                            flex: '0 0 auto',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {SHIFT_LABELS[s.shift_type]}
                        </span>

                        {/* 근무시간 (우측 정렬) */}
                        <span
                          style={{
                            fontSize: 9.5,
                            color: '#666',
                            lineHeight: 1.2,
                            letterSpacing: '-0.02em',
                            marginLeft: 'auto',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatHHMM(s.start_time)}~{formatHHMM(s.end_time)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}

          {/* 8번째 카드: 안내사항 */}
          <div
            style={{
              border: '1px solid #E5E0D8',
              borderRadius: 6,
              background: '#FBF9F6',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 115,
            }}
          >
            <div
              style={{
                height: 24,
                padding: '0 7px',
                borderBottom: '1px solid #E5E0D8',
                background: '#F2EFEA',
                display: 'flex',
                alignItems: 'center',
                boxSizing: 'border-box',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#5C4033',
                  lineHeight: 1.2,
                  whiteSpace: 'nowrap',
                }}
              >
                안내사항 / 메모
              </span>
            </div>
            <div
              style={{
                padding: '7px 7px',
                fontSize: 9.5,
                color: '#666',
                lineHeight: 1.45,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <div style={{ wordBreak: 'keep-all' }}>
                <strong style={{ color: '#5C4033', display: 'block', marginBottom: 2, fontSize: 9.5 }}>
                  공지
                </strong>
                <div style={{ whiteSpace: 'nowrap', color: '#777' }}>
                  근무 변경 및 대타는 사전 연락 필수
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

export default ExportScheduleGrid;
