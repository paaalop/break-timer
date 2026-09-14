'use client';

import { useState, useEffect, useRef } from 'react';
import type { WorkSchedule, ShiftType } from '@/types';
import { SHIFT_DEFAULTS, SHIFT_LABELS, SHIFT_OPTIONS, ROLE_LABELS, SHIFT_TEXT_COLOR } from '@/lib/constants';
import { useScheduleStore } from '@/store/useScheduleStore';
import BottomSheet from '@/components/ui/BottomSheet';
import TimeWheelPickerModal from '@/components/ui/TimeWheelPickerModal';

const SHIFT_TYPES = SHIFT_OPTIONS.map((opt) => opt.value);

function formatToHHMM(timeStr?: string | null): string {
  if (!timeStr) return '10:30';
  return timeStr.slice(0, 5);
}

// ─── 아바타 ↔ 체크박스 3D 뒤집힘(Flip) 컴포넌트 ──────────────────────────────
interface FlipAvatarCheckboxProps {
  name: string;
  isSelected: boolean;
  isSelectionMode: boolean;
  onClick?: (e: React.MouseEvent | React.TouchEvent) => void;
}

function FlipAvatarCheckbox({
  name,
  isSelected,
  isSelectionMode,
  onClick,
}: FlipAvatarCheckboxProps) {
  const initials = name.length >= 2 ? name.slice(-2) : name;

  return (
    <div
      onClick={onClick}
      style={{
        perspective: 600,
        width: 32,
        height: 32,
        flexShrink: 0,
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          transformStyle: 'preserve-3d',
          transition: 'transform 0.35s cubic-bezier(0.34, 1.25, 0.64, 1)',
          transform: isSelectionMode ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* 앞면: 아바타 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            borderRadius: '50%',
            background: 'var(--color-muted-bg)',
            color: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            userSelect: 'none',
            boxShadow: 'inset 0 0 0 1px rgba(0, 0, 0, 0.04)',
          }}
        >
          {initials}
        </div>

        {/* 뒷면: 체크박스 */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            borderRadius: '50%',
            background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
            border: isSelected ? 'none' : '1.5px solid #C8C4BE',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.15s ease, border-color 0.15s ease',
            boxSizing: 'border-box',
            boxShadow: isSelected ? '0 1px 3px rgba(74, 59, 50, 0.25)' : 'none',
          }}
        >
          {isSelected && (
            <svg width="12" height="9" viewBox="0 0 12 9" fill="none">
              <path
                d="M1 4.2L4.2 7.5L10.5 1.2"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 근무 타입 바텀시트 ──────────────────────────────────────────────────────
interface ShiftBottomSheetProps {
  schedule: WorkSchedule;
  onClose: () => void;
}

function ShiftBottomSheet({ schedule, onClose }: ShiftBottomSheetProps) {
  const { upsertSchedule, deleteSchedule } = useScheduleStore();
  const [shiftType, setShiftType] = useState<ShiftType>(schedule.shift_type);
  const [startTime, setStartTime] = useState(formatToHHMM(schedule.start_time));
  const [endTime, setEndTime] = useState(formatToHHMM(schedule.end_time));
  const [isSaving, setIsSaving] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<'start' | 'end' | null>(null);
  const [showDeleteConfirmDialog, setShowDeleteConfirmDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteSchedule(schedule.id);
      onClose();
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmDialog(false);
    }
  };

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
        maxWidth={480}
        maxHeight="92vh"
        padding="10px 20px 36px"
        gap={20}
        swipeThreshold={130}
        historyKey="shiftSheet"
      >
        {/* 헤더: 제목 + (우상단 근무자 삭제) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 12,
            minHeight: 28,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-neutral-dark)', margin: 0, lineHeight: 1 }}>
            근무 수정
          </h2>
          <button
            type="button"
            onClick={() => setShowDeleteConfirmDialog(true)}
            disabled={isSaving || isDeleting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 0',
              color: '#C0392B',
              fontSize: 13,
              fontWeight: 600,
              opacity: isSaving || isDeleting ? 0.4 : 1,
              letterSpacing: '-0.02em',
            }}
          >
            근무자 삭제
          </button>
        </div>

        {/* 이름 입력 형태 (라벨 + 밑줄 형태) */}
        <div>
          <label style={labelStyle}>
            이름
          </label>
          <div
            style={{
              padding: '8px 0',
              fontSize: 20,
              fontWeight: 700,
              color: 'var(--color-neutral-dark)',
              borderBottom: '1.5px solid var(--color-border)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
            }}
          >
            {schedule.employee?.name ?? ''}
          </div>
        </div>

        {/* 근무 타입 (단일 선택: 세그먼트 컨트롤) */}
        <div>
          <label style={labelStyle}>
            근무 타입
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              width: '100%',
              padding: 3,
              borderRadius: 8,
              background: 'var(--color-muted-bg)',
              boxSizing: 'border-box',
              gap: 3,
            }}
          >
            {SHIFT_OPTIONS.map((opt) => {
              const active = shiftType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleShiftSelect(opt.value as ShiftType)}
                  style={{
                    border: 'none',
                    borderRadius: 6,
                    padding: '10px 0',
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    background: active ? '#FFFFFF' : 'transparent',
                    color: active ? 'var(--color-primary)' : '#777777',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    letterSpacing: '-0.02em',
                    boxShadow: active ? '0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 1px rgba(0, 0, 0, 0.04)' : 'none',
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 파트타임 시간 선택 */}
        {isPartTime && (
          <div>
            <label style={labelStyle}>근무 시간</label>
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
                      color: 'var(--color-text-muted)',
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
                      color: 'var(--color-text-muted)',
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
            marginTop: 6,
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

      {/* 근무자 삭제 확인 다이얼로그 */}
      {showDeleteConfirmDialog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 600,
          }}
          onClick={(e) => {
            e.stopPropagation();
            setShowDeleteConfirmDialog(false);
          }}
        >
          <div
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              padding: '20px 22px',
              maxWidth: 320,
              width: '88%',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: 'var(--color-neutral-dark)' }}>
              근무자를 삭제하시겠습니까?
            </h3>
            <p style={{ fontSize: 13, color: '#555', margin: '0 0 16px', lineHeight: 1.5 }}>
              해당 날짜의 근무 일정이 삭제됩니다.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirmDialog(false)}
                disabled={isDeleting}
                style={{
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--color-neutral-dark)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                style={{
                  padding: '7px 14px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#C0392B',
                  background: 'none',
                  border: 'none',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                }}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── EmployeeRow 인터페이스 ──────────────────────────────────────────────────
interface EmployeeRowProps {
  schedule: WorkSchedule;
  isSelected: boolean;
  isSelectionMode?: boolean;
  onToggleSelect: (id: string) => void;
  onLongPress?: (id: string) => void;
  onBreakClick?: (schedule: WorkSchedule) => void;
  /** 모바일 카드 리스트에서 마지막 아이템 여부 (하단 divider 제거) */
  isLast?: boolean;
  /** 렌더링 모드: HTML 명세(DOM nesting) 준수를 위해 카드형(div)과 테이블형(tr) 분리 */
  variant?: 'mobile' | 'desktop';
}

export default function EmployeeRow({
  schedule,
  isSelected,
  isSelectionMode = false,
  onToggleSelect,
  onLongPress,
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

  // ── 롱프레스 제스처 핸들링 ──────────────────────────────────────────────────
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const isLongPressRef = useRef(false);

  const startPress = (e: React.TouchEvent | React.MouseEvent) => {
    if (isSelectionMode) return;
    isLongPressRef.current = false;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startPosRef.current = { x: clientX, y: clientY };

    timerRef.current = setTimeout(() => {
      isLongPressRef.current = true;
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate(40); } catch (_) {}
      }
      onLongPress?.(schedule.id);
    }, 450);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!startPosRef.current || !timerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - startPosRef.current.x);
    const dy = Math.abs(touch.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelPress();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!startPosRef.current || !timerRef.current) return;
    const dx = Math.abs(e.clientX - startPosRef.current.x);
    const dy = Math.abs(e.clientY - startPosRef.current.y);
    if (dx > 10 || dy > 10) {
      cancelPress();
    }
  };

  const handleClick = () => {
    if (isLongPressRef.current) {
      isLongPressRef.current = false;
      return;
    }
    if (isSelectionMode) {
      onToggleSelect(schedule.id);
    } else {
      setShowSheet(true);
    }
  };

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
  const roles = schedule.employee?.available_roles ?? [];
  const sortedRoles = (['manager', 'cashier', 'pass'] as const).filter((r) => roles.includes(r));

  return (
    <>
      {/* ── 모바일: 카드 행 (md 미만) ─────────────────────────────────── */}
      {(!variant || variant === 'mobile') && (
        <div
          className={variant === 'mobile' ? 'flex items-center' : 'flex md:hidden items-center'}
          onClick={handleClick}
          onTouchStart={startPress}
          onTouchEnd={cancelPress}
          onTouchCancel={cancelPress}
          onTouchMove={handleTouchMove}
          onMouseDown={startPress}
          onMouseUp={cancelPress}
          onMouseLeave={cancelPress}
          onMouseMove={handleMouseMove}
          onContextMenu={(e) => {
            if (isLongPressRef.current) {
              e.preventDefault();
            }
          }}
          style={{
            position: 'relative',
            padding: '12px 16px',
            gap: 12,
            background: isSelected ? '#FAF7F2' : 'var(--color-surface)',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            boxSizing: 'border-box',
            userSelect: 'none',
            WebkitUserSelect: 'none',
            WebkitTouchCallout: 'none',
          }}
        >
          {/* 아바타 ↔ 체크박스 3D 뒤집힘 플립 컴포넌트 */}
          <FlipAvatarCheckbox
            name={schedule.employee?.name ?? ''}
            isSelected={isSelected}
            isSelectionMode={isSelectionMode}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect(schedule.id);
            }}
          />

          {/* 이름 + 직무 뱃지 (+ 미성년자) */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'nowrap', overflow: 'hidden' }}>
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

              {/* 직무 뱃지 */}
              {sortedRoles.length > 0 && (
                <span
                  style={{
                    padding: '1px 6px',
                    fontSize: 11,
                    fontWeight: 600,
                    borderRadius: 4,
                    background: 'var(--color-muted-bg)',
                    color: '#777777',
                    letterSpacing: '-0.02em',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: 1.4,
                    flexShrink: 0,
                  }}
                >
                  {sortedRoles.map((role) => ROLE_LABELS[role] ?? role).join(' · ')}
                </span>
              )}

              {/* 미성년자 뱃지 */}
              {schedule.employee?.is_minor && (
                <span
                  style={{
                    padding: '1px 5px',
                    fontSize: 10,
                    fontWeight: 700,
                    borderRadius: 4,
                    background: '#FEF3C7',
                    color: '#D97706',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.3,
                    flexShrink: 0,
                  }}
                >
                  미성년자
                </span>
              )}
            </div>
          </div>

          {/* 우측: 근무타입 칩 + 근무 시간 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {/* 근무타입 (뱃지 없이 글자 색상으로만 구분) */}
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: SHIFT_TEXT_COLOR[shiftType] ?? '#666',
                letterSpacing: '-0.02em',
                whiteSpace: 'nowrap',
              }}
            >
              {SHIFT_LABELS[shiftType]}
            </span>

            {/* 근무 시간 (정갈한 tabular-nums 정렬) */}
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 500,
                color: '#666666',
                whiteSpace: 'nowrap',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {formatToHHMM(startTime)}~{formatToHHMM(endTime)}
            </span>
          </div>

          {/* 우측 화살표 (선택 모드 아닐 때만 노출) */}
          <span
            style={{
              color: '#D0CCC6',
              fontSize: 16,
              flexShrink: 0,
              width: isSelectionMode ? 0 : 10,
              opacity: isSelectionMode ? 0 : 1,
              overflow: 'hidden',
              transition: 'all 0.15s ease',
              marginLeft: isSelectionMode ? 0 : 2,
            }}
          >
            ›
          </span>

          {/* A안: 눈에 거슬리지 않는 극도로 은은한 초미세 헤어라인 (마지막 항목 제외) */}
          {!isLast && (
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 16,
                right: 16,
                height: 1,
                background: 'rgba(0, 0, 0, 0.045)',
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

            {/* 직원 이름 (작은 아바타 포함) */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--color-muted-bg)',
                    color: 'var(--color-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    fontWeight: 700,
                    flexShrink: 0,
                    letterSpacing: '-0.02em',
                  }}
                >
                  {(schedule.employee?.name ?? '').slice(-2)}
                </div>
                <span>{schedule.employee?.name ?? '알 수 없음'}</span>
              </div>
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
  display: 'flex',
  alignItems: 'baseline',
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
  marginBottom: 8,
  letterSpacing: '-0.02em',
};

const sheetUnderlineButtonStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 8px 8px 0',
  fontSize: 16,
  fontWeight: 600,
  border: 'none',
  borderBottom: '1.5px solid var(--color-border)',
  borderRadius: 0,
  background: 'transparent',
  color: 'var(--color-neutral-dark)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  cursor: 'pointer',
  outline: 'none',
  boxSizing: 'border-box',
  letterSpacing: '-0.02em',
};
