'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import BreakWarningBanner from '@/components/scheduler/BreakWarningBanner';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { toMinutes, toTimeStr } from '@/lib/autoBreakAlgo';
import { getWeekStartFromDate, formatDateToYYYYMMDD, formatDayLabel } from '@/lib/weekUtils';

export default function AutoBreakPage() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [breakStartRef, setBreakStartRef] = useState('13:30');

  const {
    schedules,
    breakWarnings,
    minTotalStaff,
    setMinTotalStaff,
    runAutoBreak,
    fetchSchedules,
    isLoading,
    error,
  } = useScheduleStore();
  const { fetchEmployees } = useEmployeeStore();

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    fetchSchedules(getWeekStartFromDate(new Date(selectedDate)));
  }, [selectedDate, fetchSchedules]);

  const handleRunAutoBreak = () => {
    runAutoBreak(selectedDate, breakStartRef);
  };

  const daySchedules = useMemo(() => {
    return schedules
      .filter((s) => s.work_date === selectedDate)
      .sort((a, b) => {
        const startDiff = a.start_time.localeCompare(b.start_time);
        if (startDiff !== 0) return startDiff;
        const endDiff = a.end_time.localeCompare(b.end_time);
        if (endDiff !== 0) return endDiff;
        return (a.employee?.name || '').localeCompare(b.employee?.name || '', 'ko');
      });
  }, [schedules, selectedDate]);

  // 요일 및 주말 여부 계산
  const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // 시간표 데이터 생성: 휴게 시작 기준시간부터 마지막 휴게 끝 시간까지 30분 단위로 계산
  const timeTable = useMemo(() => {
    if (daySchedules.length === 0) return [];

    // 휴게 시작 기준시간 (분)
    const refStartMin = toMinutes(breakStartRef);

    // 배정된 휴게시간 중 가장 이른 시작시간과 가장 늦은 종료시간 찾기
    let minBreakStartMin = refStartMin;
    let maxBreakEndMin = refStartMin;
    let hasBreaks = false;

    daySchedules.forEach((s) => {
      if (s.break_start_time && s.break_end_time) {
        hasBreaks = true;
        const bStart = toMinutes(s.break_start_time);
        const bEnd = toMinutes(s.break_end_time);
        if (bStart < minBreakStartMin) minBreakStartMin = bStart;
        if (bEnd > maxBreakEndMin) maxBreakEndMin = bEnd;
      }
    });

    // 휴게가 아직 배정되지 않은 상태라면 기본적으로 기준시간부터 3시간(180분) 동안의 슬롯 생성
    if (!hasBreaks) {
      maxBreakEndMin = refStartMin + 180;
    } else if (maxBreakEndMin <= minBreakStartMin) {
      maxBreakEndMin = minBreakStartMin + 30;
    }

    // 30분 단위 정렬
    const startMin = Math.floor(minBreakStartMin / 30) * 30;
    const endMin = Math.ceil(maxBreakEndMin / 30) * 30;

    const rows = [];
    for (let t = startMin; t < endMin; t += 30) {
      const timeStr = `${toTimeStr(t)}~${toTimeStr(t + 30)}`;
      const working: string[] = [];
      const onBreak: string[] = [];

      daySchedules.forEach((s) => {
        const sStart = toMinutes(s.start_time);
        const sEnd = toMinutes(s.end_time);

        // 해당 시간대에 출근 중인 직원인지 확인
        if (t >= sStart && t < sEnd) {
          if (s.break_start_time && s.break_end_time) {
            const bStart = toMinutes(s.break_start_time);
            const bEnd = toMinutes(s.break_end_time);
            if (t >= bStart && t < bEnd) {
              onBreak.push(s.employee?.name || '알수없음');
            } else {
              working.push(s.employee?.name || '알수없음');
            }
          } else {
            working.push(s.employee?.name || '알수없음');
          }
        }
      });

      rows.push({
        timeStr,
        working,
        onBreak,
        totalWorking: working.length,
        totalBreak: onBreak.length,
      });
    }
    return rows;
  }, [daySchedules, breakStartRef]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
      <Header />
      <main className="max-w-[1400px] mx-auto px-2 py-4 sm:px-6 sm:py-8">
        {/* 페이지 헤더 */}
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0 }}>
            휴게 시간 배치
          </h1>
        </div>

        {/* 컨트롤 패널 */}
        <div
          style={{
            marginBottom: 20,
            paddingBottom: 16,
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-dark)' }}>
                날짜
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-dark)' }}>
                총 휴게 시작
              </label>
              <input
                type="time"
                value={breakStartRef}
                onChange={(e) => setBreakStartRef(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-neutral-dark)' }}>
                최소 근무 인원
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={minTotalStaff}
                onChange={(e) => setMinTotalStaff(Number(e.target.value))}
                style={{ ...inputStyle, width: 90 }}
              />
            </div>
            <button
              onClick={handleRunAutoBreak}
              disabled={isLoading || daySchedules.length === 0}
              style={{
                padding: '7px 16px',
                fontSize: 12,
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 4,
                fontWeight: 600,
                cursor: isLoading || daySchedules.length === 0 ? 'not-allowed' : 'pointer',
                opacity: isLoading || daySchedules.length === 0 ? 0.5 : 1,
              }}
            >
              자동 배치
            </button>
          </div>
        </div>

        {/* 에러 배너 */}
        {error && (
          <div
            style={{
              border: '1px solid #C0392B',
              background: '#FDF2F1',
              padding: '10px 16px',
              borderRadius: 4,
              fontSize: 13,
              color: '#C0392B',
              marginBottom: 16,
            }}
          >
            {error}
          </div>
        )}

        {/* 경고 배너 */}
        {breakWarnings.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <BreakWarningBanner warnings={breakWarnings} />
          </div>
        )}

        {/* DayCard 양식의 휴게시간표 카드 컨테이너 */}
        <div
          style={{
            border: '1px solid var(--color-border)',
            borderRadius: 4,
            background: 'var(--color-surface)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* 카드 헤더 바 (DayCard 양식) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              background: 'var(--color-bg)',
              borderBottom: '1px solid var(--color-border)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: isWeekend ? '#C0392B' : 'var(--color-neutral-dark)',
                }}
              >
                {formatDayLabel(selectedDate)}
              </span>
              <span style={{ fontSize: 12, color: 'var(--color-neutral-dark)' }}>
                {`휴게 시간표 (${breakStartRef}~)`}
              </span>
            </div>
            <span style={{ fontSize: 11, color: '#888' }}>
              {`총 ${daySchedules.length}명 근무`}
            </span>
          </div>

          {/* 테이블 그리드 (체크박스 제외, 3개 칼럼) */}
          <div style={{ width: '100%', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table
              style={{
                width: '100%',
                tableLayout: 'fixed',
                borderCollapse: 'collapse',
                background: 'var(--color-surface)',
              }}
            >
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '22%' }}>시간</th>
                  <th style={{ ...thStyle, width: '38%' }}>휴게 직원</th>
                  <th style={{ ...thStyle, width: '40%', borderRight: 'none' }}>근무 직원</th>
                </tr>
              </thead>
              <tbody>
                {timeTable.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      style={{
                        padding: '32px 0',
                        textAlign: 'center',
                        color: '#bbb',
                        fontSize: 12,
                        borderBottom: 'none',
                      }}
                    >
                      해당 날짜에 등록된 근무 스케줄이 없습니다.
                    </td>
                  </tr>
                ) : (
                  timeTable.map((row, idx) => {
                    const isWarning = row.totalWorking < minTotalStaff;
                    return (
                      <tr key={idx} style={{ transition: 'background 0.15s ease' }}>
                        {/* 시간 */}
                        <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--color-neutral-dark)' }}>
                          {row.timeStr}
                        </td>

                        {/* 휴게 직원 */}
                        <td style={tdStyle}>
                          {row.onBreak.length > 0 ? (
                            <span>
                              <strong style={{ color: '#C0392B' }}>{row.onBreak.join(', ')}</strong>
                              <span style={{ fontSize: 11, color: '#888', marginLeft: 4 }}>
                                ({row.totalBreak}명)
                              </span>
                            </span>
                          ) : (
                            <span style={{ color: '#bbb' }}>-</span>
                          )}
                        </td>

                        {/* 근무 직원 */}
                        <td style={{ ...tdStyle, borderRight: 'none' }}>
                          <span
                            style={{
                              color: isWarning ? '#C0392B' : 'var(--color-neutral-dark)',
                              fontWeight: isWarning ? 600 : 400,
                            }}
                          >
                            {row.working.join(', ') || '-'}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: isWarning ? '#C0392B' : '#888',
                              marginLeft: 4,
                            }}
                          >
                            ({row.totalWorking}명)
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  fontSize: 13,
  outline: 'none',
  background: 'var(--color-surface)',
  color: 'var(--color-neutral-dark)',
};

const thStyle: React.CSSProperties = {
  padding: '6px 4px',
  fontSize: 11,
  fontWeight: 600,
  textAlign: 'center',
  color: 'var(--color-primary)',
  borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)',
  background: '#FAFAFA',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '7px 4px',
  fontSize: 12,
  textAlign: 'center',
  borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};
