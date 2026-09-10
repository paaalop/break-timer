'use client';

import { useState, useEffect } from 'react';
import type { WorkSchedule, ShiftType } from '@/types';
import { SHIFT_DEFAULTS, SHIFT_LABELS, SHIFT_OPTIONS } from '@/lib/constants';
import { useScheduleStore } from '@/store/useScheduleStore';

const SHIFT_TYPES = SHIFT_OPTIONS.map((opt) => opt.value);

// 10:30 ~ 21:30 사이 30분 단위 시간 목록
const PART_TIME_OPTIONS: string[] = [];
for (let h = 10; h <= 21; h++) {
  const hStr = String(h).padStart(2, '0');
  if (h === 10) {
    PART_TIME_OPTIONS.push('10:30');
  } else if (h === 21) {
    PART_TIME_OPTIONS.push('21:00');
    PART_TIME_OPTIONS.push('21:30');
  } else {
    PART_TIME_OPTIONS.push(`${hStr}:00`);
    PART_TIME_OPTIONS.push(`${hStr}:30`);
  }
}

function formatToHHMM(timeStr?: string | null): string {
  if (!timeStr) return '10:30';
  return timeStr.slice(0, 5);
}

interface EmployeeRowProps {
  schedule: WorkSchedule;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onBreakClick?: (schedule: WorkSchedule) => void;
}

export default function EmployeeRow({
  schedule,
  isSelected,
  onToggleSelect,
}: EmployeeRowProps) {
  const { upsertSchedule } = useScheduleStore();
  const [shiftType, setShiftType] = useState<ShiftType>(schedule.shift_type);
  const [startTime, setStartTime] = useState(schedule.start_time);
  const [endTime, setEndTime] = useState(schedule.end_time);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setShiftType(schedule.shift_type);
    setStartTime(schedule.start_time);
    setEndTime(schedule.end_time);
  }, [schedule.shift_type, schedule.start_time, schedule.end_time]);

  const isPartTime = shiftType === 'part';

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

  return (
    <tr
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
        style={{
          ...tdStyle,
          fontWeight: 600,
          color: 'var(--color-neutral-dark)',
          width: '22%',
        }}
      >
        {schedule.employee?.name ?? '알 수 없음'}
      </td>

      {/* 근무 타입 드롭다운 (별도 박스 없이, 중앙 정렬) */}
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
              {SHIFT_LABELS[s]}
            </option>
          ))}
        </select>
      </td>

      {/* 근무 시간 (중앙 정렬, 마지막 칼럼이므로 borderRight 없음) */}
      <td style={{ ...tdStyle, width: '54%', borderRight: 'none' }}>
        {isPartTime ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {/* 파트타임 시작 시간 (10:30 ~ 21:30 30분 단위) */}
            <select
              value={formatToHHMM(startTime)}
              onChange={(e) => handleStartTimeChange(e.target.value)}
              disabled={isSaving}
              style={timeSelectStyle}
            >
              {PART_TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <span style={{ fontSize: 10, color: '#aaa', margin: '0 1px' }}>~</span>
            {/* 파트타임 종료 시간 (10:30 ~ 21:30 30분 단위) */}
            <select
              value={formatToHHMM(endTime)}
              onChange={(e) => handleEndTimeChange(e.target.value)}
              disabled={isSaving}
              style={timeSelectStyle}
            >
              {PART_TIME_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <span style={{ fontSize: 11, color: '#777', whiteSpace: 'nowrap' }}>
            {formatToHHMM(startTime)}~{formatToHHMM(endTime)}
          </span>
        )}
      </td>
    </tr>
  );
}

const tdStyle: React.CSSProperties = {
  padding: '6px 2px',
  fontSize: 12,
  textAlign: 'center',
  borderBottom: '1px solid var(--color-border)',
  borderRight: '1px solid var(--color-border)',
  verticalAlign: 'middle',
};

const timeSelectStyle: React.CSSProperties = {
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: 11,
  fontFamily: 'inherit',
  color: 'var(--color-neutral-dark)',
  cursor: 'pointer',
  padding: '1px 2px',
  width: 68,
  minWidth: 68,
  boxSizing: 'border-box',
};
