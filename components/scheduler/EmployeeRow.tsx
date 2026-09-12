'use client';

import { useState, useEffect } from 'react';
import type { WorkSchedule, ShiftType } from '@/types';
import { SHIFT_DEFAULTS, SHIFT_LABELS, SHIFT_OPTIONS } from '@/lib/constants';
import { useScheduleStore } from '@/store/useScheduleStore';
import BottomSheet from '@/components/ui/BottomSheet';
import TimeWheelPickerModal from '@/components/ui/TimeWheelPickerModal';

const SHIFT_TYPES = SHIFT_OPTIONS.map((opt) => opt.value);

function formatToHHMM(timeStr?: string | null): string {
  if (!timeStr) return '10:30';
  return timeStr.slice(0, 5);
}

// ─── 근무 타입별 색상 ────────────────────────────────────────────────────────
const SHIFT_TEXT_COLOR: Record<ShiftType, string> = {
  open: '#D97706',
  close: '#2563EB',
  oma: '#DC2626',
  part: '#78716C',
};

// ─── 근무 타입 바텀시트 ──────────────────────────────────────────────────────
interface ShiftBottomSheetProps {
  schedule: WorkSchedule;
  onClose: () => void;
}

function ShiftBottomSheet({ schedule, onClose }: ShiftBottomSheetProps) {
  const { upsertSchedule } = useScheduleStore();
  const [shiftType, setShiftType] = useState<ShiftType>(schedule.shift_type);
  const [startTime, setStartTime] = useState(formatToHHMM(schedule.start_time));
  const [endTime, setEndTime] = useState(formatToHHMM(schedule.end_time));
  const [isSaving, setIsSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);

  // ── 근무 타입 변경 ─────────────────────────────────────────────────────────
  const handleShiftSelect = (newShift: ShiftType) => {
    setShiftType(newShift);
    const defaults = SHIFT_DEFAULTS[newShift];
    setStartTime(defaults.start);
    setEndTime(defaults.end);
  };

  // ── 저장 ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertSchedule({
        id: schedule.id,
        employee_id: schedule.employee_id,
        work_date: schedule.work_date,
        shift_type: shiftType,
        start_time: startTime,
        end_time: endTime,
        break_start_time: schedule.break_start_time,
        break_end_time: schedule.break_end_time,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const isPartTime = shiftType === 'part';

  return (
    <>
      <BottomSheet
        onClose={onClose}
        maxHeight="80vh"
        padding="10px 20px 40px"
        gap={20}
        swipeThreshold={130}
        historyKey="shiftSheet"
      >
        {/* 헤더: 직원 이름 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 4 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, letterSpacing: '-0.02em' }}>
            {schedule.employee?.name ?? ''}
            <span style={{ fontSize: 13, fontWeight: 500, color: '#999', marginLeft: 8 }}>근무 수정</span>
          </h2>
        </div>

        {/* 근무 타입 선택 */}
        <div>
          <p style={labelStyle}>근무 타입</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              width: '100%',
              borderRadius: 8,
              border: '1px solid #D5D1C9',
              overflow: 'hidden',
              boxSizing: 'border-box',
            }}
          >
            {SHIFT_TYPES.map((s, idx) => {
              const active = shiftType === s;
              const isNextActive = idx < SHIFT_TYPES.length - 1 && shiftType === SHIFT_TYPES[idx + 1];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleShiftSelect(s as ShiftType)}
                  style={{
                    position: 'relative',
                    border: 'none',
                    borderRight: idx < SHIFT_TYPES.length - 1
                      ? (active || isNextActive ? 'none' : '1px solid #D5D1C9')
                      : 'none',
                    borderRadius:
                      idx === 0 ? '7px 0 0 7px'
                        : idx === SHIFT_TYPES.length - 1 ? '0 7px 7px 0'
                          : 0,
                    boxShadow: active ? 'inset 0 0 0 2px var(--color-primary)' : 'none',
                    padding: '13px 0',
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    background: 'transparent',
                    color: active ? 'var(--color-primary)' : '#777777',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {SHIFT_LABELS[s as ShiftType]}
                </button>
              );
            })}
          </div>
        </div>

        {/* 파트타임 시간 선택 */}
        {isPartTime && (
          <div>
            <p style={labelStyle}>근무 시간</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
              {/* 시작 시간 버튼 */}
              <div style={{ position: 'relative', flex: 1 }}>
                <button
                  type="button"
                  onClick={() => setPickerTarget('start')}
                  style={sheetUnderlineButtonStyle}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)' }}>
                    {startTime}
                  </span>
                  <div
                    style={{
                      color: '#8C857B',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              </div>

              <span style={{ color: '#888', fontSize: 14, flexShrink: 0 }}>~</span>

              {/* 종료 시간 버튼 */}
              <div style={{ position: 'relative', flex: 1 }}>
                <button
                  type="button"
                  onClick={() => setPickerTarget('end')}
                  style={sheetUnderlineButtonStyle}
                >
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)' }}>
                    {endTime}
                  </span>
                  <div
                    style={{
                      color: '#8C857B',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                      <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          style={{
            width: '100%',
            padding: '14px 0',
            fontSize: 14,
            fontWeight: 700,
            border: 'none',
            borderRadius: 8,
            background: 'var(--color-primary)',
            color: '#FFFFFF',
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            marginTop: 4,
            transition: 'opacity 0.15s',
            letterSpacing: '-0.02em',
          }}
        >
          {isSaving ? '저장 중...' : '변경사항 저장'}
        </button>
      </BottomSheet>

      {/* 30분 단위 다이얼 휠 타임 피커 */}
      <TimeWheelPickerModal
        isOpen={pickerTarget !== null}
        value={pickerTarget === 'start' ? startTime : endTime}
        title={pickerTarget === 'start' ? '근무 시작 시간을 알려주세요' : '근무 종료 시간을 알려주세요'}
        minTime="10:30"
        maxTime="21:30"
        zIndex={400}
        onClose={() => setPickerTarget(null)}
        onConfirm={(newTime) => {
          if (pickerTarget === 'start') {
            setStartTime(newTime);
          } else if (pickerTarget === 'end') {
            setEndTime(newTime);
          }
          setPickerTarget(null);
        }}
      />
    </>
  );
}

// ─── EmployeeRow 인터페이스 ──────────────────────────────────────────────────
interface EmployeeRowProps {
  schedule: WorkSchedule;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onBreakClick?: (schedule: WorkSchedule) => void;
  /** 모바일 카드 리스트에서 마지막 아이템 여부 (하단 divider 제거) */
  isLast?: boolean;
  /** 렌더링 모드: HTML 명세(DOM nesting) 준수를 위해 카드형(div)과 테이블형(tr) 분리 */
  variant?: 'mobile' | 'desktop';
}

export default function EmployeeRow({
  schedule,
  isSelected,
  onToggleSelect,
  isLast = false,
  variant,
}: EmployeeRowProps) {
  const { upsertSchedule } = useScheduleStore();
  const [shiftType, setShiftType] = useState<ShiftType>(schedule.shift_type);
  const [startTime, setStartTime] = useState(schedule.start_time);
  const [endTime, setEndTime] = useState(schedule.end_time);
  const [isSaving, setIsSaving] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [desktopPickerTarget, setDesktopPickerTarget] = useState<'start' | 'end' | null>(null);

  useEffect(() => {
    setShiftType(schedule.shift_type);
    setStartTime(schedule.start_time);
    setEndTime(schedule.end_time);
  }, [schedule.shift_type, schedule.start_time, schedule.end_time]);

  // 데스크톱 전용 핸들러 ─────────────────────────────────────────────────────
  const handleShiftChange = async (newShift: ShiftType) => {
    setShiftType(newShift);
    const defaults = SHIFT_DEFAULTS[newShift];
    const newStart = defaults.start;
    const newEnd = defaults.end;
    setStartTime(newStart);
    setEndTime(newEnd);
    setIsSaving(true);
    try {
      await upsertSchedule({
        id: schedule.id,
        employee_id: schedule.employee_id,
        work_date: schedule.work_date,
        shift_type: newShift,
        start_time: newStart,
        end_time: newEnd,
        break_start_time: schedule.break_start_time,
        break_end_time: schedule.break_end_time,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartTimeChange = async (newStart: string) => {
    setStartTime(newStart);
    setIsSaving(true);
    try {
      await upsertSchedule({
        id: schedule.id,
        employee_id: schedule.employee_id,
        work_date: schedule.work_date,
        shift_type: shiftType,
        start_time: newStart,
        end_time: endTime,
        break_start_time: schedule.break_start_time,
        break_end_time: schedule.break_end_time,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEndTimeChange = async (newEnd: string) => {
    setEndTime(newEnd);
    setIsSaving(true);
    try {
      await upsertSchedule({
        id: schedule.id,
        employee_id: schedule.employee_id,
        work_date: schedule.work_date,
        shift_type: shiftType,
        start_time: startTime,
        end_time: newEnd,
        break_start_time: schedule.break_start_time,
        break_end_time: schedule.break_end_time,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isPartTime = shiftType === 'part';

  return (
    <>
      {/* ── 모바일: 카드 행 (md 미만) ─────────────────────────────────── */}
      {(!variant || variant === 'mobile') && (
        <div
          className={variant === 'mobile' ? 'flex items-center' : 'flex md:hidden items-center'}
          onClick={() => setShowSheet(true)}
          style={{
            position: 'relative',
            padding: '14px 16px',
            gap: 12,
            background: isSelected ? '#FAF7F2' : 'var(--color-surface)',
            cursor: 'pointer',
            transition: 'background 0.12s ease',
            boxSizing: 'border-box',
          }}
        >
          {/* 체크박스 */}
          <div
            onClick={(e) => { e.stopPropagation(); onToggleSelect(schedule.id); }}
            style={{ flexShrink: 0, padding: 4, cursor: 'pointer' }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: 5,
                border: isSelected ? '2px solid var(--color-primary)' : '1.5px solid #C8C4BE',
                background: isSelected ? 'var(--color-primary)' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {isSelected && (
                <svg width="11" height="8" viewBox="0 0 11 8" fill="none">
                  <path d="M1 4L4 7L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>

          {/* 이름 + 근무타입 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}>
              <span
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: 'var(--color-neutral-dark)',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {schedule.employee?.name ?? '알 수 없음'}
              </span>
              <span style={{ color: '#C8C4BE', fontSize: 12 }}>·</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: SHIFT_TEXT_COLOR[shiftType] ?? '#666',
                  letterSpacing: '-0.02em',
                  whiteSpace: 'nowrap',
                }}
              >
                {SHIFT_LABELS[shiftType]}
              </span>
            </div>
          </div>

          {/* 근무 시간 */}
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              color: '#888',
              whiteSpace: 'nowrap',
              letterSpacing: '-0.01em',
              flexShrink: 0,
            }}
          >
            {formatToHHMM(startTime)}~{formatToHHMM(endTime)}
          </span>

          {/* 우측 화살표 */}
          <span style={{ color: '#C8C4BE', fontSize: 16, flexShrink: 0 }}>›</span>

          {/* 인셋 가로 구분선 (마지막 항목 제외) */}
          {!isLast && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                right: 16,
                height: 1,
                background: 'var(--color-border)',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      )}

      {/* ── 데스크톱: 테이블 행 (md 이상) ────────────────────────────── */}
      {(!variant || variant === 'desktop') && (
        <>
          <tr
            className={variant === 'desktop' ? undefined : 'hidden md:table-row'}
            style={{
              background: isSelected ? '#FAF7F2' : 'transparent',
              transition: 'background 0.15s ease',
            }}
          >
            {/* 선택 체크박스 */}
            <td style={{ ...tdStyle, width: 28, padding: '4px 2px' }}>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onToggleSelect(schedule.id)}
                style={{ cursor: 'pointer', margin: 0 }}
                aria-label={`${schedule.employee?.name ?? ''} 선택`}
              />
            </td>

            {/* 직원 이름 */}
            <td
              onClick={() => setShowSheet(true)}
              style={{
                ...tdStyle,
                fontWeight: 600,
                color: 'var(--color-neutral-dark)',
                width: '22%',
                cursor: 'pointer',
              }}
              title="클릭하여 근무 수정"
            >
              {schedule.employee?.name ?? '알 수 없음'}
            </td>

            {/* 근무 타입 드롭다운 */}
            <td style={{ ...tdStyle, width: '24%' }}>
              <select
                value={shiftType}
                onChange={(e) => handleShiftChange(e.target.value as ShiftType)}
                disabled={isSaving}
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 12,
                  color: 'var(--color-neutral-dark)',
                  textAlign: 'center',
                  textAlignLast: 'center',
                  cursor: 'pointer',
                  padding: '3px 0',
                }}
              >
                {SHIFT_TYPES.map((s) => (
                  <option key={s} value={s}>
                    {SHIFT_LABELS[s as ShiftType]}
                  </option>
                ))}
              </select>
            </td>

            {/* 근무 시간 */}
            <td style={{ ...tdStyle, width: '54%', borderRight: 'none' }}>
              {isPartTime ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
                  <button
                    type="button"
                    onClick={() => setDesktopPickerTarget('start')}
                    disabled={isSaving}
                    style={timeButtonStyle}
                  >
                    {formatToHHMM(startTime)}
                  </button>
                  <span style={{ fontSize: 10, color: '#aaa', margin: '0 1px' }}>~</span>
                  <button
                    type="button"
                    onClick={() => setDesktopPickerTarget('end')}
                    disabled={isSaving}
                    style={timeButtonStyle}
                  >
                    {formatToHHMM(endTime)}
                  </button>
                </div>
              ) : (
                <span style={{ fontSize: 11, color: '#777', whiteSpace: 'nowrap' }}>
                  {formatToHHMM(startTime)}~{formatToHHMM(endTime)}
                </span>
              )}
            </td>
          </tr>
          {!isLast && (
            <tr className={variant === 'desktop' ? undefined : 'hidden md:table-row'}>
              <td
                colSpan={4}
                style={{
                  padding: 0,
                  height: 1,
                  lineHeight: 0,
                  fontSize: 0,
                  border: 'none',
                  background: 'transparent',
                }}
              >
                <div style={{ margin: '0 10px', height: 1, background: 'var(--color-border)' }} />
              </td>
            </tr>
          )}
        </>
      )}

      {/* 근무 수정 바텀시트 (모바일) */}
      {showSheet && (
        <ShiftBottomSheet
          schedule={{ ...schedule, shift_type: shiftType, start_time: startTime, end_time: endTime }}
          onClose={() => setShowSheet(false)}
        />
      )}

      {/* 데스크톱 타임 피커 모달 */}
      <TimeWheelPickerModal
        isOpen={desktopPickerTarget !== null}
        value={desktopPickerTarget === 'start' ? formatToHHMM(startTime) : formatToHHMM(endTime)}
        title={desktopPickerTarget === 'start' ? '근무 시작 시간을 알려주세요' : '근무 종료 시간을 알려주세요'}
        minTime="10:30"
        maxTime="21:30"
        zIndex={400}
        onClose={() => setDesktopPickerTarget(null)}
        onConfirm={(val) => {
          if (desktopPickerTarget === 'start') {
            handleStartTimeChange(val);
          } else if (desktopPickerTarget === 'end') {
            handleEndTimeChange(val);
          }
          setDesktopPickerTarget(null);
        }}
      />
    </>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '6px 2px',
  fontSize: 12,
  textAlign: 'center',
  borderBottom: 'none',
  borderRight: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};

const timeButtonStyle: React.CSSProperties = {
  border: '1px solid #E5E0D8',
  borderRadius: 4,
  outline: 'none',
  background: '#FAF7F2',
  fontSize: 11,
  fontFamily: 'inherit',
  fontWeight: 600,
  color: 'var(--color-neutral-dark)',
  cursor: 'pointer',
  padding: '2px 4px',
  boxSizing: 'border-box',
  transition: 'all 0.15s ease',
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#8C857B',
  marginBottom: 8,
  letterSpacing: '-0.02em',
};

const sheetUnderlineButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px 10px 8px',
  fontSize: 15,
  fontWeight: 600,
  border: 'none',
  borderBottom: '1px solid #D5D1C9',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--color-neutral-dark)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  outline: 'none',
  boxSizing: 'border-box',
  letterSpacing: '-0.01em',
};
