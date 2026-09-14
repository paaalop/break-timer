'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Header from '@/components/layout/Header';
import BreakWarningBanner from '@/components/scheduler/BreakWarningBanner';
import AutoBreakRuleModal from '@/components/scheduler/AutoBreakRuleModal';
import TimeWheelPickerModal from '@/components/ui/TimeWheelPickerModal';
import { useScheduleStore } from '@/store/useScheduleStore';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import type { WorkSchedule, Role } from '@/types';
import { toMinutes, toTimeStr } from '@/lib/autoBreakAlgo';
import { formatDateToYYYYMMDD, formatDayLabel, parseDate } from '@/lib/weekUtils';
import { ALL_ROLES, ROLE_LABELS } from '@/lib/constants';
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus';

interface TimeSlotRow {
  timeStr: string;
  startMin: number;
  endMin: number;
  working: WorkSchedule[];
  onBreak: WorkSchedule[];
  missingRoles: Role[];
  isWarning: boolean;
}

function formatShortDate(dateStr: string): string {
  const d = parseDate(dateStr);
  const month = d.getMonth() + 1;
  const date = d.getDate();
  const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${month}/${date}(${dayName})`;
}

// 직원 목록과 일관된 이니셜 아바타 (이름 뒤 2글자)
function Avatar({
  name,
  isMuted = false,
  variant = 'default',
}: {
  name: string;
  isMuted?: boolean;
  variant?: 'default' | 'break' | 'muted';
}) {
  const initials = name.length >= 2 ? name.slice(-2) : name;
  const isBreak = variant === 'break';
  const isMutedState = variant === 'muted' || isMuted;

  const bg = isBreak
    ? '#FDF2F2'
    : isMutedState
    ? '#F5F3F0'
    : 'var(--color-muted-bg)';

  const color = isBreak
    ? '#C0392B'
    : isMutedState
    ? 'var(--color-text-muted)'
    : 'var(--color-primary)';

  return (
    <div
      style={{
        width: 22,
        height: 22,
        borderRadius: '50%',
        background: bg,
        color: color,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        fontWeight: 700,
        flexShrink: 0,
        letterSpacing: '-0.02em',
      }}
    >
      {initials}
    </div>
  );
}

export default function AutoBreakPage() {
  const [selectedDate, setSelectedDate] = useState(() => formatDateToYYYYMMDD(new Date()));
  
  // ─── 입력 컨디션 (상단 컨트롤에서 조작하는 값 - 배치 버튼 누르기 전엔 리스트에 영향 X) ───
  const [inputBreakStartRef, setInputBreakStartRef] = useState('14:00');
  const [inputMinStaff, setInputMinStaff] = useState(4);

  // ─── 적용된 컨디션 (리스트 및 인원 부족 경고 계산에 실제로 사용되는 마지막 배치 기준값) ───
  const [appliedBreakStartRef, setAppliedBreakStartRef] = useState('14:00');
  const [appliedMinStaff, setAppliedMinStaff] = useState(4);

  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [daySchedules, setDaySchedules] = useState<WorkSchedule[]>([]);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 현재 시각 (분 단위) 상태 - 1분마다 자동 갱신하여 현재 시간대 카드 강조
  const [currentMinutes, setCurrentMinutes] = useState(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentMinutes(now.getHours() * 60 + now.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const {
    breakWarnings,
    minTotalStaff,
    setMinTotalStaff,
    runAutoBreak,
    fetchDaySchedules,
    fetchDayBreakSetting,
    saveDayBreakSetting,
    clearBreakWarnings,
    isLoading,
    error,
  } = useScheduleStore();
  const { fetchEmployees } = useEmployeeStore();

  // 날짜 변경 시 해당 날짜의 DB 저장된 배치 컨디션을 비동기 조회하여 독립적으로 적용
  useEffect(() => {
    let isCancelled = false;

    async function loadSetting() {
      const setting = await fetchDayBreakSetting(selectedDate);
      if (isCancelled) return;

      if (setting) {
        const staff = setting.min_total_staff > 0 ? setting.min_total_staff : 4;
        const startRef = (setting.break_start_ref || '14:00').slice(0, 5);
        setInputMinStaff(staff);
        setAppliedMinStaff(staff);
        setInputBreakStartRef(startRef);
        setAppliedBreakStartRef(startRef);
      } else {
        // 해당 날짜에 저장된 배치 컨디션이 없다면 기본값(14:00, 4명)으로 초기화
        setInputMinStaff(4);
        setAppliedMinStaff(4);
        setInputBreakStartRef('14:00');
        setAppliedBreakStartRef('14:00');
      }
    }

    loadSetting();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, fetchDayBreakSetting]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  const loadDay = useCallback(async () => {
    const data = await fetchDaySchedules(selectedDate);
    setDaySchedules(data);
  }, [selectedDate, fetchDaySchedules]);

  // 날짜 변경 시 이전 날짜의 경고 배너를 즉시 비우고 해당 날짜 스케줄 로드
  useEffect(() => {
    clearBreakWarnings();
    loadDay();
  }, [loadDay, clearBreakWarnings]);

  // 페이지 이탈(언마운트) 시에도 잔여 경고 배너 정리
  useEffect(() => {
    return () => {
      clearBreakWarnings();
    };
  }, [clearBreakWarnings]);

  // 탭 복귀 / 창 포커스 시 최신 데이터 자동 갱신
  useRefetchOnFocus(loadDay);

  // 배치 실행 버튼 클릭 시에만 현재 날짜의 컨디션이 DB에 영구 저장되고 리스트에 정식 적용됨
  const handleRunAutoBreak = async () => {
    await saveDayBreakSetting({
      work_date: selectedDate,
      min_total_staff: inputMinStaff,
      break_start_ref: inputBreakStartRef,
    });
    const res = await runAutoBreak(selectedDate, inputBreakStartRef, inputMinStaff);
    if (res?.updatedSchedules) {
      setDaySchedules(res.updatedSchedules);
      // 배치가 실행된 시점에 리스트 기준 컨디션 갱신
      setAppliedBreakStartRef(inputBreakStartRef);
      setAppliedMinStaff(inputMinStaff);
    }
  };

  const handleShiftDay = (diff: number) => {
    const cur = parseDate(selectedDate);
    cur.setDate(cur.getDate() + diff);
    setSelectedDate(formatDateToYYYYMMDD(cur));
  };

  const handleSetToday = () => {
    setSelectedDate(formatDateToYYYYMMDD(new Date()));
  };

  const isToday = selectedDate === formatDateToYYYYMMDD(new Date());
  const dayOfWeek = new Date(selectedDate + 'T00:00:00').getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // ─── 시간대별(30분 단위) 슬롯 데이터 계산 (배치 버튼 누르기 전엔 이전 적용값 유지) ──────
  const timeTable = useMemo<TimeSlotRow[]>(() => {
    if (daySchedules.length === 0) return [];

    const refStartMin = toMinutes(appliedBreakStartRef);

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

    if (!hasBreaks) {
      maxBreakEndMin = refStartMin + 180;
    } else if (maxBreakEndMin <= minBreakStartMin) {
      maxBreakEndMin = minBreakStartMin + 30;
    }

    const startMin = Math.floor(minBreakStartMin / 30) * 30;
    const endMin = Math.ceil(maxBreakEndMin / 30) * 30;

    const rows: TimeSlotRow[] = [];
    for (let t = startMin; t < endMin; t += 30) {
      const timeStr = `${toTimeStr(t)} ~ ${toTimeStr(t + 30)}`;
      const working: WorkSchedule[] = [];
      const onBreak: WorkSchedule[] = [];

      daySchedules.forEach((s) => {
        const sStart = toMinutes(s.start_time);
        const sEnd = toMinutes(s.end_time);

        if (t >= sStart && t < sEnd) {
          if (s.break_start_time && s.break_end_time) {
            const bStart = toMinutes(s.break_start_time);
            const bEnd = toMinutes(s.break_end_time);
            if (t >= bStart && t < bEnd) {
              onBreak.push(s);
              return;
            }
          }
          working.push(s);
        }
      });

      const activeRoles = new Set<string>();
      working.forEach((s) => {
        (s.employee?.available_roles ?? []).forEach((r) => activeRoles.add(r));
      });
      const missingRoles = (ALL_ROLES as Role[]).filter((r) => !activeRoles.has(r));
      // 인원 부족 경고는 마지막으로 배치 실행된 appliedMinStaff를 기준으로 판정
      const isWarning = working.length < appliedMinStaff || missingRoles.length > 0;

      rows.push({
        timeStr,
        startMin: t,
        endMin: t + 30,
        working,
        onBreak,
        missingRoles,
        isWarning,
      });
    }

    return rows;
  }, [daySchedules, appliedBreakStartRef, appliedMinStaff]);

  return (
    <div style={{ minHeight: '100vh', background: '#FFFFFF' }}>
      <Header />

      <main className="max-w-[1400px] mx-auto px-0 pt-3 pb-20 sm:px-8 md:px-10 sm:pt-4 sm:pb-24">
        {/* 페이지 헤더 제목 */}
        <div className="px-6 sm:px-4" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', minHeight: 36 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 20, fontWeight: 700, lineHeight: '28px', color: 'var(--color-neutral-dark)', margin: 0 }}>
                휴게 시간 배치
              </h1>

              {/* 배치 규칙 버튼 (타이틀 우측, 연한 배경 스타일) */}
              <button
                type="button"
                onClick={() => setShowRuleModal(true)}
                title="자동 배치 규칙 보기"
                style={{
                  padding: '5px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  border: 'none',
                  borderRadius: 6,
                  background: 'var(--color-muted-bg)',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  letterSpacing: '-0.02em',
                }}
                className="hover:bg-[var(--color-muted-bg-hover)] transition-colors"
              >
                배치 규칙
              </button>
            </div>
          </div>
        </div>

        {/* ── 셀렉터 (검색창 UI 레이아웃 - 중앙 정렬) ────────────────── */}
        <div className="px-6 sm:px-4" style={{ display: 'flex', justifyContent: 'center', marginBottom: 0, paddingLeft: 16, paddingRight: 16 }}>
          <div
            style={{
              width: '100%',
              maxWidth: 360,
              padding: '16px 16px',
              background: 'var(--color-muted-bg)',
              borderRadius: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
          {/* 행 1: 날짜 (라벨 없이 크게 중앙 정렬) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 4 }}>
            <button
              type="button"
              onClick={() => handleShiftDay(-1)}
              style={navArrowStyle}
              className="hover:bg-[#FDFCFA] transition-colors"
              title="이전 날"
            >
              <svg width="9" height="10" viewBox="0 0 11 12" fill="currentColor">
                <path d="M9.5 1.5L2 6L9.5 10.5Z" />
              </svg>
            </button>
            <div
              onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.focus()}
              style={{
                cursor: 'pointer',
                fontSize: 18,
                fontWeight: 700,
                color: isWeekend ? '#DC2626' : 'var(--color-neutral-dark)',
                padding: '2px 8px',
                userSelect: 'none',
                textAlign: 'center',
                letterSpacing: '-0.02em',
              }}
            >
              <span>{formatShortDate(selectedDate)}</span>
              <input
                ref={dateInputRef}
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
              />
            </div>
            <button
              type="button"
              onClick={() => handleShiftDay(1)}
              style={navArrowStyle}
              className="hover:bg-[#FDFCFA] transition-colors"
              title="다음 날"
            >
              <svg width="9" height="10" viewBox="0 0 11 12" fill="currentColor">
                <path d="M1.5 1.5L9 6L1.5 10.5Z" />
              </svg>
            </button>
          </div>

          {/* 행 2: 총 휴게 시작 (밑줄 너비를 인원 선택 너비 100px에 맞추고 좌측 정렬) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, color: 'var(--color-neutral-dark)', fontWeight: 600 }}>총 휴게 시작</span>
            <button
              type="button"
              onClick={() => setShowTimePicker(true)}
              style={{
                width: 100,
                border: 'none',
                borderBottom: '1px solid #777777',
                background: 'transparent',
                padding: '2px 4px 4px',
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--color-neutral-dark)',
                textAlign: 'left',
                cursor: 'pointer',
                borderRadius: 0,
              }}
            >
              {inputBreakStartRef.slice(0, 5)}
            </button>
          </div>

          {/* 행 3: 최소 근무 인원 - 4 + (동일한 너비 100px) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, color: 'var(--color-neutral-dark)', fontWeight: 600 }}>최소 근무 인원</span>
            <div style={{ width: 100, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => setInputMinStaff(Math.max(1, inputMinStaff - 1))}
                style={stepperBtnStyle}
              >
                −
              </button>
              <span style={{ fontSize: 14, fontWeight: 600, minWidth: 24, textAlign: 'center', color: 'var(--color-neutral-dark)' }}>
                {inputMinStaff}
              </span>
              <button
                type="button"
                onClick={() => setInputMinStaff(inputMinStaff + 1)}
                style={stepperBtnStyle}
              >
                +
              </button>
            </div>
          </div>

          {/* 행 4: 버튼 자동 배치 실행 */}
          <button
            type="button"
            onClick={handleRunAutoBreak}
            disabled={isLoading || daySchedules.length === 0}
            style={{
              marginTop: 2,
              width: '100%',
              padding: '10px 0',
              fontSize: 13,
              fontWeight: 600,
              borderRadius: 6,
              border: 'none',
              background: daySchedules.length === 0 ? '#E7E5E4' : 'var(--color-primary)',
              color: daySchedules.length === 0 ? '#A8A29E' : '#FFFFFF',
              cursor: isLoading || daySchedules.length === 0 ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.15s ease',
            }}
          >
            {isLoading ? '배치 중...' : '자동 배치 실행'}
          </button>
        </div>
      </div>

        {/* 에러 배너 */}
        {error && (
          <div
            className="mx-6 sm:mx-4"
            style={{
              border: '1px solid #FECACA',
              background: '#FEF2F2',
              padding: '8px 14px',
              borderRadius: 6,
              fontSize: 12,
              color: '#DC2626',
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        {/* 알고리즘 경고 배너 */}
        {breakWarnings.length > 0 && (
          <div className="px-6 sm:px-4" style={{ marginBottom: 12 }}>
            <BreakWarningBanner warnings={breakWarnings} />
          </div>
        )}

        {/* ── 휴게시간 리스트 (메인에 바로 속하는 플랫 리스트) ────────────────── */}
        {timeTable.length === 0 ? (
          <div
            className="px-6 sm:px-4"
            style={{
              paddingTop: 48,
              paddingBottom: 48,
              paddingLeft: 16,
              paddingRight: 16,
              textAlign: 'center',
              color: '#A8A29E',
              fontSize: 13,
            }}
          >
            해당 날짜에 등록된 근무 스케줄이 없습니다.
          </div>
        ) : (
          timeTable.map((slot, idx) => {
            const isUnderStaffed = slot.working.length < appliedMinStaff;
            const hasMissingRole = slot.missingRoles.length > 0;
            const isCurrentSlot = isToday && currentMinutes >= slot.startMin && currentMinutes < slot.endMin;

            return (
              <div
                key={idx}
                className="px-6 sm:px-4"
                style={{
                  paddingTop: 20,
                  paddingBottom: 20,
                  paddingLeft: 16,
                  paddingRight: 16,
                  borderBottom: '1px solid #E5E0D8',
                  borderLeft: isCurrentSlot ? '4px solid var(--color-primary)' : '4px solid transparent',
                  background: isCurrentSlot ? 'var(--color-muted-bg)' : 'transparent',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  transition: 'all 0.15s ease',
                }}
              >
                {/* 1. 상단 행: 왼쪽 시간 범위, 오른쪽 상태 표시 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', letterSpacing: '-0.02em' }}>
                    {slot.timeStr}
                  </span>

                  {/* 상태 표시: 정상 시 회색 텍스트(배지 없음), 인원 부족 시에만 빨간 배지 */}
                  <div>
                    {isUnderStaffed ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 4,
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                        }}
                      >
                        인원 부족 · {slot.working.length}명
                      </span>
                    ) : hasMissingRole ? (
                      <span
                        style={{
                          padding: '2px 8px',
                          fontSize: 12,
                          fontWeight: 700,
                          borderRadius: 4,
                          background: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FECACA',
                        }}
                      >
                        {slot.missingRoles.map((r) => ROLE_LABELS[r] ?? r).join('/')} 공백
                      </span>
                    ) : (
                      <span style={{ fontSize: 13, color: '#78716C', fontWeight: 500 }}>
                        근무 {slot.working.length}명
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. 휴게자 행: 라벨 "휴게" + 아바타(세련된 붉은색) + 세련된 붉은색 이름 가로 나열 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 14 }}>
                  <span style={{ width: 36, color: '#C0392B', fontWeight: 600, flexShrink: 0 }}>
                    휴게
                  </span>
                  {slot.onBreak.length === 0 ? (
                    <span style={{ color: '#A8A29E' }}>-</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      {slot.onBreak.map((s) => {
                        const name = s.employee?.name ?? '알 수 없음';
                        return (
                          <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Avatar name={name} variant="break" />
                            <span style={{ fontWeight: 600, color: '#C0392B' }}>
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 3. 근무자 행: 라벨 "근무" + 아바타(진한 배경) + 진한 텍스트 이름 가로 나열 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 14 }}>
                  <span style={{ width: 36, color: 'var(--color-neutral-dark)', fontWeight: 700, flexShrink: 0 }}>
                    근무
                  </span>
                  {slot.working.length === 0 ? (
                    <span style={{ color: '#A8A29E' }}>-</span>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                      {slot.working.map((s) => {
                        const name = s.employee?.name ?? '알 수 없음';
                        return (
                          <div key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <Avatar name={name} isMuted={false} />
                            <span style={{ fontWeight: 600, color: 'var(--color-neutral-dark)' }}>
                              {name}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* 모달 */}
        <AutoBreakRuleModal isOpen={showRuleModal} onClose={() => setShowRuleModal(false)} />
        <TimeWheelPickerModal
          isOpen={showTimePicker}
          onClose={() => setShowTimePicker(false)}
          value={inputBreakStartRef}
          onConfirm={(time) => {
            setInputBreakStartRef(time);
            setShowTimePicker(false);
          }}
          title="휴게 시작 시간을 알려주세요"
          minTime="10:30"
          maxTime="21:30"
        />
      </main>
    </div>
  );
}

const navArrowStyle: React.CSSProperties = {
  width: 26,
  height: 26,
  borderRadius: 6,
  background: '#FFFFFF',
  border: 'none',
  color: 'var(--color-neutral-dark)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

const stepperBtnStyle: React.CSSProperties = {
  width: 22,
  height: 22,
  borderRadius: 4,
  background: '#FFFFFF',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--color-neutral-dark)',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

