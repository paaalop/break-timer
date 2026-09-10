'use client';

import { useState } from 'react';
import type { WorkSchedule } from '@/types';
import { useScheduleStore } from '@/store/useScheduleStore';

interface ManualBreakModalProps {
  schedule: WorkSchedule;
  onClose: () => void;
}

export default function ManualBreakModal({ schedule, onClose }: ManualBreakModalProps) {
  const { setManualBreak, error } = useScheduleStore();
  const [start, setStart] = useState(schedule.break_start_time ?? '13:30');
  const [end, setEnd] = useState(schedule.break_end_time ?? '14:30');
  const [isSaving, setIsSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSave = async () => {
    setLocalError(null);
    if (!start || !end) {
      setLocalError('시작 시간과 종료 시간을 입력하세요.');
      return;
    }
    if (start >= end) {
      setLocalError('종료 시간은 시작 시간보다 늦어야 합니다.');
      return;
    }

    setIsSaving(true);
    try {
      await setManualBreak(schedule.id, start, end);
      onClose();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setIsSaving(false);
    }
  };

  const displayError = localError ?? error;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: 6,
          padding: 28,
          maxWidth: 340,
          width: '90%',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            borderBottom: '1px solid var(--color-border)',
            paddingBottom: 12,
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700 }}>휴게 시간 수동 수정</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}
          >
            ×
          </button>
        </div>

        <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
          {schedule.employee?.name} — {schedule.work_date}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
          <div>
            <label
              htmlFor="manual-break-start"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 4 }}
            >
              휴게 시작
            </label>
            <input
              id="manual-break-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label
              htmlFor="manual-break-end"
              style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-primary)', marginBottom: 4 }}
            >
              휴게 종료
            </label>
            <input
              id="manual-break-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>

        {displayError && (
          <div
            style={{
              border: '1px solid #C0392B',
              background: '#FDF2F1',
              padding: '8px 12px',
              borderRadius: 4,
              fontSize: 13,
              color: '#C0392B',
              marginBottom: 16,
            }}
          >
            {displayError}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={handleSave}
            disabled={isSaving}
            style={{
              flex: 1,
              padding: '9px 0',
              fontSize: 14,
              fontWeight: 600,
              background: 'var(--color-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 4,
              cursor: isSaving ? 'not-allowed' : 'pointer',
              opacity: isSaving ? 0.7 : 1,
            }}
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '9px 16px',
              fontSize: 14,
              border: '1px solid var(--color-border)',
              background: 'var(--color-surface)',
              color: 'var(--color-neutral-dark)',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: 14,
  border: '1px solid var(--color-border)',
  borderRadius: 4,
  background: 'var(--color-surface)',
  color: 'var(--color-neutral-dark)',
  outline: 'none',
  boxSizing: 'border-box',
};
