'use client';

import { useState, useEffect, useMemo } from 'react';
import Header from '@/components/layout/Header';
import BreakWarningBanner from '@/components/scheduler/BreakWarningBanner';
import AutoBreakRuleModal from '@/components/scheduler/AutoBreakRuleModal';
import TimeWheelPickerModal from '@/components/ui/TimeWheelPickerModal';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { toMinutes, toTimeStr } from '@/lib/autoBreakAlgo';
import { getWeekStartFromDate, formatDateToYYYYMMDD, formatDayLabel } from '@/lib/weekUtils';

export default function AutoBreakPage() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  const [breakStartRef, setBreakStartRef] = useState('14:00');
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

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
    <div style={{ minHeight: '100vh', background: '#EFECE6' }}>
      <Header
        rightAction={
          <button
            onClick={() => setShowRuleModal(true)}
            title="자동 배치 적용 규칙 안내"
            aria-label="도움말"
            style={{
              padding: '5px 12px',
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              borderRadius: 6,
              background: '#FFFFFF',
              color: 'var(--color-primary)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <span>도움말</span>
          </button>
        }
      />
      <main className="max-w-[1400px] mx-auto px-2 pt-2 pb-16 sm:px-4 md:px-6 sm:pt-3 sm:pb-20">
        <h1 className="sr-only">휴게 시간 배치</h1>

        {/* 컨트롤 패널 (검색 필터 - 보더라인 제거) */}
        <div
          style={{
            marginBottom: 12,
            padding: '16px 20px',
            background: '#FFFFFF',
            borderRadius: 14,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* 필터 항목 (제목과 입력값을 같은 행에 두고 양쪽 끝정렬, 밑줄 스타일) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-y-4 md:gap-x-10">
            {/* 날짜 */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-dark)', whiteSpace: 'nowrap' }}>
                날짜
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={underlineInputStyle}
              />
            </div>

            {/* 총 휴게 시작 (휠 다이얼 시간 피커 모달 연동) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-dark)', whiteSpace: 'nowrap' }}>
                총 휴게 시작
              </span>
              <button
                type="button"
                onClick={() => setShowTimePicker(true)}
                style={{
                  ...underlineInputStyle,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>{breakStartRef}</span>
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#777"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </button>
            </div>

            {/* 최소 근무 인원 (앞에 0이 붙지 않도록 처리) */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-neutral-dark)', whiteSpace: 'nowrap' }}>
                최소 근무 인원
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={minTotalStaff === 0 ? '' : minTotalStaff}
                  onChange={(e) => {
                    const rawVal = e.target.value.replace(/[^0-9]/g, '').replace(/^0+/, '');
                    const num = rawVal === '' ? 0 : parseInt(rawVal, 10);
                    setMinTotalStaff(num);
                  }}
                  onBlur={() => {
                    if (minTotalStaff < 1) {
                      setMinTotalStaff(1);
                    }
                  }}
                  style={{ ...underlineInputStyle, width: 44, textAlign: 'center' }}
                />
                <span style={{ fontSize: 13, fontWeight: 500, color: '#777' }}>명</span>
              </div>
            </div>
          </div>

          {/* 자동 배치 버튼 (강조 CTA) */}
          <button
            onClick={handleRunAutoBreak}
            disabled={isLoading || daySchedules.length === 0}
            style={{
              height: 42,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14,
              fontWeight: 700,
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              cursor: isLoading || daySchedules.length === 0 ? 'not-allowed' : 'pointer',
              opacity: isLoading || daySchedules.length === 0 ? 0.5 : 1,
              transition: 'all 0.15s ease',
              width: '100%',
              marginTop: 2,
            }}
          >
            <span>휴게 자동 배치</span>
          </button>
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

        {/* 휴게시간표 컨텐츠 (보더라인 제거) */}
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 14,
            padding: '18px 20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {/* 상단 요약 바 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: 10,
              borderBottom: '1px solid #EFECE6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: isWeekend ? '#C0392B' : 'var(--color-neutral-dark)',
                  letterSpacing: '-0.02em',
                }}
              >
                {formatDayLabel(selectedDate)}
              </span>

              {/* 범례 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#DC2626',
                    background: '#FEE2E2',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  휴게
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#666',
                    background: '#F0EEE9',
                    padding: '2px 8px',
                    borderRadius: 4,
                  }}
                >
                  근무
                </span>
              </div>
            </div>
            <span
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--color-primary)',
                letterSpacing: '-0.02em',
              }}
            >
              {`총 ${daySchedules.length}명`}
            </span>
          </div>

          {/* 슬롯 목록 (슬롯별 박스화 해제, 보더라인으로만 구분) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {timeTable.length === 0 ? (
              <div
                style={{
                  padding: '48px 16px',
                  textAlign: 'center',
                  color: '#999',
                  fontSize: 14,
                  background: '#FAF9F6',
                  borderRadius: 12,
                  border: '1px dashed var(--color-border)',
                }}
              >
                해당 날짜에 등록된 근무 스케줄이 없습니다.
              </div>
            ) : (
              timeTable.map((slot, idx) => {
                const isWarning = slot.totalWorking < minTotalStaff;
                const isLast = idx === timeTable.length - 1;
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 0',
                      borderBottom: isLast ? 'none' : '1px solid #EFECE6',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    {/* 1행: 시간 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: '#777',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        {slot.timeStr.replace('~', ' ~ ')}
                      </span>
                      {isWarning && (
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: '#DC2626',
                            background: '#FEE2E2',
                            padding: '1px 6px',
                            borderRadius: 4,
                            letterSpacing: '-0.01em',
                          }}
                        >
                          최소인원 미달 ({slot.totalWorking}/{minTotalStaff}명)
                        </span>
                      )}
                    </div>

                    {/* 휴게 직원 뱃지 행 (테두리 없음) */}
                    {slot.onBreak.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, lineHeight: 1.5 }}>
                        {slot.onBreak.map((name, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#FEE2E2',
                              color: '#DC2626',
                              fontWeight: 700,
                              fontSize: 14,
                              padding: '3px 9px',
                              borderRadius: 6,
                            }}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 근무 직원 뱃지 행 (테두리 없음) */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, lineHeight: 1.5 }}>
                      {slot.working.length > 0 ? (
                        slot.working.map((name, i) => (
                          <span
                            key={i}
                            style={{
                              background: '#F0EEE9',
                              color: 'var(--color-neutral-dark)',
                              fontWeight: 600,
                              fontSize: 14,
                              padding: '3px 9px',
                              borderRadius: 6,
                            }}
                          >
                            {name}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: 13, color: '#9CA3AF' }}>없음</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
        <AutoBreakRuleModal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} />
        <TimeWheelPickerModal
          isOpen={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          value={breakStartRef}
          onConfirm={(time) => setBreakStartRef(time)}
          title="휴게 시작 시간을 알려주세요"
          minTime="10:30"
          maxTime="21:30"
        />
      </main>
    </div>
  );
}

const underlineInputStyle: React.CSSProperties = {
  padding: '6px 4px',
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  borderBottom: '1.5px solid #C8C2B8',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--color-neutral-dark)',
  textAlign: 'right',
  outline: 'none',
  boxSizing: 'border-box',
  letterSpacing: '-0.01em',
  transition: 'border-color 0.15s ease',
};
